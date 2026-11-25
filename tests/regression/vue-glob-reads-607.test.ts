/**
 * #607, P2b — a law's own glob read for script files is reported like a
 * shared scan: the measurement laws' `readProjectFiles` and the laws that
 * judge the files of their gate (`readFilesContaining`). In a project with
 * `.vue` files such a law gets the P0 note unless its globs ask for `.vue`.
 */
import fs from 'fs';
import path from 'path';

import { readProjectFiles } from '../../src/checkers/measurement-laws/project-text-files';
import { readFilesContaining } from '../../src/utils/files-containing';
import {
  globExtensions,
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { makeTempDir } from '../helpers/temp-dirs';

function project(): string {
  const root = makeTempDir('roc-vue607p2b-');
  const files: Record<string, string> = {
    'src/api.ts': 'export const get = () => fetch("/x");\n',
    'src/App.vue':
      '<script setup lang="ts">const r = await fetch("/y");</script>\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return root;
}
const VUE = ['src/App.vue'];

describe('#607 P2b a glob read for script files that leaves .vue out is said', () => {
  it('globExtensions reads the extensions of a pattern', () => {
    expect(globExtensions('**/*.ts')).toEqual(['.ts']);
    expect(globExtensions('src/**/*.{ts, tsx,vue}')).toEqual([
      '.ts',
      '.tsx',
      '.vue',
    ]);
    expect(globExtensions('**/*')).toEqual([]);
    expect(globExtensions('package.json')).toEqual([]);
  });

  it('readProjectFiles with a script glob: the law gets the note', async () => {
    const root = project();
    const { value, scope } = await runLawScope(() =>
      readProjectFiles(root, ['**/*.ts'])
    );
    expect(value.map(file => file.rel)).toEqual(['src/api.ts']);
    expect(vueNotReadNote(scope, VUE)?.judgedNothing).toBe(false);
  });

  it('readProjectFiles with .vue in the glob: no note', async () => {
    const root = project();
    const { scope } = await runLawScope(() =>
      readProjectFiles(root, ['**/*.{ts,vue}'])
    );
    expect(vueNotReadNote(scope, VUE)).toBeNull();
  });

  it('readProjectFiles for docs only: no note', async () => {
    const root = project();
    const { scope } = await runLawScope(() =>
      readProjectFiles(root, ['**/*.md'])
    );
    expect(vueNotReadNote(scope, VUE)).toBeNull();
  });

  it('readFilesContaining with script globs, inside a law: the note', async () => {
    const root = project();
    const { value, scope } = await runLawScope(() =>
      readFilesContaining(root, {
        files: ['**/*.{ts,tsx,js,jsx}'],
        pattern: 'fetch\\(',
      })
    );
    expect(value.map(file => file.rel)).toEqual(['src/api.ts']);
    expect(vueNotReadNote(scope, VUE)).not.toBeNull();
  });

  it('readFilesContaining outside a law (the selection gate): notes nothing', () => {
    const root = project();
    expect(() =>
      readFilesContaining(root, { files: ['**/*.ts'], pattern: 'fetch' })
    ).not.toThrow();
  });
});
