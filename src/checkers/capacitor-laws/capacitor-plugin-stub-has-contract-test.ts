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

import { PARTLY_READ_TEXT, withNotRead } from '../../utils/judged-nothing';
import { glob } from 'glob';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  bridgeSources,
  CAPACITOR_PLUGIN_MODULE,
} from '../../utils/capacitor/capacitor-sources';
import { readText } from '../../utils/capacitor/native-plugins';
import { FileUtils } from '../../utils/file-utils';
import { TEST_FILE_NAME } from '../../utils/file-constants';
import { declaredDependencies } from '../../utils/law-requirements';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
  type TypeScriptModule,
} from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import {
  configFiles,
  configMappings,
  matches,
  scriptMappings,
  type StubMapping,
} from './stub-mappings';

export type { StubMapping } from './stub-mappings';

const ACTUAL_LOADERS = new Set(['requireActual', 'importActual']);
const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const NOT_SCANNED = ['**/node_modules/**', '**/dist/**', '**/coverage/**'];

export class CapacitorPluginStubHasContractTestLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Plugin Stub Has Contract Test';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    // What could not be read is a note, not a finding (#453).
    const notRead: string[] = [];
    const ts = loadTypeScript(context.projectRoot);
    const configs = this.configFiles(context.projectRoot);
    if (!ts && configs.some(file => !file.endsWith('.json'))) {
      notRead.push(
        `test configs: ${parserUnavailable(context.projectRoot)} — module mappings in them were not read, so this law does not pass on them; ${PARTLY_READ_TEXT}`
      );
    }
    const unreadMappers: string[] = [];
    const mappings = configs.flatMap(file =>
      configMappings(context, ts, file, violations, unreadMappers)
    );
    const plugins = [...declaredDependencies(context.projectRoot)]
      .filter(name => CAPACITOR_PLUGIN_MODULE.test(name))
      .sort();
    // A mapper this law cannot read could stub any declared plugin.
    if (plugins.length > 0) notRead.push(...unreadMappers);
    const stubbed = plugins.flatMap(plugin => {
      const mapping = mappings.find(candidate =>
        this.matches(candidate, plugin)
      );
      return mapping ? [{ plugin, mapping }] : [];
    });
    if (stubbed.length > 0 && ts) {
      const covered = this.contractTested(
        context,
        ts,
        stubbed.map(entry => entry.plugin)
      );
      const calls = this.calledMethods(
        context,
        stubbed.map(entry => entry.plugin),
        violations
      );
      for (const { plugin, mapping } of stubbed) {
        if (covered.has(plugin)) continue;
        const methods = calls.get(plugin) ?? [];
        const used = methods.length
          ? `; the app calls ${methods.map(method => `${method}()`).join(', ')} on it`
          : '';
        violations.push(
          `${plugin} is stubbed workspace-wide by ${mapping.config} (${mapping.pattern} → ${mapping.stub}) and no test loads the real package${used} — every test proves the app against the stub, and nothing sees where the real web implementation differs. Add one contract test (jest.requireActual / vi.importActual, or a probe under thresholds.capacitor.contractTests)`
        );
      }
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Keep the stub for unit tests, and add one contract test per stubbed plugin that loads the real package',
        'Declare probes that run the real bundle (outside Jest/Vitest) in thresholds.capacitor.contractTests',
      ],
      context
    );
    return withNotRead(result, notRead);
  }

  /** Jest / Vitest configs at the root and in each workspace project, read regardless of ignores. */
  static configFiles(projectRoot: string): string[] {
    return configFiles(projectRoot);
  }

  /** The mappings in one script config; see the stub-mappings module. */
  static scriptMappings(
    source: TsxSource,
    config: string,
    unread: string[] = []
  ): StubMapping[] {
    return scriptMappings(source, config, unread);
  }

  static matches(mapping: StubMapping, plugin: string): boolean {
    return matches(mapping, plugin);
  }

  /** Plugins some test loads for real: requireActual/importActual in a test, or any reference in a declared contract test. */
  private static contractTested(
    context: LawCheckContext,
    ts: TypeScriptModule,
    plugins: string[]
  ): Set<string> {
    const wanted = new Set(plugins);
    const covered = new Set<string>();
    const tests = FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      SCRIPT_EXTENSIONS,
      context.lawId,
      true
    ).filter(file => TEST_FILE_NAME.test(file));
    for (const file of tests) {
      const source = this.parse(ts, file);
      if (source)
        this.actualLoads(source, wanted).forEach(plugin => covered.add(plugin));
    }
    const declared = context.config.thresholds?.capacitor?.contractTests ?? [];
    const probes = declared.length
      ? glob.sync(declared, {
          cwd: context.projectRoot,
          absolute: true,
          nodir: true,
          ignore: NOT_SCANNED,
        })
      : [];
    for (const file of probes.filter(candidate =>
      SCRIPT_EXTENSIONS.some(ext => candidate.endsWith(ext))
    )) {
      const source = this.parse(ts, file);
      if (source)
        this.references(source, wanted).forEach(plugin => covered.add(plugin));
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
      if (
        !ts.isCallExpression(node) ||
        !ts.isPropertyAccessExpression(node.expression)
      )
        return;
      if (!ACTUAL_LOADERS.has(node.expression.name.text)) return;
      const [first] = node.arguments;
      if (first && ts.isStringLiteralLike(first) && wanted.has(first.text))
        found.push(first.text);
    });
    return found;
  }

  /** Module specifiers (import, require, dynamic import) naming a wanted plugin. */
  private static references(source: TsxSource, wanted: Set<string>): string[] {
    const ts = source.ts;
    const found: string[] = [];
    source.walk(node => {
      const specifier =
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : ts.isCallExpression(node) &&
              node.arguments[0] &&
              ts.isStringLiteralLike(node.arguments[0])
            ? node.arguments[0].text
            : null;
      if (specifier && wanted.has(specifier)) found.push(specifier);
    });
    return found;
  }

  /** What the app calls on each plugin: `<named import>.<method>(…)` in non-test source. */
  private static calledMethods(
    context: LawCheckContext,
    plugins: string[],
    violations: string[]
  ): Map<string, string[]> {
    const { sources, unread } = bridgeSources(context);
    violations.push(
      ...unread.map(
        reason => `${reason} — the plugin methods the app calls were not listed`
      )
    );
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
        if (
          !ts.isCallExpression(node) ||
          !ts.isPropertyAccessExpression(node.expression)
        )
          return;
        const receiver = node.expression.expression;
        const plugin = ts.isIdentifier(receiver)
          ? bound.get(receiver.text)
          : undefined;
        if (!plugin) return;
        const set = calls.get(plugin) ?? new Set<string>();
        set.add(node.expression.name.text);
        calls.set(plugin, set);
      });
    }
    return new Map(
      [...calls].map(([plugin, set]) => [plugin, [...set].sort()])
    );
  }
}
