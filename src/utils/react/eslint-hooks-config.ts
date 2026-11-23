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
import {
  emptyEvidence,
  eslintConfigOf,
  HOOKS_PLUGIN,
  type HooksConfigEvidence,
  KNOWN_EXTENDS,
  KNOWN_PRESET_MODULES,
  KNOWN_WITHOUT_HOOKS,
  levelState,
  NEUTRAL_MODULE,
  PLUGIN_PRESETS,
  resolveConfigFile,
  RULE_PREFIX,
  type RuleState,
} from './eslint-hooks-vocabulary';

export {
  CORE_HOOK_RULES,
  emptyEvidence,
  ESLINTRC_FILES,
  FLAT_CONFIG_FILES,
  HOOKS_PLUGIN,
  type HooksConfigEvidence,
  RELIED_COMPILER_RULES,
} from './eslint-hooks-vocabulary';

/** One config file, parsed, with the root node the walk starts from. */
interface ParsedConfig {
  sourceFile: TS.SourceFile;
  root: TS.Node;
}

/**
 * Accumulates, across one or more ESLint config files, what they say about
 * eslint-plugin-react-hooks: the preset used, rules enabled and disabled,
 * unknown non-relative imports and files it could not read. `read` parses a
 * config and follows its relative imports, each file once.
 */
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
    if (
      base === 'package.json' ||
      base === '.eslintrc' ||
      base.endsWith('.json')
    ) {
      const sourceFile = this.ts.parseJsonText(file, text);
      const root =
        base === 'package.json'
          ? eslintConfigOf(this.ts, sourceFile)
          : sourceFile;
      return root ? { sourceFile, root } : null;
    }
    const source = TsxSource.parse(this.ts, file, text);
    return { sourceFile: source.sourceFile, root: source.sourceFile };
  }

  private visit(
    node: TS.Node,
    bindings: Map<string, string>,
    at: (node: TS.Node) => string,
    file: string
  ): void {
    const ts = this.ts;
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      this.recordImport(node, node.moduleSpecifier.text, bindings, file);
    } else if (ts.isCallExpression(node)) {
      this.visitCall(node, bindings, file);
    } else if (ts.isPropertyAssignment(node)) {
      this.visitProperty(node, at);
    } else if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
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
    if (named && ts.isNamespaceImport(named))
      bindings.set(named.name.text, module);
    if (named && ts.isNamedImports(named)) {
      for (const element of named.elements)
        bindings.set(element.name.text, module);
    }
    this.followOrRecord(module, file);
  }

  /** `require('x')` bound to a name; `compat.extends('next/core-web-vitals')`. */
  private visitCall(
    node: TS.CallExpression,
    bindings: Map<string, string>,
    file: string
  ): void {
    const ts = this.ts;
    const callee = node.expression;
    const module = this.requiredModule(node);
    if (module !== null) {
      this.recordRequire(node, module, bindings, file);
      return;
    }
    if (
      ts.isPropertyAccessExpression(callee) &&
      callee.name.text === 'extends'
    ) {
      for (const argument of node.arguments) this.creditExtends(argument);
    }
  }

  /** The module of `require('x')`, or null when the call is not one. */
  private requiredModule(node: TS.CallExpression): string | null {
    const ts = this.ts;
    const callee = node.expression;
    const first = node.arguments[0];
    return ts.isIdentifier(callee) &&
      callee.text === 'require' &&
      first &&
      ts.isStringLiteral(first)
      ? first.text
      : null;
  }

  /** `const x = require('m')` binds `x`; a preset required in place is used. */
  private recordRequire(
    node: TS.CallExpression,
    module: string,
    bindings: Map<string, string>,
    file: string
  ): void {
    const ts = this.ts;
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      bindings.set(parent.name.text, module);
    } else if (this.presets.has(module)) {
      this.evidence.preset ??= module; // used in place: `...require('eslint-config-next')`
    }
    this.followOrRecord(module, file);
  }

  private visitProperty(
    node: TS.PropertyAssignment,
    at: (node: TS.Node) => string
  ): void {
    const ts = this.ts;
    const name =
      ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)
        ? node.name.text
        : null;
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
    if (ts.isPropertyAccessExpression(owner) && owner.name.text === 'flat')
      owner = owner.expression;
    if (!ts.isPropertyAccessExpression(owner) || owner.name.text !== 'configs')
      return;
    const plugin = owner.expression;
    if (ts.isIdentifier(plugin) && bindings.get(plugin.text) === HOOKS_PLUGIN) {
      this.evidence.preset ??= `${HOOKS_PLUGIN} configs.${preset}`;
    }
  }

  private accessName(
    node: TS.PropertyAccessExpression | TS.ElementAccessExpression
  ): string | null {
    const ts = this.ts;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    const argument = node.argumentExpression;
    return ts.isStringLiteralLike(argument) ? argument.text : null;
  }

  /** A string (or array of strings) in an `extends` position. */
  private creditExtends(node: TS.Node): void {
    const ts = this.ts;
    const strings = ts.isArrayLiteralExpression(node)
      ? [...node.elements]
      : [node];
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
    const level = ts.isArrayLiteralExpression(value)
      ? value.elements[0]
      : value;
    if (!level) return 'unknown';
    if (ts.isStringLiteralLike(level)) return levelState(level.text, false);
    if (ts.isNumericLiteral(level)) return levelState(level.text, true);
    return 'unknown';
  }

  /** A preset import counts only where its binding is used — spread, listed, extended. */
  private creditUsedBindings(
    root: TS.Node,
    bindings: Map<string, string>
  ): void {
    const ts = this.ts;
    this.walk(root, node => {
      if (!ts.isIdentifier(node)) return;
      const module = bindings.get(node.text);
      if (!module || !this.presets.has(module) || this.isDeclaration(node))
        return;
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
      const target = resolveConfigFile(
        PathOperations.join(PathOperations.getDirectory(file), module)
      );
      if (target) this.read(target);
      else
        this.evidence.unread.push(
          `${this.relative(file)}: imports ${module}, which could not be resolved to a file`
        );
      return;
    }
    if (
      module === HOOKS_PLUGIN ||
      this.presets.has(module) ||
      KNOWN_WITHOUT_HOOKS.has(module)
    )
      return;
    if (NEUTRAL_MODULE.test(module)) return;
    this.evidence.unknownModules.add(module);
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
