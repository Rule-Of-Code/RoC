/**
 * An ESLint JavaScript config (`eslint.config.js` / `.mjs`), loaded the way
 * ESLint loads it — by running it — and reduced to its rules (#613).
 *
 * A config `require` can load (CommonJS, or ESM where Node supports
 * `require(esm)`) is loaded in process. An ESM config `require` refuses is
 * imported by a child Node process, which prints the rules as JSON. The rules
 * used to be taken from the file's text with a regular expression, which
 * missed a rule with options (`'complexity': ['error', 10]`) and an unquoted
 * key (`complexity: 'error'`); a config that cannot be loaded either way is
 * now said not to be read (null), never guessed from its text.
 *
 * Running the config runs the project's code, as ESLint itself does; the
 * child gets a time limit.
 */

import path from 'path';

import { spawnSync } from './child-process';

/** How long the child may take to import a config and its plugins. */
const IMPORT_TIMEOUT_MS = 20_000;

/**
 * The child: imports the config by file URL, awaits a promised default, and
 * prints the rules of every config object (nested arrays flattened), later
 * objects over earlier ones.
 */
const IMPORT_SCRIPT = `
const { pathToFileURL } = require('url');
import(pathToFileURL(process.argv[1]).href)
  .then(async mod => {
    const exported = await (mod.default ?? mod);
    const items = [exported].flat(Infinity);
    const rules = {};
    for (const item of items) {
      if (item && typeof item === 'object' && item.rules && typeof item.rules === 'object') {
        Object.assign(rules, item.rules);
      }
    }
    process.stdout.write(JSON.stringify({ rules }));
  })
  .catch(error => {
    process.stderr.write(String((error && error.message) || error));
    process.exit(1);
  });
`;

/** The rules of a loaded config: a flat config array (merged) or a legacy object. */
export function rulesOfLoadedConfig(
  loaded: unknown
): Record<string, unknown> | null {
  if (!loaded || typeof loaded !== 'object') return null;
  const module = loaded as { default?: unknown };
  const exported =
    Array.isArray(loaded) || module.default === undefined
      ? loaded
      : module.default;
  if (Array.isArray(exported)) {
    const rules: Record<string, unknown> = {};
    for (const item of exported.flat(Infinity) as unknown[]) {
      if (item && typeof item === 'object' && 'rules' in item) {
        Object.assign(
          rules,
          (item as { rules: Record<string, unknown> }).rules
        );
      }
    }
    return { rules };
  }
  return exported && typeof exported === 'object'
    ? (exported as Record<string, unknown>)
    : null;
}

/** Import an ESM config in a child Node process; null when it cannot be loaded. */
function importInChild(configPath: string): Record<string, unknown> | null {
  const child = spawnSync(process.execPath, ['-e', IMPORT_SCRIPT, configPath], {
    cwd: path.dirname(configPath),
    encoding: 'utf8',
    timeout: IMPORT_TIMEOUT_MS,
    windowsHide: true,
  });
  if (child.status !== 0 || typeof child.stdout !== 'string') return null;
  try {
    const parsed = JSON.parse(child.stdout) as { rules?: unknown };
    return parsed.rules && typeof parsed.rules === 'object'
      ? { rules: parsed.rules as Record<string, unknown> }
      : null;
  } catch {
    return null;
  }
}

/**
 * The config at `configPath` as ESLint would load it, reduced to
 * `{ rules }` for a flat config; null when it cannot be loaded.
 */
export function loadESLintJsConfig(
  configPath: string
): Record<string, unknown> | null {
  let loaded: unknown;
  try {
    loaded = require(configPath);
  } catch {
    return importInChild(configPath);
  }
  // A promised default (allowed for flat configs) cannot be awaited here.
  const exported = (loaded as { default?: unknown } | null)?.default ?? loaded;
  if (exported instanceof Promise) return importInChild(configPath);
  return rulesOfLoadedConfig(loaded);
}
