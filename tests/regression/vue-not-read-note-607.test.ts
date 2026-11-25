/**
 * #607, P0 — until the laws read `.vue` single-file components, a law that
 * scans for script files and leaves `.vue` out says so instead of passing in
 * silence. The shared scanner reports each scan to the law's own scope
 * (AsyncLocalStorage), so laws that run in parallel are told apart; the
 * engine turns such a scan in a project with `.vue` files into a `notRead`
 * note, and into "judged nothing" when the `.vue` files are all the script
 * there is.
 */
import fs from 'fs';
import path from 'path';

import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { FileUtils } from '../../src/utils';
import { DirectoryScanner } from '../../src/utils/directory-scanner';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { makeTempDir } from '../helpers/temp-dirs';

function project(files: Record<string, string>): string {
  const root = makeTempDir('roc-vue607-');
  for (const [rel, content] of Object.entries(files)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return root;
}

const VUE_APP = {
  'package.json': JSON.stringify({ dependencies: { vue: '^3.5.0' } }),
  'src/main.ts': "import { createApp } from 'vue';\n",
  'src/App.vue': '<template><p>hi</p></template>\n',
  'src/components/Counter.vue':
    '<script setup lang="ts">const n = 1;</script>\n',
};

const config = () => FileUtils.getMinimalDefaultConfig();
/** Yield to the other law: both scopes are open at once. */
const tick = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

/** The engine, with the step under test reachable. */
const auditorFor = (root: string): Auditor => {
  // Reached as an untyped value: executeSingleLaw is private.
  const auditor: unknown = new RuleOfCodeAuditor({}, root);
  return auditor as Auditor;
};

type Auditor = {
  executeSingleLaw: (law: unknown) => Promise<{
    passed?: boolean;
    notRead?: string[];
    judgedNothing?: boolean;
    score?: number;
  }>;
};

describe('#607 P0: a scan for script files that leaves .vue out is said', () => {
  it('two laws in parallel: only the one that scanned .ts gets the note', async () => {
    const root = project(VUE_APP);
    const [scans, other] = await Promise.all([
      runLawScope(async () => {
        await tick();
        return DirectoryScanner.scanForFiles(root, config(), ['.ts']);
      }),
      runLawScope(async () => {
        await tick();
        return DirectoryScanner.scanForFiles(root, config(), ['.json']);
      }),
    ]);
    const vue = ['src/App.vue', 'src/components/Counter.vue'];
    expect(vueNotReadNote(scans.scope, vue)?.note).toBe(
      '.vue single-file components were not read: 2 file(s) (src/App.vue, src/components/Counter.vue) — this law reads .ts/.js only so far (#607)'
    );
    expect(vueNotReadNote(other.scope, vue)).toBeNull();
  });

  it('a law whose scan asks for .vue too is taken to read it', async () => {
    const root = project(VUE_APP);
    const { scope } = await runLawScope(() =>
      DirectoryScanner.scanForFiles(root, config(), ['.ts', '.vue'])
    );
    expect(vueNotReadNote(scope, ['src/App.vue'])).toBeNull();
  });

  it('a scan outside any law scope notes nothing', () => {
    const root = project(VUE_APP);
    expect(() =>
      DirectoryScanner.scanForFiles(root, config(), ['.ts'])
    ).not.toThrow();
  });

  describe('through the engine', () => {
    const scanTs = (root: string) => () => {
      DirectoryScanner.scanForFiles(root, config(), ['.ts', '.tsx']);
      return { passed: true, violations: [], score: 100 };
    };

    it('a Vue project with .ts files too: notRead, not passed', async () => {
      const root = project(VUE_APP);
      const auditor = auditorFor(root);
      const result = await auditor.executeSingleLaw({
        id: 'v1',
        name: 'Scans TS',
        check: scanTs(root),
      });
      expect(result.passed).toBe(false);
      expect(result.judgedNothing).toBeUndefined();
      expect(result.notRead).toEqual([
        expect.stringMatching(
          /^\.vue single-file components were not read: 2 file\(s\)/
        ),
      ]);
    });

    it('only .vue files: the law judged nothing', async () => {
      const root = project({
        'package.json': VUE_APP['package.json'],
        'src/App.vue': VUE_APP['src/App.vue'],
      });
      const auditor = auditorFor(root);
      const result = await auditor.executeSingleLaw({
        id: 'v2',
        name: 'Scans TS',
        check: scanTs(root),
      });
      expect(result.passed).toBe(false);
      expect(result.judgedNothing).toBe(true);
      expect(result.score).toBe(0);
      expect(result.notRead?.[0]).toMatch(/nothing was judged$/);
    });

    it('control: no .vue file in the project — unchanged', async () => {
      const root = project({
        'package.json': '{}',
        'src/main.ts': 'export const a = 1;\n',
      });
      const auditor = auditorFor(root);
      const result = await auditor.executeSingleLaw({
        id: 'v3',
        name: 'Scans TS',
        check: scanTs(root),
      });
      expect(result.passed).toBe(true);
      expect(result.notRead).toBeUndefined();
    });

    it('control: a law that scans no script files — unchanged', async () => {
      const root = project(VUE_APP);
      const auditor = auditorFor(root);
      const result = await auditor.executeSingleLaw({
        id: 'v4',
        name: 'Reads config',
        check: () => {
          DirectoryScanner.scanForFiles(root, config(), ['.json']);
          return { passed: true, violations: [], score: 100 };
        },
      });
      expect(result.passed).toBe(true);
      expect(result.notRead).toBeUndefined();
    });

    it('a law keeps its own notRead notes; the .vue note is added after them', async () => {
      const root = project(VUE_APP);
      const auditor = auditorFor(root);
      const result = await auditor.executeSingleLaw({
        id: 'v5',
        name: 'Scans TS',
        check: () => {
          DirectoryScanner.scanForFiles(root, config(), ['.ts']);
          return {
            passed: false,
            violations: [],
            score: 100,
            notRead: ['tsconfig.json could not be parsed — NOT read'],
          };
        },
      });
      expect(result.notRead).toEqual([
        'tsconfig.json could not be parsed — NOT read',
        expect.stringMatching(/^\.vue single-file components were not read/),
      ]);
    });
  });
});
