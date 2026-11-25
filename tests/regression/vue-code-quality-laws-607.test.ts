/**
 * #607, P3a — the code-quality laws read `.vue` single-file components: the
 * shared scans of CodeQualityLawBase and the laws' own scans ask for `.vue`,
 * and the file is read as its script (`readSource`, `TsxSource`,
 * `scriptText`). A finding in `<script setup>` is reported at its line in
 * the `.vue` file; text in the template that looks like code is not code;
 * and the law, having read `.vue`, gets no "not read" note.
 */
import fs from 'fs';
import path from 'path';

import { CentralizedLoggingLaw } from '../../src/checkers/code-quality-laws/centralized-logging';
import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { CodeDocumentationLaw } from '../../src/checkers/code-quality-laws/code-documentation';
import { CodeDuplicationControlLaw } from '../../src/checkers/code-quality-laws/code-duplication-control';
import { ErrorHandlingCompletenessLaw } from '../../src/checkers/code-quality-laws/error-handling-completeness';
import { DeadCodeEliminationLaw } from '../../src/checkers/code-quality-laws/dead-code-elimination';
import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import { NoDoubleCastLaw } from '../../src/checkers/code-quality-laws/no-double-cast';
import { NoExplicitAnyNonNullLaw } from '../../src/checkers/code-quality-laws/no-explicit-any-non-null';
import { ObservableCleanupLaw } from '../../src/checkers/code-quality-laws/observable-cleanup';
import { PreferUnionOverEnumLaw } from '../../src/checkers/code-quality-laws/prefer-union-over-enum';
import { TypedHttpBoundariesLaw } from '../../src/checkers/code-quality-laws/typed-http-boundaries';
import { WebStorageEncapsulationLaw } from '../../src/checkers/code-quality-laws/web-storage-encapsulation';
import { ZeroToleranceStrictLaw } from '../../src/checkers/code-quality-laws/zero-tolerance-strict';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { makeTempDir } from '../helpers/temp-dirs';

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

const BRANCHES = Array.from(
  { length: 11 },
  (_, i) => `  if (n === ${i + 20}) return ${i};`
);
const BODY = [
  '  const values = [1, 2, 3].map(v => v + 1);',
  '  const total = values.reduce((a, v) => a + v, 0);',
  '  const label = `total: ${total}`;',
  '  if (total > 0) return label.toUpperCase();',
  '  return label.toLowerCase();',
];

/** A component whose template holds text that looks like code. */
const BAD_VUE = lines(
  '<template>', //                                                     1
  "  <p>{{ v as unknown as string }} console.log localStorage.getItem('t')</p>", // 2
  '</template>', //                                                    3
  '<script setup lang="ts">', //                                       4
  'const a = 1;', //                                                   5
  'const v = a as unknown as string;', //                              6
  'function run(cb: Function): void { cb(); }', //                     7
  "console.log('render');", //                                         8
  "localStorage.setItem('k', 'v');", //                                9
  'const area = v.length * 42;', //                                   10
  'enum Color { Red, Blue }', //                                      11
  'async function load(): Promise<void> {}', //                       12
  'function start(): void { load(); }', //                            13
  'function branchy(n: number): number {', //                         14
  ...BRANCHES,
  '  return -1;',
  '}',
  'function first(): string {',
  ...BODY,
  '}',
  'function second(): string {',
  ...BODY,
  '}',
  'run(start); branchy(area); first(); second(); console.log(Color.Red);',
  '</script>'
);

function vueProject(): LawCheckContext {
  const root = makeTempDir('roc-vue607p3-');
  const files: Record<string, string> = {
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0' },
      devDependencies: { vite: '^7.0.0', typescript: '^5.9.3' },
    }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    'src/components/Bad.vue': BAD_VUE,
  };
  for (const [rel, content] of Object.entries(files)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return { projectRoot: root, config: FileUtils.getMinimalDefaultConfig() };
}

const VUE = 'src/components/Bad.vue';

/** Run a law in its scan scope: its result, and whether it left .vue unread. */
async function judge(
  check: (context: LawCheckContext) => LawResult | Promise<LawResult>
): Promise<{ text: string; unread: boolean }> {
  const context = vueProject();
  const { value, scope } = await runLawScope(() => check(context));
  return {
    text: (value.violations ?? []).join('\n'),
    unread: vueNotReadNote(scope, [VUE]) !== null,
  };
}

describe('#607 P3a the code-quality laws read .vue as its script', () => {
  it('No Double Cast: the cast in <script setup>, not the one in the template', async () => {
    const r = await judge(c => NoDoubleCastLaw.check(c));
    expect(r.text).toContain(
      `Double cast (as unknown as) in ${VUE}: 1 occurrence(s)`
    );
    expect(r.unread).toBe(false);
  });

  it('No Explicit Any / Non-Null Assertion: the weak type in the script', async () => {
    const r = await judge(c => NoExplicitAnyNonNullLaw.check(c));
    expect(r.text).toContain(
      `Explicit \`any\`/weak type in ${VUE}: 1 occurrence(s)`
    );
    expect(r.unread).toBe(false);
  });

  it('Centralized Logging: the console calls of the script, not the template text', async () => {
    const r = await judge(c => CentralizedLoggingLaw.check(c));
    expect(r.text).toContain(`${VUE}: 2 direct console.* call(s)`);
    expect(r.unread).toBe(false);
  });

  it('Web Storage Encapsulation: the script call, not the template text', async () => {
    const r = await judge(c => WebStorageEncapsulationLaw.check(c));
    expect(r.text).toContain(
      `${VUE}: 1 direct localStorage/sessionStorage call(s)`
    );
    expect(r.unread).toBe(false);
  });

  it('Magic Number Prevention: the literal in the script', async () => {
    const r = await judge(c => MagicNumberPreventionLaw.check(c));
    expect(r.text).toContain(`Magic numbers in ${VUE}: 42`);
    expect(r.unread).toBe(false);
  });

  it('Prefer Union Over Enum: the enum in the script', async () => {
    const r = await judge(c => PreferUnionOverEnumLaw.check(c));
    expect(r.text).toContain(VUE);
    expect(r.unread).toBe(false);
  });

  it('Absolute Zero Tolerance: counted in the script of the .vue file', async () => {
    const r = await judge(c => ZeroToleranceStrictLaw.check(c));
    expect(r.text).toContain(
      `Console statements found in ${VUE}: 2 occurrences`
    );
    expect(r.unread).toBe(false);
  });

  it('Error Handling Completeness: the dropped promise at its line in the .vue file', async () => {
    const r = await judge(c => ErrorHandlingCompletenessLaw.check(c));
    expect(r.text).toContain(
      `Error handling gaps in ${VUE}: 1 promise(s) neither awaited, returned nor caught (line 13)`
    );
    expect(r.unread).toBe(false);
  });

  it('Code Complexity Control: the branchy function of the script', async () => {
    const r = await judge(c => CodeComplexityControlLaw.check(c));
    expect(r.text).toContain(
      `Function complexity too high in ${VUE} (worst function 12, max 10)`
    );
    expect(r.unread).toBe(false);
  });

  it('Code Duplication Control: the two equal bodies of the script', async () => {
    const r = await judge(c => CodeDuplicationControlLaw.check(c));
    expect(r.text).toContain(VUE);
    expect(r.unread).toBe(false);
  });

  it.each([
    [
      'Dead Code Elimination',
      (c: LawCheckContext) => DeadCodeEliminationLaw.check(c),
    ],
    [
      'Observable Cleanup Requirements',
      (c: LawCheckContext) => ObservableCleanupLaw.check(c),
    ],
    [
      'Typed HTTP Boundaries',
      (c: LawCheckContext) => TypedHttpBoundariesLaw.check(c),
    ],
    [
      'Code Documentation Standards',
      (c: LawCheckContext) => CodeDocumentationLaw.check(c),
    ],
  ] as const)(
    '%s scans .vue too, so it gets no "not read" note',
    async (_, check) => {
      expect((await judge(check)).unread).toBe(false);
    }
  );
});
