/**
 * The project's own source files, parsed into the request-path model.
 *
 * Python files come from the Python laws' discovery (virtualenvs, caches and
 * build output excluded; `ignores.global` and `includes.global` honoured);
 * TS/JS files from the shared scanner (the law's ignores honoured). Test
 * files are left out of both: a test that reads in a loop to set up a
 * fixture is not a request path. Nor is a one-off script (scripts/,
 * migrations/, bin/, management commands …, see one-off-scripts.ts): those
 * are left out too, and counted, so a verdict says what it did not judge.
 *
 * Parsing TS/JS needs the `typescript` package; when it cannot be loaded the
 * files are reported as unread, never treated as clean.
 */

import type { LawCheckContext } from '../../types/law.types';
import { PythonLawBase } from '../../checkers/python-laws/python-law-base';
import { CheckerUtils } from '../checker-utils';
import type { ContainingFile } from '../law-requirements';
import { FileUtils } from '../file-utils';
import { PARTLY_READ_TEXT } from '../judged-nothing';
import { PathOperations } from '../path-operations';
import { loadTypeScript, parserUnavailable } from '../react/tsx-source';
import type { ModuleModel, SourceLanguage } from './model';
import { isOneOffScript } from './one-off-scripts';
import { pythonModule } from './python-model';
import { typescriptModule } from './ts-model';

const TS_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
];
const PY_TEST_FILE =
  /(?:^|\/)(?:tests?\/|test_[^/]*\.py$|[^/]*_test\.py$|conftest\.py$)/;
const TS_TEST_FILE =
  /\.(?:spec|test|e2e)\.[cm]?[jt]sx?$|(?:^|\/)(?:__tests__|__mocks__)\//;
const DECLARATION_FILE = /\.d\.[cm]?ts$/;

export interface ProjectSources {
  modules: ModuleModel[];
  /** Why some files were not read (parser unavailable). Each entry is a finding: unread is not clean. */
  unread: string[];
  /** Files read, per language. */
  counts: Record<SourceLanguage, number>;
  /** Source files left out as one-off scripts (#384). */
  oneOffScripts: number;
}

const cache = new Map<string, { content: string; model: ModuleModel }>();

/** "the .ts/.tsx file(s)": the extensions of `files`, so a note names what was not read. */
function extensionsNamed(files: readonly string[]): string {
  const extensions = new Set(
    files.map(file => PathOperations.getExtension(file) || '(none)')
  );
  return `the ${[...extensions].sort().join('/')} file(s)`;
}

function relativeOf(projectRoot: string, file: string): string {
  return PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
}

function parsed(
  file: string,
  content: string,
  build: () => ModuleModel
): ModuleModel {
  const hit = cache.get(file);
  if (hit && hit.content === content) return hit.model;
  const model = build();
  cache.set(file, { content, model });
  return model;
}

/** Split `files` into request-path candidates and one-off scripts. */
function withoutOneOffScripts(
  projectRoot: string,
  files: string[]
): { files: string[]; oneOffScripts: number } {
  const kept = files.filter(
    file => !isOneOffScript(relativeOf(projectRoot, file))
  );
  return { files: kept, oneOffScripts: files.length - kept.length };
}

function pythonSourceFiles(context: LawCheckContext): {
  files: string[];
  oneOffScripts: number;
} {
  const files = PythonLawBase.getPythonFiles(
    context.projectRoot,
    context.config
  ).filter(file => !PY_TEST_FILE.test(relativeOf(context.projectRoot, file)));
  return withoutOneOffScripts(context.projectRoot, files);
}

function typescriptSourceFiles(context: LawCheckContext): {
  files: string[];
  oneOffScripts: number;
} {
  const files = CheckerUtils.findFilesByExtension(
    context.projectRoot,
    TS_EXTENSIONS,
    context.config,
    context.lawId
  ).filter(file => {
    const rel = relativeOf(context.projectRoot, file);
    return !TS_TEST_FILE.test(rel) && !DECLARATION_FILE.test(rel);
  });
  return withoutOneOffScripts(context.projectRoot, files);
}

function readPython(context: LawCheckContext, into: ProjectSources): void {
  const { files, oneOffScripts } = pythonSourceFiles(context);
  into.oneOffScripts += oneOffScripts;
  for (const file of files) {
    const content = FileUtils.readFileContentSync(file);
    if (content === null || content === undefined) continue;
    into.modules.push(
      parsed(file, content, () =>
        pythonModule(file, relativeOf(context.projectRoot, file), content)
      )
    );
    into.counts.python++;
  }
}

function readTypeScript(context: LawCheckContext, into: ProjectSources): void {
  const { projectRoot } = context;
  const { files, oneOffScripts } = typescriptSourceFiles(context);
  into.oneOffScripts += oneOffScripts;
  if (files.length === 0) return;
  const ts = loadTypeScript(projectRoot);
  if (!ts) {
    into.unread.push(
      `${files.length} TS/JS file(s): ${parserUnavailable(projectRoot, extensionsNamed(files))}`
    );
    return;
  }
  for (const file of files) {
    const content = FileUtils.readFileContentSync(file);
    if (content === null || content === undefined) continue;
    into.modules.push(
      parsed(file, content, () =>
        typescriptModule(ts, file, relativeOf(projectRoot, file), content)
      )
    );
    into.counts.typescript++;
  }
}

/** Parse the project's Python and TS/JS sources (each language only when asked for). */
export function projectSources(
  context: LawCheckContext,
  languages: readonly SourceLanguage[] = ['python', 'typescript']
): ProjectSources {
  const sources: ProjectSources = {
    modules: [],
    unread: [],
    counts: { python: 0, typescript: 0 },
    oneOffScripts: 0,
  };
  if (languages.includes('python')) readPython(context, sources);
  if (languages.includes('typescript')) readTypeScript(context, sources);
  return sources;
}

const PYTHON_FILE = /\.py$/;

/**
 * The request-path model of exactly these files — the ones a law's
 * `requires.anyFileContaining` gate matched (see readFilesContaining), so
 * the files that select the law are the files it judges. One-off scripts are
 * left out by that gate's own `exclude` (ONE_OFF_SCRIPT_GLOBS), not here, so
 * the gate and the law cannot disagree.
 */
export function sourcesFromFiles(
  projectRoot: string,
  files: readonly ContainingFile[]
): ProjectSources {
  const sources: ProjectSources = {
    modules: [],
    unread: [],
    counts: { python: 0, typescript: 0 },
    oneOffScripts: 0,
  };
  const scripts = files.filter(found => !PYTHON_FILE.test(found.rel));
  for (const found of files.filter(candidate =>
    PYTHON_FILE.test(candidate.rel)
  )) {
    sources.modules.push(
      parsed(found.file, found.content, () =>
        pythonModule(found.file, found.rel, found.content)
      )
    );
    sources.counts.python++;
  }
  if (scripts.length === 0) return sources;
  const ts = loadTypeScript(projectRoot);
  if (!ts) {
    // The Python modules were read without it: then this note covers part.
    const partly = sources.counts.python > 0 ? `; ${PARTLY_READ_TEXT}` : '';
    sources.unread.push(
      `${scripts.length} TS/JS file(s): ${parserUnavailable(projectRoot, extensionsNamed(scripts.map(found => found.rel)))}${partly}`
    );
    return sources;
  }
  for (const found of scripts) {
    sources.modules.push(
      parsed(found.file, found.content, () =>
        typescriptModule(ts, found.file, found.rel, found.content)
      )
    );
    sources.counts.typescript++;
  }
  return sources;
}
