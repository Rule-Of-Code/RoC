/**
 * #607, P7 — TODO Management Standards reads the comments of `.vue` single-file
 * components: the template as HTML, the script as TS/JS, the style as CSS (as
 * SCSS when a style block has a lang). Each marker at its own line; a marker in
 * template text or in a script string is not a comment; `//` is not a comment
 * in a plain `<style>`. No ".vue not read" note.
 */
import { TodoManagementStandardsLaw } from '../../src/laws/documentation/todo-management-standards';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const CART = 'src/components/Cart.vue';
const PLAIN = 'src/components/Plain.vue';

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

async function markers(
  files: Record<string, string>
): Promise<{ at: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() =>
    TodoManagementStandardsLaw.check(ctx(vueProject(files)))
  );
  return {
    at: (value.violationDetails ?? []).map(
      d =>
        `${d.file}:${d.line}: ${d.message.replace(/^.*?: (?=(TODO|FIXME))/, '')}`
    ),
    unread: vueNotReadNote(scope, Object.keys(files)) !== null,
  };
}

describe('#607 P7 TODO Management Standards reads .vue comments', () => {
  it('template, script and scss style comments, each at its line; text and strings are not comments', async () => {
    const r = await markers({
      [CART]: [
        '<template>', //                              1
        '  <!-- TODO: fix the layout -->', //         2
        '  <p>TODO: not a comment</p>', //            3
        '</template>', //                             4
        '<script setup lang="ts">', //                5
        '// FIXME: handle the error', //              6
        "const s = 'TODO: in a string';", //          7
        '</script>', //                               8
        '<style scoped lang="scss">', //              9
        '// TODO: tidy the colours', //              10
        '.a { color: red; }', //                     11
        '</style>', //                               12
        '',
      ].join('\n'),
    });
    expect(r.at).toEqual([
      `${CART}:2: TODO: fix the layout`,
      `${CART}:6: FIXME: handle the error`,
      `${CART}:10: TODO: tidy the colours`,
    ]);
    expect(r.unread).toBe(false);
  });

  it('a plain <style>: /* */ is a comment, // is not', async () => {
    const r = await markers({
      [PLAIN]: [
        '<template><p>hi</p></template>', //                         1
        '<style>', //                                                 2
        '.a { background: url(//cdn.example.org/x.png); } // TODO: no', // 3
        '/* TODO: yes */', //                                         4
        '</style>', //                                                5
        '',
      ].join('\n'),
    });
    expect(r.at).toEqual([`${PLAIN}:4: TODO: yes`]);
  });
});
