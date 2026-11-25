/**
 * #607, P1 — a `.vue` single-file component split into a script view and a
 * template view that keep the file's offsets and line breaks.
 */
import {
  scriptFileName,
  scriptView,
  sfcBlocks,
  templateView,
} from '../../../src/utils/vue/vue-sfc';
import { loadTypeScript, TsxSource } from '../../../src/utils/react/tsx-source';

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

const SFC = lines(
  '<template>', //                                   1
  '  <ul>', //                                        2
  '    <template v-for="item in items" :key="item">', // 3
  '      <li @click="pick(item)">{{ item }}</li>', //  4
  '    </template>', //                               5
  '  </ul>', //                                       6
  '</template>', //                                   7
  '', //                                              8
  '<!-- <script>const notCode = 1;</script> -->', //  9
  '<script lang="ts">', //                           10
  "export default { name: 'List' };", //            11
  '</script>', //                                    12
  '', //                                             13
  '<script setup lang="ts">', //                     14
  "import { ref } from 'vue';", //                   15
  'const items = ref<string[]>([]);', //             16
  'function pick(item: string): void { console.log(item); }', // 17
  '</script>', //                                    18
  '', //                                             19
  '<style scoped>', //                               20
  '.x { color: red; }', //                           21
  '</style>' //                                      22
);

const lineOf = (text: string, needle: string): number =>
  text.slice(0, text.indexOf(needle)).split('\n').length;

describe('#607 P1 Vue SFC views', () => {
  it('finds the top-level blocks only, with lang and setup', () => {
    const blocks = sfcBlocks(SFC).map(({ kind, lang, setup }) => ({
      kind,
      lang,
      setup,
    }));
    expect(blocks).toEqual([
      { kind: 'template', lang: null, setup: false },
      { kind: 'script', lang: 'ts', setup: false },
      { kind: 'script', lang: 'ts', setup: true },
      { kind: 'style', lang: null, setup: false },
    ]);
  });

  it('the views keep the file length and every line break', () => {
    for (const view of [scriptView(SFC), templateView(SFC)]) {
      expect(view).toHaveLength(SFC.length);
      expect(view.split('\n')).toHaveLength(SFC.split('\n').length);
    }
  });

  it('the script view holds both script blocks, each on its own lines', () => {
    const view = scriptView(SFC);
    expect(lineOf(view, "name: 'List'")).toBe(11);
    expect(lineOf(view, 'console.log(item)')).toBe(17);
    expect(view).not.toContain('<li');
    expect(view).not.toContain('color: red');
    expect(view).not.toContain('notCode'); // a block in an HTML comment
    expect(view).not.toContain('<script');
  });

  it('the template view ends at its own closing tag, past a nested <template>', () => {
    const view = templateView(SFC);
    expect(lineOf(view, '@click="pick(item)"')).toBe(4);
    expect(lineOf(view, '</template>')).toBe(5); // the nested one, kept
    expect(view).not.toContain("name: 'List'");
    expect(view).not.toContain('console.log');
  });

  it('the script view parses as TypeScript, positions and lines as in the file', () => {
    const ts = loadTypeScript(process.cwd());
    expect(ts).not.toBeNull();
    if (!ts) return;
    const view = scriptView(SFC);
    const source = TsxSource.parse(ts, scriptFileName('List.vue', SFC), view);
    expect(source.parseErrors()).toEqual([]);
    let consoleLine = 0;
    source.walk(node => {
      if (
        ts.isCallExpression(node) &&
        node.getText().startsWith('console.log')
      ) {
        consoleLine = source.lineOf(node);
      }
    });
    expect(consoleLine).toBe(17);
  });

  it('scriptFileName: the lang decides how the script is parsed', () => {
    const one = (attrs: string): string =>
      scriptFileName('A.vue', `<script${attrs}>const a = 1;</script>\n`);
    expect(one('')).toBe('A.vue.js');
    expect(one(' lang="ts"')).toBe('A.vue.ts');
    expect(one(" lang='tsx'")).toBe('A.vue.tsx');
    expect(one(' lang="jsx"')).toBe('A.vue.jsx');
    expect(
      scriptFileName(
        'A.vue',
        '<script>export default {};</script>\n<script setup lang="ts">const a: number = 1;</script>\n'
      )
    ).toBe('A.vue.ts');
  });

  it('an unclosed <!-- inside a script string does not swallow the rest', () => {
    const text = lines(
      '<script>',
      "const marker = '<!--';",
      '</script>',
      '<template><p>hi</p></template>'
    );
    expect(sfcBlocks(text).map(block => block.kind)).toEqual([
      'script',
      'template',
    ]);
    expect(templateView(text)).toContain('<p>hi</p>');
  });

  it('a file with no blocks gives blank views of the same shape', () => {
    const text = 'just text\nno blocks\n';
    expect(sfcBlocks(text)).toEqual([]);
    expect(scriptView(text)).toBe('         \n         \n');
  });
});
