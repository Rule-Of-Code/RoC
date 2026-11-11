/**
 * What an ESLint config says about eslint-plugin-react-hooks, read from the
 * parse of the config file — never from its text.
 *
 * A text search over `eslint.config.mjs` counts a preset that is commented
 * out, a rule name inside a string that disables it, and an import that is
 * never spread into the exported array. The config is parsed instead (the
 * project's own TypeScript reads `.js/.mjs/.cjs/.ts`; `ts.parseJsonText`
 * reads `.eslintrc.json`), so comments are trivia, a rule's severity is the
 * value of its property, and a preset counts only when its binding is used.
 *
 * Relative imports are followed (an app config that spreads the workspace
 * one). A non-relative import the reader does not know is recorded: it may
 * carry the rules, and the law names it instead of guessing.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import { PathOperations } from '../path-operations';
import { TsxSource, type TypeScriptModule } from './tsx-source';

/** The package whose rules the law asks for. */
export const HOOKS_PLUGIN = 'eslint-plugin-react-hooks';
const RULE_PREFIX = 'react-hooks/';

/** The two core rules (rules-of-hooks, exhaustive-deps): required. */
export const CORE_HOOK_RULES: readonly string[] = ['rules-of-hooks', 'exhaustive-deps'];

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
const PLUGIN_PRESETS = new Set(['recommended', 'recommended-latest']);

/**
 * Shared configs whose arrays register the plugin and enable both core rules
 * — verified in eslint-config-next 16.4.6 (`dist/index.js`; `core-web-vitals`
 * spreads it). The bare `next` names are how `.eslintrc` and FlatCompat
 * spell the same packages.
 */
const KNOWN_PRESET_MODULES = ['eslint-config-next', 'eslint-config-next/core-web-vitals'];
const KNOWN_EXTENDS = new Set([
  ...KNOWN_PRESET_MODULES,
  'next',
  'next/core-web-vitals',
  'plugin:react-hooks/recommended',
  'plugin:react-hooks/recommended-latest',
]);

/** Imports that never carry rules of another plugin: ESLint itself and its helpers. */
const NEUTRAL_MODULE =
  /^(?:node:|eslint$|eslint\/|@eslint\/|globals$|typescript-eslint$|@typescript-eslint\/|path$|url$|module$)/;

/** Shared configs read and found WITHOUT the hooks rules (eslint-config-next 16.4.6: typescript-eslint rules only). */
const KNOWN_WITHOUT_HOOKS = new Set(['eslint-config-next/typescript']);

export const FLAT_CONFIG_FILES: readonly string[] = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];
export const ESLINTRC_FILES: readonly string[] = [
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc',
  '.eslintrc.yaml',
  '.eslintrc.yml',
];

const RESOLVE_EXTENSIONS = ['', '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.json'];

type RuleState = 'off' | 'on' | 'unknown';

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

export function emptyEvidence(): HooksConfigEvidence {
  return {
    preset: null,
    enabled: new Set(),
    disabled: [],
    unknownModules: new Set(),
    unread: [],
  };
}

/** One config file, parsed, with the root node the walk starts from. */
interface ParsedConfig {
  sourceFile: TS.SourceFile;
  root: TS.Node;
}

export class EslintHooksConfigReader {
  private readonly visited = new Set<string>();
  private readonly presets: Set<string>;

  constructor(
    private readonly ts: TypeScriptModule,
    private readonly projectRoot: string,
    namedPresets: readonly string[],
    readonly evidence: HooksConfigEvidence = emptyEvidence()
  ) {
    this.presets = new Set([...KNOWN_PRESET_MODULES, ...namedPresets]);
  }

  /** Read one config file and the relative configs it imports. */
  read(file: string): void {
    const key = PathOperations.normalize(file);
    if (this.visited.has(key)) return;
    this.visited.add(key);
    const parsed = this.parse(file);
    if (!parsed) return;
    const bindings = new Map<string, string>();
    const at = (node: TS.Node): string =>
      `${this.relative(file)}:${parsed.sourceFile.getLineAndCharacterOfPosition(node.getStart(parsed.sourceFile)).line + 1}`;
    this.walk(parsed.root, node => this.visit(node, bindings, at, file));
    this.creditUsedBindings(parsed.root, bindings);
  }

  private parse(file: string): ParsedConfig | null {
    if (/\.ya?ml$/.test(file)) {
      this.evidence.unread.push(
        `${this.relative(file)}: a YAML ESLint config is not read — this law cannot see what it enables or turns off. Use .eslintrc.json or a flat eslint.config.*`
      );
      return null;
    }
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      this.evidence.unread.push(`${this.relative(file)}: could not be read`);
      return null;
    }
    const base = PathOperations.getFilename(file);
    if (base === 'package.json' || base === '.eslintrc' || base.endsWith('.json')) {
      const sourceFile = this.ts.parseJsonText(file, text);
      const root = base === 'package.json' ? this.eslintConfigOf(sourceFile) : sourceFile;
      return root ? { sourceFile, root } : null;
    }
    const source = TsxSource.parse(this.ts, file, text);
    return { sourceFile: source.sourceFile, root: source.sourceFile };
  }

  /** The `eslintConfig` property of a package.json, or null. */
  private eslintConfigOf(sourceFile: TS.JsonSourceFile): TS.Node | null {
    const ts = this.ts;
    const statement = sourceFile.statements[0];
    const object = statement?.expression;
    if (!object || !ts.isObjectLiteralExpression(object)) return null;
    const property = object.properties.find(
      p => ts.isPropertyAssignment(p) && ts.isStringLiteral(p.name) && p.name.text === 'eslintConfig'
    );
    return property ?? null;
  }

  private visit(
    node: TS.Node,
    bindings: Map<string, string>,
    at: (node: TS.Node) => string,
    file: string
  ): void {
    const ts = this.ts;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      this.recordImport(node, node.moduleSpecifier.text, bindings, file);
    } else if (ts.isCallExpression(node)) {
      this.visitCall(node, bindings, file);
    } else if (ts.isPropertyAssignment(node)) {
      this.visitProperty(node, at);
    } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      this.visitPresetAccess(node, bindings);
    }
  }

  private recordImport(
    node: TS.ImportDeclaration,
    module: string,
    bindings: Map<string, string>,
    file: string
  ): void {
    const ts = this.ts;
    const clause = node.importClause;
    if (clause?.name) bindings.set(clause.name.text, module);
    const named = clause?.namedBindings;
    if (named && ts.isNamespaceImport(named)) bindings.set(named.name.text, module);
    if (named && ts.isNamedImports(named)) {
      for (const element of named.elements) bindings.set(element.name.text, module);
    }
    this.followOrRecord(module, file);
  }

  /** `require('x')` bound to a name; `compat.extends('next/core-web-vitals')`. */
  private visitCall(node: TS.CallExpression, bindings: Map<string, string>, file: string): void {
    const ts = this.ts;
    const callee = node.expression;
    const first = node.arguments[0];
    if (ts.isIdentifier(callee) && callee.text === 'require' && first && ts.isStringLiteral(first)) {
      const module = first.text;
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        bindings.set(parent.name.text, module);
      } else if (this.presets.has(module)) {
        this.evidence.preset ??= module; // used in place: `...require('eslint-config-next')`
      }
      this.followOrRecord(module, file);
      return;
    }
    if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'extends') {
      for (const argument of node.arguments) this.creditExtends(argument);
    }
  }

  private visitProperty(node: TS.PropertyAssignment, at: (node: TS.Node) => string): void {
    const ts = this.ts;
    const name = ts.isStringLiteral(node.name) || ts.isIdentifier(node.name) ? node.name.text : null;
    if (name === 'extends') {
      this.creditExtends(node.initializer);
      return;
    }
    if (!name?.startsWith(RULE_PREFIX)) return;
    const rule = name.slice(RULE_PREFIX.length);
    const state = this.ruleState(node.initializer);
    if (state === 'off') this.evidence.disabled.push({ rule, at: at(node) });
    if (state === 'on') this.evidence.enabled.add(rule);
  }

  /** `reactHooks.configs.recommended`, `reactHooks.configs.flat['recommended-latest']`. */
  private visitPresetAccess(
    node: TS.PropertyAccessExpression | TS.ElementAccessExpression,
    bindings: Map<string, string>
  ): void {
    const ts = this.ts;
    const preset = this.accessName(node);
    if (!preset || !PLUGIN_PRESETS.has(preset)) return;
    let owner = node.expression;
    if (ts.isPropertyAccessExpression(owner) && owner.name.text === 'flat') owner = owner.expression;
    if (!ts.isPropertyAccessExpression(owner) || owner.name.text !== 'configs') return;
    const plugin = owner.expression;
    if (ts.isIdentifier(plugin) && bindings.get(plugin.text) === HOOKS_PLUGIN) {
      this.evidence.preset ??= `${HOOKS_PLUGIN} configs.${preset}`;
    }
  }

  private accessName(node: TS.PropertyAccessExpression | TS.ElementAccessExpression): string | null {
    const ts = this.ts;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    const argument = node.argumentExpression;
    return ts.isStringLiteralLike(argument) ? argument.text : null;
  }

  /** A string (or array of strings) in an `extends` position. */
  private creditExtends(node: TS.Node): void {
    const ts = this.ts;
    const strings = ts.isArrayLiteralExpression(node) ? [...node.elements] : [node];
    for (const element of strings) {
      if (!ts.isStringLiteralLike(element)) continue;
      if (KNOWN_EXTENDS.has(element.text) || this.presets.has(element.text)) {
        this.evidence.preset ??= element.text;
      }
    }
  }

  /** 'off' / 0 / ['off', …] is off; 'warn' / 'error' / 1 / 2 is on. */
  private ruleState(value: TS.Expression): RuleState {
    const ts = this.ts;
    const level = ts.isArrayLiteralExpression(value) ? value.elements[0] : value;
    if (!level) return 'unknown';
    if (ts.isStringLiteralLike(level)) {
      if (level.text === 'off') return 'off';
      return level.text === 'warn' || level.text === 'error' ? 'on' : 'unknown';
    }
    if (ts.isNumericLiteral(level)) {
      if (level.text === '0') return 'off';
      return level.text === '1' || level.text === '2' ? 'on' : 'unknown';
    }
    return 'unknown';
  }

  /** A preset import counts only where its binding is used — spread, listed, extended. */
  private creditUsedBindings(root: TS.Node, bindings: Map<string, string>): void {
    const ts = this.ts;
    this.walk(root, node => {
      if (!ts.isIdentifier(node)) return;
      const module = bindings.get(node.text);
      if (!module || !this.presets.has(module) || this.isDeclaration(node)) return;
      this.evidence.preset ??= module;
    });
  }

  private isDeclaration(node: TS.Identifier): boolean {
    const ts = this.ts;
    const parent = node.parent;
    return (
      ts.isImportClause(parent) ||
      ts.isImportSpecifier(parent) ||
      ts.isNamespaceImport(parent) ||
      (ts.isVariableDeclaration(parent) && parent.name === node)
    );
  }

  /** Follow a relative config; record a module this reader does not know. */
  private followOrRecord(module: string, file: string): void {
    if (module.startsWith('.')) {
      const target = this.resolveRelative(PathOperations.join(PathOperations.getDirectory(file), module));
      if (target) this.read(target);
      else this.evidence.unread.push(`${this.relative(file)}: imports ${module}, which could not be resolved to a file`);
      return;
    }
    if (module === HOOKS_PLUGIN || this.presets.has(module) || KNOWN_WITHOUT_HOOKS.has(module)) return;
    if (NEUTRAL_MODULE.test(module)) return;
    this.evidence.unknownModules.add(module);
  }

  private resolveRelative(base: string): string | null {
    for (const extension of RESOLVE_EXTENSIONS) {
      const candidate = `${base}${extension}`;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    const index = PathOperations.join(base, 'index.js');
    return fs.existsSync(index) ? index : null;
  }

  private walk(root: TS.Node, visit: (node: TS.Node) => void): void {
    const recurse = (node: TS.Node): void => {
      visit(node);
      this.ts.forEachChild(node, recurse);
    };
    recurse(root);
  }

  private relative(file: string): string {
    return PathOperations.getRelative(this.projectRoot, file);
  }
}
