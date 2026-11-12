/**
 * Capacitor Plugin Stub Has Contract Test
 *
 * Capacitor plugins often cannot load under jsdom, and the common fix is a
 * workspace-wide stub: a Jest `moduleNameMapper` (or a Vitest alias) that
 * points the plugin's name at a hand-written file. From then on every test
 * proves the app's branches against an object the team wrote; none of them
 * sees the real plugin, and the coverage laws still count the lines. The gap
 * is wherever the real web implementation differs from the stub's idea of it.
 *
 * The law finds each stubbed plugin and asks for one contract test that
 * loads the real package: a test that calls jest.requireActual /
 * vi.importActual on it, or a file under `thresholds.capacitor.contractTests`
 * (a probe run without the mapping, a browser test of the real bundle) that
 * imports it.
 */

import { glob } from 'glob';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import { bridgeSources, CAPACITOR_PLUGIN_MODULE } from '../../utils/capacitor/capacitor-sources';
import { readText } from '../../utils/capacitor/native-plugins';
import { FileUtils } from '../../utils/file-utils';
import { TEST_FILE_NAME } from '../../utils/file-constants';
import { declaredDependencies } from '../../utils/law-requirements';
import { NxWorkspace } from '../../utils/nx-workspace';
import { loadTypeScript, parserUnavailable, TsxSource, type TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const CONFIG_NAMES = [
  'jest.config.ts',
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.mjs',
  'jest.config.cts',
  'jest.config.mts',
  'jest.config.json',
  'jest.preset.js',
  'jest.preset.cjs',
  'jest.preset.ts',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mts',
  'vitest.config.mjs',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'vitest.workspace.ts',
  'vitest.workspace.js',
];
const ACTUAL_LOADERS = new Set(['requireActual', 'importActual']);
const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const NOT_SCANNED = ['**/node_modules/**', '**/dist/**', '**/coverage/**'];

/** One mapping of a module name to a stand-in, as a test config states it. */
export interface StubMapping {
  /** The pattern: a Jest regex source, a Vitest alias string, or a Vitest regex source. */
  pattern: string;
  regex: boolean;
  /** The stand-in as written (a path, or the expression that builds one). */
  stub: string;
  config: string;
}

/** Where a mapper value is being read, and where an unreadable one is reported. */
interface MapperSite {
  config: string;
  key: 'moduleNameMapper' | 'alias';
  unread: string[];
  /** Same-file const hops taken so far. */
  depth: number;
}

/** `const a = b; const b = { … }` is followed this many hops, then reported as not read. */
const MAX_CONST_HOPS = 3;

export class CapacitorPluginStubHasContractTestLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Plugin Stub Has Contract Test';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const ts = loadTypeScript(context.projectRoot);
    const configs = this.configFiles(context.projectRoot);
    if (!ts && configs.some(file => !file.endsWith('.json'))) {
      violations.push(`test configs: ${parserUnavailable(context.projectRoot)} — module mappings in them were not read, so this law does not pass on them`);
    }
    const unreadMappers: string[] = [];
    const mappings = configs.flatMap(file => this.mappings(context, ts, file, violations, unreadMappers));
    const plugins = [...declaredDependencies(context.projectRoot)].filter(name => CAPACITOR_PLUGIN_MODULE.test(name)).sort();
    // A mapper this law cannot read could stub any declared plugin.
    if (plugins.length > 0) violations.push(...unreadMappers);
    const stubbed = plugins.flatMap(plugin => {
      const mapping = mappings.find(candidate => this.matches(candidate, plugin));
      return mapping ? [{ plugin, mapping }] : [];
    });
    if (stubbed.length > 0 && ts) {
      const covered = this.contractTested(context, ts, stubbed.map(entry => entry.plugin));
      const calls = this.calledMethods(context, stubbed.map(entry => entry.plugin), violations);
      for (const { plugin, mapping } of stubbed) {
        if (covered.has(plugin)) continue;
        const methods = calls.get(plugin) ?? [];
        const used = methods.length ? `; the app calls ${methods.map(method => `${method}()`).join(', ')} on it` : '';
        violations.push(
          `${plugin} is stubbed workspace-wide by ${mapping.config} (${mapping.pattern} → ${mapping.stub}) and no test loads the real package${used} — every test proves the app against the stub, and nothing sees where the real web implementation differs. Add one contract test (jest.requireActual / vi.importActual, or a probe under thresholds.capacitor.contractTests)`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Keep the stub for unit tests, and add one contract test per stubbed plugin that loads the real package',
        'Declare probes that run the real bundle (outside Jest/Vitest) in thresholds.capacitor.contractTests',
      ],
      context
    );
  }

  /** Jest / Vitest configs at the root and in each workspace project, read regardless of ignores. */
  static configFiles(projectRoot: string): string[] {
    return [
      ...CONFIG_NAMES.flatMap(name => NxWorkspace.resolveSourceFiles(projectRoot, name)),
      ...NxWorkspace.resolveSourceFiles(projectRoot, 'package.json'),
    ];
  }

  private static mappings(
    context: LawCheckContext,
    ts: TypeScriptModule | null,
    file: string,
    violations: string[],
    unread: string[]
  ): StubMapping[] {
    const config = relative(context, file);
    const text = readText(file);
    if (text === null) {
      violations.push(`${config}: could not be read — its module mappings were not inspected`);
      return [];
    }
    if (file.endsWith('.json')) return this.jsonMappings(text, config, file.endsWith('package.json'));
    return ts ? this.scriptMappings(TsxSource.parse(ts, file, text), config, unread) : [];
  }

  private static jsonMappings(text: string, config: string, packageJson: boolean): StubMapping[] {
    let parsed: { moduleNameMapper?: unknown; jest?: { moduleNameMapper?: unknown } };
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
    const mapper = packageJson ? parsed.jest?.moduleNameMapper : parsed.moduleNameMapper;
    if (!mapper || typeof mapper !== 'object') return [];
    return Object.entries(mapper as Record<string, unknown>).map(([pattern, stub]) => ({
      pattern,
      regex: true,
      stub: String(stub),
      config,
    }));
  }

  /**
   * `moduleNameMapper: { … }` and Vitest `alias: { … } | [{ find, replacement }]`,
   * anywhere in the file. A value held in a same-file `const` (or spread from
   * one) is followed; anything else — an import, a function call, a computed
   * spread — is pushed to `unread`, because a stub inside it would go unseen.
   */
  static scriptMappings(source: TsxSource, config: string, unread: string[] = []): StubMapping[] {
    const ts = source.ts;
    const found: StubMapping[] = [];
    source.walk(node => {
      if (!ts.isPropertyAssignment(node) || !(ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) return;
      const key = node.name.text;
      if (key !== 'moduleNameMapper' && key !== 'alias') return;
      found.push(...this.mapperValue(source, node.initializer, { config, key, unread, depth: 0 }));
    });
    return found;
  }

  /** The mappings of a mapper / alias value: a literal, or a same-file const holding one. */
  private static mapperValue(source: TsxSource, value: TS.Expression, at: MapperSite): StubMapping[] {
    const ts = source.ts;
    const regex = at.key === 'moduleNameMapper';
    const inner = this.unwrap(source, value);
    if (ts.isObjectLiteralExpression(inner)) return this.objectEntries(source, inner, at);
    if (at.key === 'alias' && ts.isArrayLiteralExpression(inner)) return this.aliasArray(source, inner, at.config);
    const held = ts.isIdentifier(inner) && at.depth < MAX_CONST_HOPS ? this.sameFileConst(source, inner.text) : null;
    if (held) return this.mapperValue(source, held, { ...at, depth: at.depth + 1 });
    at.unread.push(
      `${at.config}:${source.lineOf(value)}: ${at.key} is \`${this.excerpt(source, value)}\`, which this law cannot read (only an object literal${regex ? '' : ' or array'}, or a same-file const holding one, is read) — a Capacitor plugin stubbed in it would not be seen, so this law does not pass on it`
    );
    return [];
  }

  /** `x as T`, `x satisfies T`, `(x)` → `x`. */
  private static unwrap(source: TsxSource, value: TS.Expression): TS.Expression {
    const ts = source.ts;
    let current = value;
    while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current) || ts.isSatisfiesExpression(current)) {
      current = current.expression;
    }
    return current;
  }

  /** The initializer of a top-level `const name = …` in the same file; null when there is none. */
  private static sameFileConst(source: TsxSource, name: string): TS.Expression | null {
    const ts = source.ts;
    for (const statement of source.sourceFile.statements) {
      if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
          return declaration.initializer;
        }
      }
    }
    return null;
  }

  private static excerpt(source: TsxSource, value: TS.Expression): string {
    const text = value.getText(source.sourceFile).replace(/\s+/g, ' ');
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  }

  private static objectEntries(source: TsxSource, object: TS.ObjectLiteralExpression, at: MapperSite): StubMapping[] {
    const ts = source.ts;
    const regex = at.key === 'moduleNameMapper';
    return object.properties.flatMap(property => {
      // `{ ...base, … }`: the spread is read like the value itself.
      if (ts.isSpreadAssignment(property)) return this.mapperValue(source, property.expression, at);
      if (!ts.isPropertyAssignment(property)) return [];
      const name = property.name;
      const pattern = ts.isStringLiteral(name) || ts.isIdentifier(name) || ts.isNoSubstitutionTemplateLiteral(name) ? name.text : null;
      return pattern === null ? [] : [{ pattern, regex, stub: this.stubText(source, property.initializer), config: at.config }];
    });
  }

  private static aliasArray(source: TsxSource, array: TS.ArrayLiteralExpression, config: string): StubMapping[] {
    const ts = source.ts;
    return array.elements.flatMap((element): StubMapping[] => {
      if (!ts.isObjectLiteralExpression(element)) return [];
      const property = (name: string) =>
        element.properties.find(
          (candidate): candidate is TS.PropertyAssignment =>
            ts.isPropertyAssignment(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === name
        )?.initializer;
      const find = property('find');
      const replacement = property('replacement');
      if (!find || !replacement) return [];
      if (ts.isStringLiteralLike(find)) return [{ pattern: find.text, regex: false, stub: this.stubText(source, replacement), config }];
      if (ts.isRegularExpressionLiteral(find)) {
        const literal = find.text;
        return [{ pattern: literal.slice(1, literal.lastIndexOf('/')), regex: true, stub: this.stubText(source, replacement), config }];
      }
      return [];
    });
  }

  /** A path as written: a literal, or the string pieces of path.join / resolve(…). */
  private static stubText(source: TsxSource, value: TS.Expression): string {
    const ts = source.ts;
    if (ts.isStringLiteralLike(value)) return value.text;
    if (ts.isCallExpression(value)) {
      const pieces = value.arguments.filter(ts.isStringLiteralLike).map(argument => argument.text);
      if (pieces.length) return pieces.join('/');
    }
    return value.getText(source.sourceFile);
  }

  static matches(mapping: StubMapping, plugin: string): boolean {
    if (!mapping.regex) return mapping.pattern === plugin;
    try {
      return new RegExp(mapping.pattern).test(plugin);
    } catch {
      return false;
    }
  }

  /** Plugins some test loads for real: requireActual/importActual in a test, or any reference in a declared contract test. */
  private static contractTested(context: LawCheckContext, ts: TypeScriptModule, plugins: string[]): Set<string> {
    const wanted = new Set(plugins);
    const covered = new Set<string>();
    const tests = FileUtils.scanForFiles(context.projectRoot, context.config, SCRIPT_EXTENSIONS, context.lawId, true).filter(file =>
      TEST_FILE_NAME.test(file)
    );
    for (const file of tests) {
      const source = this.parse(ts, file);
      if (source) this.actualLoads(source, wanted).forEach(plugin => covered.add(plugin));
    }
    const declared = context.config.thresholds?.capacitor?.contractTests ?? [];
    const probes = declared.length
      ? glob.sync(declared, { cwd: context.projectRoot, absolute: true, nodir: true, ignore: NOT_SCANNED })
      : [];
    for (const file of probes.filter(candidate => SCRIPT_EXTENSIONS.some(ext => candidate.endsWith(ext)))) {
      const source = this.parse(ts, file);
      if (source) this.references(source, wanted).forEach(plugin => covered.add(plugin));
    }
    return covered;
  }

  private static parse(ts: TypeScriptModule, file: string): TsxSource | null {
    const text = readText(file);
    return text === null ? null : TsxSource.parse(ts, file, text);
  }

  private static actualLoads(source: TsxSource, wanted: Set<string>): string[] {
    const ts = source.ts;
    const found: string[] = [];
    source.walk(node => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      if (!ACTUAL_LOADERS.has(node.expression.name.text)) return;
      const [first] = node.arguments;
      if (first && ts.isStringLiteralLike(first) && wanted.has(first.text)) found.push(first.text);
    });
    return found;
  }

  /** Module specifiers (import, require, dynamic import) naming a wanted plugin. */
  private static references(source: TsxSource, wanted: Set<string>): string[] {
    const ts = source.ts;
    const found: string[] = [];
    source.walk(node => {
      const specifier =
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])
            ? node.arguments[0].text
            : null;
      if (specifier && wanted.has(specifier)) found.push(specifier);
    });
    return found;
  }

  /** What the app calls on each plugin: `<named import>.<method>(…)` in non-test source. */
  private static calledMethods(context: LawCheckContext, plugins: string[], violations: string[]): Map<string, string[]> {
    const { sources, unread } = bridgeSources(context);
    violations.push(...unread.map(reason => `${reason} — the plugin methods the app calls were not listed`));
    const calls = new Map<string, Set<string>>();
    for (const source of sources) {
      const ts = source.ts;
      const bound = new Map<string, string>();
      for (const info of source.imports()) {
        if (!plugins.includes(info.module) || info.typeOnly) continue;
        info.named.forEach(named => bound.set(named.local, info.module));
      }
      if (bound.size === 0) continue;
      source.walk(node => {
        if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
        const receiver = node.expression.expression;
        const plugin = ts.isIdentifier(receiver) ? bound.get(receiver.text) : undefined;
        if (!plugin) return;
        const set = calls.get(plugin) ?? new Set<string>();
        set.add(node.expression.name.text);
        calls.set(plugin, set);
      });
    }
    return new Map([...calls].map(([plugin, set]) => [plugin, [...set].sort()]));
  }
}
