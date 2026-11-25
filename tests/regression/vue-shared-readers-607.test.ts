/**
 * #607, P2 — the shared readers read a `.vue` file as its script view: the
 * TypeScript parse (TsxSource), the code-quality source view (readSource)
 * and CodeText. A law that scans for `.vue` and reads through them judges the
 * script of a single-file component at its own lines, and the template is not
 * taken for code. Any other file is read as before.
 */
import fs from 'fs';
import path from 'path';

import { readSource } from '../../src/checkers/code-quality-laws/source-view';
import { FileUtils } from '../../src/utils';
import { CodeText } from '../../src/utils/code-text';
import { DirectoryScanner } from '../../src/utils/directory-scanner';
import { loadTypeScript, TsxSource } from '../../src/utils/react/tsx-source';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import {
  markupText,
  parseInput,
  scriptText,
} from '../../src/utils/vue/vue-sfc';
import { makeTempDir } from '../helpers/temp-dirs';

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

/** A component whose template holds text that looks like code. */
const SFC = lines(
  '<template>', //                                          1
  '  <p>{{ value as unknown as string }} console.log(x)</p>', // 2
  '</template>', //                                         3
  '<script setup lang="ts">', //                            4
  "import { ref } from 'vue';", //                          5
  'const value = ref(1);', //                               6
  'const cast = value as unknown as string;', //            7
  "// a comment: 'as unknown as' here is prose", //         8
  '</script>' //                                            9
);

const ts = loadTypeScript(process.cwd());

const linesOf = (text: string, needle: string): number[] =>
  text.split('\n').flatMap((line, i) => (line.includes(needle) ? [i + 1] : []));

describe('#607 P2 the shared readers read .vue as its script', () => {
  it('parseInput: a .vue file is its script view, named by its lang; others unchanged', () => {
    expect(parseInput('List.vue', SFC).fileName).toBe('List.vue.ts');
    expect(parseInput('List.vue', SFC).text).not.toContain('<p>');
    expect(parseInput('a.ts', 'const a = 1;')).toEqual({
      fileName: 'a.ts',
      text: 'const a = 1;',
    });
  });

  it('TsxSource parses the script, lines as in the file, template not seen', () => {
    expect(ts).not.toBeNull();
    if (!ts) return;
    const source = TsxSource.parse(ts, 'List.vue', SFC);
    expect(source.parseErrors()).toEqual([]);
    const casts: number[] = [];
    source.walk(node => {
      if (ts.isAsExpression(node) && ts.isAsExpression(node.expression)) {
        casts.push(source.lineOf(node));
      }
    });
    expect(casts).toEqual([7]);
    expect(source.imports().map(i => i.module)).toEqual(['vue']);
  });

  it('readSource: code and comments of the script only, at their lines', () => {
    if (!ts) return;
    const view = readSource(ts, SFC, 'List.vue');
    expect(linesOf(view.code, 'as unknown as')).toEqual([7]);
    expect(view.code).not.toContain('console.log');
    expect(view.comments.map(c => c.text)).toEqual([
      "// a comment: 'as unknown as' here is prose",
    ]);
  });

  it('CodeText.codeOnly reads the script of a .vue file', () => {
    const code = CodeText.codeOnly(SFC, 'List.vue');
    expect(code).toContain('const cast = value as unknown as string;');
    expect(code).not.toContain('console.log');
  });

  it('scriptText / markupText: the right view for a regex-reading law', () => {
    expect(linesOf(scriptText('List.vue', SFC), 'as unknown as')).toEqual([
      7, 8,
    ]);
    expect(linesOf(markupText('List.vue', SFC), 'as unknown as')).toEqual([2]);
    expect(scriptText('a.ts', 'x')).toBe('x');
    expect(markupText('a.html', '<p/>')).toBe('<p/>');
  });

  it('control: a .ts file is read as before', () => {
    if (!ts) return;
    const text = 'const a = 1 as unknown as string;\n';
    expect(readSource(ts, text, 'a.ts').code).toBe(text);
  });

  it('a law that scans .vue and reads through them finds it at its line, and gets no note', async () => {
    if (!ts) return;
    const root = makeTempDir('roc-vue607p2-');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'List.vue'), SFC);
    fs.writeFileSync(path.join(root, 'src', 'main.ts'), 'export {};\n');
    const { value: found, scope } = await runLawScope(() =>
      DirectoryScanner.scanForFiles(root, FileUtils.getMinimalDefaultConfig(), [
        '.ts',
        '.vue',
      ]).flatMap(file =>
        linesOf(
          readSource(ts, fs.readFileSync(file, 'utf8'), file).code,
          'as unknown as'
        ).map(line => `${path.basename(file)}:${line}`)
      )
    );
    expect(found).toEqual(['List.vue:7']);
    expect(vueNotReadNote(scope, ['src/List.vue'])).toBeNull();
  });
});
