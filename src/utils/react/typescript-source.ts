/**
 * Which TypeScript the laws parse with, for one project (#667): the
 * project's own `typescript` when it offers the compiler API, else the one
 * RoC depends on (`typescript` ^5.9.3, a runtime dependency); and whether a
 * law asked for it during its run. Re-exported by tsx-source, where the laws import it from.
 */

import { AsyncLocalStorage } from 'async_hooks';
import type * as TS from 'typescript';

export type TypeScriptModule = typeof TS;

/** Where the parser the laws use came from, for one project (#667). */
export interface TypeScriptSource {
  ts: TypeScriptModule | null;
  /** The project's own `typescript` package, when it has one. */
  projectVersion: string | null;
  /** The version of the module in `ts`. */
  usedVersion: string | null;
  /** The project's own package, or the one RoC resolves itself. */
  from: 'project' | 'roc' | null;
}

const sources = new Map<string, TypeScriptSource>();

/**
 * The API the laws call. A `typescript` package without it cannot parse for
 * them: TypeScript 7.0's package exports only its version (the API moved to
 * `typescript/unstable/*`), so `ts.ScriptTarget.Latest` and `ts.sys.readFile`
 * crashed 29 laws with "Check failed" (#667). Checked by what the package
 * offers, never by its version number.
 */
export function hasCompilerApi(
  candidate: unknown
): candidate is TypeScriptModule {
  const ts = candidate as Partial<TypeScriptModule> | null | undefined;
  return (
    !!ts &&
    typeof ts.createSourceFile === 'function' &&
    typeof ts.forEachChild === 'function' &&
    typeof ts.ScriptTarget === 'object' &&
    typeof ts.ScriptKind === 'object' &&
    typeof ts.sys?.readFile === 'function'
  );
}

function requireFrom(paths: string[], id: string): unknown {
  try {
    return require(require.resolve(id, { paths })) as unknown;
  } catch {
    return null;
  }
}

function versionFrom(paths: string[], id: string): string | null {
  const manifest = requireFrom(paths, `${id}/package.json`) as {
    version?: unknown;
  } | null;
  return typeof manifest?.version === 'string' ? manifest.version : null;
}

/**
 * RoC's own parser: its runtime dependency `typescript`, resolved from RoC's
 * install. Under the package's own name, npm never lets it shadow the
 * project's `typescript`: where the project has one of another version,
 * RoC's copy is installed nested under RoC, without a `tsc` in the project's
 * `.bin`. An npm alias under another name was hoisted and took the
 * project's `tsc` (#667).
 */
const OWN_TYPESCRIPT = ['typescript'];

/**
 * The parser for a project: its own `typescript` when that package has the
 * compiler API — the version the project builds with — or else the one RoC
 * resolves from its own install, checked the same way. Memoised per root.
 */
export function typeScriptSource(projectRoot: string): TypeScriptSource {
  const known = sources.get(projectRoot);
  if (known) return known;
  const projectVersion = versionFrom([projectRoot], 'typescript');
  const own = requireFrom([projectRoot], 'typescript');
  let source: TypeScriptSource = {
    ts: null,
    projectVersion,
    usedVersion: null,
    from: null,
  };
  if (hasCompilerApi(own)) {
    source = {
      ts: own,
      projectVersion,
      usedVersion: own.version,
      from: 'project',
    };
  } else {
    for (const id of OWN_TYPESCRIPT) {
      const roc = requireFrom([__dirname], id);
      if (hasCompilerApi(roc)) {
        source = {
          ts: roc,
          projectVersion,
          usedVersion: roc.version,
          from: 'roc',
        };
        break;
      }
    }
  }
  sources.set(projectRoot, source);
  return source;
}

/**
 * The `typescript` module the audited project compiles with, or — when the
 * project has none with the compiler API — the one RoC resolves itself. Null
 * when neither has it.
 */
export function loadTypeScript(projectRoot: string): TypeScriptModule | null {
  const scope = parserUse.getStore();
  if (scope) scope.used = true;
  return typeScriptSource(projectRoot).ts;
}

/** Whether a law asked for the parser during its run (AsyncLocalStorage: per law, also in parallel). */
const parserUse = new AsyncLocalStorage<{ used: boolean }>();

/** Run one law's check and say whether it asked for the parser (#667). */
export async function runWithParserUse<T>(
  check: () => T | Promise<T>
): Promise<{ value: T; usedParser: boolean }> {
  const scope = { used: false };
  const value = await parserUse.run(scope, async () => await check());
  return { value, usedParser: scope.used };
}

/**
 * What a run says when the project's own `typescript` has no compiler API
 * (#667): which TypeScript parsed instead, or that none could. Null when the
 * project's package parsed, or there is none to speak of.
 */
export function typeScriptSourceNote(projectRoot: string): string | null {
  const { projectVersion, usedVersion, from } = typeScriptSource(projectRoot);
  if (!projectVersion || from === 'project') return null;
  return from === 'roc'
    ? `project typescript ${projectVersion} offers no JS API; parsed with RoC's typescript ${usedVersion ?? '?'} (parsing needs no type-checking, so the versions need not match)`
    : `the project's typescript ${projectVersion} has no compiler API, and RoC resolved no TypeScript that has one — the laws that parse were NOT read`;
}
