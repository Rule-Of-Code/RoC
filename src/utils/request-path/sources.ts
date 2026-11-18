/**
 * The project's own source files, parsed into the request-path model.
 *
 * Python files come from the Python laws' discovery (virtualenvs, caches and
 * build output excluded; `ignores.global` and `includes.global` honoured);
 * TS/JS files from the shared scanner (the law's ignores honoured). Test
 * files are left out of both: a test that reads in a loop to set up a
 * fixture is not a request path.
 *
 * Parsing TS/JS needs the `typescript` package; when it cannot be loaded the
 * files are reported as unread, never treated as clean.
 */

import type { LawCheckContext } from '../../types/law.types';
import { PythonLawBase } from '../../checkers/python-laws/python-law-base';
import { CheckerUtils } from '../checker-utils';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { loadTypeScript, parserUnavailable } from '../react/tsx-source';
import type { ModuleModel, SourceLanguage } from './model';
import { pythonModule } from './python-model';
import { typescriptModule } from './ts-model';

const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'];
const PY_TEST_FILE = /(?:^|\/)(?:tests?\/|test_[^/]*\.py$|[^/]*_test\.py$|conftest\.py$)/;
const TS_TEST_FILE = /\.(?:spec|test|e2e)\.[cm]?[jt]sx?$|(?:^|\/)(?:__tests__|__mocks__)\//;
const DECLARATION_FILE = /\.d\.[cm]?ts$/;

export interface ProjectSources {
  modules: ModuleModel[];
  /** Why some files were not read (parser unavailable). Each entry is a finding: unread is not clean. */
  unread: string[];
  /** Files read, per language. */
  counts: Record<SourceLanguage, number>;
}

const cache = new Map<string, { content: string; model: ModuleModel }>();

function relativeOf(projectRoot: string, file: string): string {
  return PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
}

function parsed(file: string, content: string, build: () => ModuleModel): ModuleModel {
  const hit = cache.get(file);
  if (hit && hit.content === content) return hit.model;
  const model = build();
  cache.set(file, { content, model });
  return model;
}

export function pythonSourceFiles(context: LawCheckContext): string[] {
  return PythonLawBase.getPythonFiles(context.projectRoot, context.config).filter(
    file => !PY_TEST_FILE.test(relativeOf(context.projectRoot, file))
  );
}

export function typescriptSourceFiles(context: LawCheckContext): string[] {
  return CheckerUtils.findFilesByExtension(context.projectRoot, TS_EXTENSIONS, context.config, context.lawId).filter(file => {
    const rel = relativeOf(context.projectRoot, file);
    return !TS_TEST_FILE.test(rel) && !DECLARATION_FILE.test(rel);
  });
}

function readPython(context: LawCheckContext, into: ProjectSources): void {
  for (const file of pythonSourceFiles(context)) {
    const content = FileUtils.readFileContentSync(file);
    if (content === null || content === undefined) continue;
    into.modules.push(parsed(file, content, () => pythonModule(file, relativeOf(context.projectRoot, file), content)));
    into.counts.python++;
  }
}

function readTypeScript(context: LawCheckContext, into: ProjectSources): void {
  const { projectRoot } = context;
  const files = typescriptSourceFiles(context);
  if (files.length === 0) return;
  const ts = loadTypeScript(projectRoot);
  if (!ts) {
    into.unread.push(`${files.length} TS/JS file(s): ${parserUnavailable(projectRoot)}`);
    return;
  }
  for (const file of files) {
    const content = FileUtils.readFileContentSync(file);
    if (content === null || content === undefined) continue;
    into.modules.push(parsed(file, content, () => typescriptModule(ts, file, relativeOf(projectRoot, file), content)));
    into.counts.typescript++;
  }
}

/** Parse the project's Python and TS/JS sources (each language only when asked for). */
export function projectSources(
  context: LawCheckContext,
  languages: readonly SourceLanguage[] = ['python', 'typescript']
): ProjectSources {
  const sources: ProjectSources = { modules: [], unread: [], counts: { python: 0, typescript: 0 } };
  if (languages.includes('python')) readPython(context, sources);
  if (languages.includes('typescript')) readTypeScript(context, sources);
  return sources;
}
