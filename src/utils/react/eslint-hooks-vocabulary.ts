/**
 * The vocabulary of eslint-plugin-react-hooks configs: the plugin, its rules
 * and presets, the shared configs known to carry them, the config file
 * names, what a rule's severity means, and how a config file is found. See
 * eslint-hooks-config.ts for the reader that uses it.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import { PathOperations } from '../path-operations';
import type { TypeScriptModule } from './tsx-source';

/** The package whose rules the law asks for. */
export const HOOKS_PLUGIN = 'eslint-plugin-react-hooks';
/** The prefix of the plugin's rule names in a `rules` object. */
export const RULE_PREFIX = 'react-hooks/';

/** The two core rules (rules-of-hooks, exhaustive-deps): required. */
export const CORE_HOOK_RULES: readonly string[] = [
  'rules-of-hooks',
  'exhaustive-deps',
];

/**
 * React Compiler rules of the plugin (7.x recommended preset) that stand in
 * for laws RoC deliberately does not have: turning one off is reported.
 */
export const RELIED_COMPILER_RULES: readonly string[] = [
  'set-state-in-effect',
  'immutability',
  'purity',
  'static-components',
];

/** `configs.recommended`, `configs['recommended-latest']`, and both under `configs.flat`. */
export const PLUGIN_PRESETS = new Set(['recommended', 'recommended-latest']);

/**
 * Shared configs whose arrays register the plugin and enable both core rules
 * — verified in eslint-config-next 16.4.6 (`dist/index.js`; `core-web-vitals`
 * spreads it). The bare `next` names are how `.eslintrc` and FlatCompat
 * spell the same packages.
 */
export const KNOWN_PRESET_MODULES = [
  'eslint-config-next',
  'eslint-config-next/core-web-vitals',
];
/** `extends` entries known to enable the core rules. */
export const KNOWN_EXTENDS = new Set([
  ...KNOWN_PRESET_MODULES,
  'next',
  'next/core-web-vitals',
  'plugin:react-hooks/recommended',
  'plugin:react-hooks/recommended-latest',
]);

/** Imports that never carry rules of another plugin: ESLint itself and its helpers. */
export const NEUTRAL_MODULE =
  /^(?:node:|eslint$|eslint\/|@eslint\/|globals$|typescript-eslint$|@typescript-eslint\/|path$|url$|module$)/;

/** Shared configs read and found WITHOUT the hooks rules (eslint-config-next 16.4.6: typescript-eslint rules only). */
export const KNOWN_WITHOUT_HOOKS = new Set(['eslint-config-next/typescript']);

/** Flat config file names, in the order ESLint looks for them. */
export const FLAT_CONFIG_FILES: readonly string[] = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];
/** Legacy `.eslintrc*` file names. */
export const ESLINTRC_FILES: readonly string[] = [
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc',
  '.eslintrc.yaml',
  '.eslintrc.yml',
];

/** Extensions tried, in order, when a relative config import is resolved. */
const RESOLVE_EXTENSIONS = [
  '',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.json',
];

/** A rule's severity as written: off, on (warn or error), or not readable. */
export type RuleState = 'off' | 'on' | 'unknown';

/** Severity strings and numbers, and the state each one is. */
const STRING_LEVELS = new Map<string, RuleState>([
  ['off', 'off'],
  ['warn', 'on'],
  ['error', 'on'],
]);
const NUMERIC_LEVELS = new Map<string, RuleState>([
  ['0', 'off'],
  ['1', 'on'],
  ['2', 'on'],
]);

/** The state of a severity written as a string (`'warn'`) or a number (`2`). */
export function levelState(text: string, numeric: boolean): RuleState {
  return (numeric ? NUMERIC_LEVELS : STRING_LEVELS).get(text) ?? 'unknown';
}

/** What the config files read say about the plugin. */
export interface HooksConfigEvidence {
  /** The preset that enables the core rules, as written — null when none is used. */
  preset: string | null;
  /** Core and compiler rules set to a non-off severity. */
  enabled: Set<string>;
  /** `react-hooks/<rule>` set to off, with `file:line`. */
  disabled: Array<{ rule: string; at: string }>;
  /** Non-relative imports this reader cannot judge (they may carry the rules). */
  unknownModules: Set<string>;
  /** Files that could not be read, with the reason. */
  unread: string[];
}

/** Evidence before any config file is read: no preset, no rules, nothing unread. */
export function emptyEvidence(): HooksConfigEvidence {
  return {
    preset: null,
    enabled: new Set(),
    disabled: [],
    unknownModules: new Set(),
    unread: [],
  };
}

/** The `eslintConfig` property of a package.json, or null. */
export function eslintConfigOf(
  ts: TypeScriptModule,
  sourceFile: TS.JsonSourceFile
): TS.Node | null {
  const statement = sourceFile.statements[0];
  const object = statement?.expression;
  if (!object || !ts.isObjectLiteralExpression(object)) return null;
  const property = object.properties.find(
    p =>
      ts.isPropertyAssignment(p) &&
      ts.isStringLiteral(p.name) &&
      p.name.text === 'eslintConfig'
  );
  return property ?? null;
}

/** The file a relative config import names: the path, with an extension, or its index.js. */
export function resolveConfigFile(base: string): string | null {
  for (const extension of RESOLVE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      return candidate;
  }
  const index = PathOperations.join(base, 'index.js');
  return fs.existsSync(index) ? index : null;
}
