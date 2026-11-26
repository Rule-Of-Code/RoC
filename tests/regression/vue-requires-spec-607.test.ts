/**
 * #607, P6 — Requires Spec reads Vue single-file components. A large `.vue`
 * component in the feature layer without a co-located test is reported; a
 * `Basket.spec.ts` next to `Basket.vue` covers it; `X-Control-Pass` in a small
 * component's script makes it money-adjacent, the same text in its template
 * does not. No ".vue not read" note.
 */
import { RequiresSpecLaw } from '../../src/checkers/fe-architecture-laws/requires-spec';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

/** A component of `lines` lines: a template, then a script that fills the rest. */
const component = (lines: number, script: string[] = []): string => {
  const head = ['<template>', '  <p>{{ total }}</p>', '</template>'];
  const body = ['<script setup lang="ts">', ...script];
  const filler = Array.from(
    { length: Math.max(0, lines - head.length - body.length - 1) },
    (_, i) => `const v${i} = ${i};`
  );
  return [...head, ...body, ...filler, '</script>'].join('\n');
};

const vueProject = (files: Record<string, string>): string =>
  project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    ...files,
  });

async function judge(
  files: Record<string, string>,
  vue: string[]
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() =>
    RequiresSpecLaw.check(ctx(vueProject(files)))
  );
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, vue) !== null,
  };
}

const BASKET = 'src/feature-basket/Basket.vue';

describe('#607 P6 Requires Spec reads .vue components', () => {
  it('a 250-line component in the feature layer without a test is reported', async () => {
    const r = await judge({ [BASKET]: component(250) }, [BASKET]);
    expect(r.violations).toEqual([
      expect.stringMatching(
        /^src[\\/]feature-basket[\\/]Basket\.vue: 250 LOC \(> 200\) but has no co-located \*\.spec\.\* \/ \*\.test\.\*/
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('Basket.spec.ts next to Basket.vue covers it', async () => {
    const r = await judge(
      {
        [BASKET]: component(250),
        'src/feature-basket/Basket.spec.ts': "it('renders', () => {});\n",
      },
      [BASKET]
    );
    expect(r.violations).toEqual([]);
  });

  it('X-Control-Pass in the script makes a small component money-adjacent; in the template it does not', async () => {
    const pay = 'src/feature-pay/Pay.vue';
    const shown = 'src/feature-pay/Shown.vue';
    const r = await judge(
      {
        [pay]: component(20, [
          "const headers = { 'X-Control-Pass': '1' };",
          'void headers;',
        ]),
        [shown]:
          '<template><p>X-Control-Pass</p></template>\n<script setup lang="ts">const a = 1;</script>\n',
      },
      [pay, shown]
    );
    expect(r.violations).toEqual([
      expect.stringMatching(
        /^src[\\/]feature-pay[\\/]Pay\.vue: money-adjacent write service but has no co-located/
      ),
    ]);
  });
});
