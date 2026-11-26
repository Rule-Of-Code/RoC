/**
 * #607, P3b — Defensive Array Coercion, No Passthrough Cast and Guard
 * Function Has Production Caller read `.vue` single-file components by their
 * script. A finding in a component's `<script setup>` is reported at its line;
 * text in the template that looks like code is not code; a guard that only a
 * component calls has a production caller; and none of the three gets the
 * "not read" note.
 */
import fs from 'fs';
import path from 'path';

import { DefensiveArrayCoercionLaw } from '../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoPassthroughCastLaw } from '../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { GuardFunctionHasProductionCallerLaw } from '../../src/checkers/integrity-laws/guard-function-has-production-caller';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { makeTempDir } from '../helpers/temp-dirs';

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

/** A data-access component: a raw array mapped unguarded, a typed HTTP call, a cast json body. */
const PANEL = lines(
  '<template>', //                                                    1
  '  <p>{{ raw.items.map(i => i) }} api.get<Order>(url)</p>', //      2
  '</template>', //                                                   3
  '<script setup lang="ts">', //                                      4
  'interface RawOrders { items: unknown[] }', //                      5
  'interface Order { id: string }', //                                6
  'declare const api: { get<T>(url: string): Promise<T> };', //       7
  'function names(raw: RawOrders) {', //                              8
  '  return raw.items.map(x => String(x));', //                       9
  '}', //                                                            10
  "const order = api.get<Order>('/orders/1');", //                   11
  'async function load(res: Response) {', //                         12
  '  return (await res.json()) as Order;', //                        13
  '}', //                                                            14
  'names({ items: [] }); load(new Response()); void order;', //      15
  '</script>' //                                                     16
);

function vueProject(files: Record<string, string>): LawCheckContext {
  const root = makeTempDir('roc-vue607p3b-');
  const all: Record<string, string> = {
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0' },
      devDependencies: { vite: '^7.0.0', typescript: '^5.9.3' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return { projectRoot: root, config: FileUtils.getMinimalDefaultConfig() };
}

async function judge(
  context: LawCheckContext,
  vue: string[],
  check: (c: LawCheckContext) => LawResult | Promise<LawResult>
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(context));
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, vue) !== null,
  };
}

const PANEL_PATH = 'src/data-access/OrdersPanel.vue';

describe('#607 P3b the FE-architecture and integrity laws read .vue', () => {
  it('Defensive Array Coercion: the unguarded map in the script, at its line', async () => {
    const r = await judge(
      vueProject({ [PANEL_PATH]: PANEL }),
      [PANEL_PATH],
      c => DefensiveArrayCoercionLaw.check(c)
    );
    expect(r.violations).toEqual([
      expect.stringMatching(
        new RegExp(
          `^${PANEL_PATH.replace(/[/.]/g, '\\$&')}:9: unguarded array method on raw\\.items`
        )
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('No Passthrough Cast: the typed call and the cast json body of the script, not the template', async () => {
    const r = await judge(
      vueProject({ [PANEL_PATH]: PANEL }),
      [PANEL_PATH],
      c => NoPassthroughCastLaw.check(c)
    );
    expect(r.violations).toEqual([
      expect.stringContaining(`${PANEL_PATH}:11: http.get<Order>`),
      expect.stringContaining(
        `${PANEL_PATH}:13: the body of res.json() is relabelled as Order`
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('Guard Function Has Production Caller: a guard only a component calls has a caller', async () => {
    const r = await judge(
      vueProject({
        'src/guards.ts':
          'export function requireAdmin(user: { admin: boolean }): void {\n  if (!user.admin) throw new Error("forbidden");\n}\n',
        'src/components/AdminPanel.vue': lines(
          '<template><p>admin</p></template>',
          '<script setup lang="ts">',
          "import { requireAdmin } from '../guards';",
          'requireAdmin({ admin: true });',
          '</script>'
        ),
      }),
      ['src/components/AdminPanel.vue'],
      c => GuardFunctionHasProductionCallerLaw.check(c)
    );
    expect(r.violations).toEqual([]);
    expect(r.unread).toBe(false);
  });

  it('control: a guard nobody calls is still reported', async () => {
    const r = await judge(
      vueProject({
        'src/guards.ts':
          'export function requireAdmin(user: { admin: boolean }): void {\n  if (!user.admin) throw new Error("forbidden");\n}\n',
        'src/components/AdminPanel.vue':
          '<template><p>{{ requireAdmin }}</p></template>\n<script setup lang="ts">const a = 1;</script>\n',
      }),
      ['src/components/AdminPanel.vue'],
      c => GuardFunctionHasProductionCallerLaw.check(c)
    );
    expect(r.violations).toEqual([
      expect.stringMatching(
        /^src\/guards\.ts:1: requireAdmin is exported as a guard/
      ),
    ]);
  });
});
