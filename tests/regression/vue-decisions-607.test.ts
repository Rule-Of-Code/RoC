/**
 * #607, the founder's decisions:
 * (a) Angular Security XSS Prevention Policy reads a .vue file's script
 *     (an innerHTML assignment, at its line); Vue template v-html / :href are
 *     not read, and the card says so.
 * (c) A law whose subject is never a component declares it on its card
 *     (`notAboutComponents`, with the reason also in its detectionLimits); the
 *     engine gives such a law no ".vue not read" note. Every other law keeps
 *     the note.
 */
import fs from 'fs';
import path from 'path';

import { XSSPreventionLaw } from '../../src/checkers/security-laws/xss-prevention';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { FileUtils } from '../../src/utils';
import { DirectoryScanner } from '../../src/utils/directory-scanner';
import { makeTempDir } from '../helpers/temp-dirs';

function project(files: Record<string, string>): string {
  const root = makeTempDir('roc-vue607d-');
  for (const [rel, content] of Object.entries(files)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return root;
}

const VUE_APP = {
  'package.json': JSON.stringify({
    name: 'app',
    version: '1.0.0',
    dependencies: { vue: '^3.5.0' },
  }),
  'src/main.ts':
    "import { createApp } from 'vue';\nexport const app = createApp;\n",
  'src/App.vue': '<template><p>hi</p></template>\n',
};

type Auditor = {
  executeSingleLaw: (law: unknown) => Promise<{
    passed?: boolean;
    notRead?: string[];
  }>;
};
const auditorFor = (root: string): Auditor => {
  const auditor: unknown = new RuleOfCodeAuditor({}, root);
  return auditor as Auditor;
};
const VUE_NOTE = /^\.vue single-file components were not read/;

/** The laws whose subject is never a component (#607, decision 3). */
const NOT_ABOUT_COMPONENTS = [
  'API Security Testing Requirements',
  'API Testing Standards',
  'Comprehensive Security Testing Requirements',
  'No Focused Tests',
  'Perf Harness Matches Production',
  'Performance Test Requirements',
  'Project Structure Standards',
  'Test Data Management',
  'Test Documentation Requirements',
  'Test Isolation Enforcement',
  'Test Server Loopback Address Match',
  'Unit Test Quality Standards',
];

describe('#607 decision (a): Angular Security XSS reads a component script', () => {
  it('an innerHTML assignment in <script setup> is reported at its line; v-html and template text are not read', () => {
    const root = project({
      ...VUE_APP,
      'src/components/Note.vue': [
        '<template>', //                                                   1
        '  <div v-html="html"></div>', //                                  2
        '  <p>el.innerHTML = html; document.write(x)</p>', //              3
        '</template>', //                                                  4
        '<script setup lang="ts">', //                                     5
        'declare const html: string;', //                                  6
        "const el = document.getElementById('note') as HTMLElement;", //  7
        'el.innerHTML = html;', //                                         8
        '</script>', //                                                    9
        '',
      ].join('\n'),
    });
    const result = XSSPreventionLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^XSS risk in src[\\/]components[\\/]Note\.vue:8: innerHTML\/outerHTML assignment not sanitized at the sink/
      ),
    ]);
  });

  it('the card says Vue template v-html and :href are not read', () => {
    const card = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
      law => law.title === 'Angular Security XSS Prevention Policy'
    );
    expect(card?.detectionLimits?.join('\n')).toMatch(
      /Vue template v-html and :href bindings are not read \(#607\)/
    );
  });
});

describe('#607 decision (c): a law that is not about components gets no .vue note', () => {
  const scanTs = (root: string) => () => {
    DirectoryScanner.scanForFiles(root, FileUtils.getMinimalDefaultConfig(), [
      '.ts',
    ]);
    return { passed: true, message: 'ok', violations: [], score: 100 };
  };

  it('through the engine: a declared law has no note, the same law undeclared has it', async () => {
    const root = project(VUE_APP);
    const declared = await auditorFor(root).executeSingleLaw({
      id: 'd1',
      name: 'Reads test files',
      notAboutComponents: 'reads test files only',
      check: scanTs(root),
    });
    expect(declared.notRead ?? []).toEqual([]);
    expect(declared.passed).toBe(true);
    const undeclared = await auditorFor(root).executeSingleLaw({
      id: 'd2',
      name: 'Reads TS',
      check: scanTs(root),
    });
    expect(undeclared.notRead).toEqual([expect.stringMatching(VUE_NOTE)]);
  });

  it('exactly these cards declare it, each with the reason among its detectionLimits', () => {
    const declared = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
      law => law.notAboutComponents
    );
    expect(declared.map(law => law.title).sort()).toEqual(NOT_ABOUT_COMPONENTS);
    for (const law of declared) {
      expect(law.notAboutComponents).toMatch(
        /^Not about components \(#607\): /
      );
      expect(law.detectionLimits).toContain(law.notAboutComponents);
    }
  });

  it('the registry carries the declaration to the engine', () => {
    const fromRegistry = ModularLawsRegistry.getAll().filter(
      law => law.notAboutComponents
    );
    expect(fromRegistry.map(law => law.name).sort()).toEqual(
      NOT_ABOUT_COMPONENTS
    );
  });

  // The law that keeps the note was Memory Leak Prevention until it read
  // .vue (#12); Angular Lifecycle Management judges Angular classes only.
  it('real laws through the engine: Project Structure Standards has no note; Angular Lifecycle Management keeps it', async () => {
    const root = project({
      ...VUE_APP,
      'src/app.component.ts':
        "@Component({ selector: 'app-root', template: '' })\nexport class AppComponent {}\n",
    });
    const all = ModularLawsRegistry.getAll();
    const structure = all.find(
      law => law.name === 'Project Structure Standards'
    );
    const lifecycle = all.find(
      law => law.name === 'Angular Lifecycle Management'
    );
    const s = await auditorFor(root).executeSingleLaw(structure);
    expect((s.notRead ?? []).filter(n => VUE_NOTE.test(n))).toEqual([]);
    const m = await auditorFor(root).executeSingleLaw(lifecycle);
    expect((m.notRead ?? []).filter(n => VUE_NOTE.test(n))).toHaveLength(1);
  });

  it('No Focused Tests through the engine: a focused spec is found, and no .vue note', async () => {
    const root = project({
      ...VUE_APP,
      'package.json': JSON.stringify({
        name: 'app',
        version: '1.0.0',
        dependencies: { vue: '^3.5.0' },
        devDependencies: { vitest: '^3.2.0' },
      }),
      'src/components/Counter.spec.ts':
        "import { it } from 'vitest';\nit.only('counts', () => {});\n",
    });
    const law = ModularLawsRegistry.getAll().find(
      l => l.name === 'No Focused Tests'
    );
    const r = (await auditorFor(root).executeSingleLaw(law)) as {
      violations?: string[];
      notRead?: string[];
    };
    expect(r.violations).toEqual([
      expect.stringMatching(/src[\\/]components[\\/]Counter\.spec\.ts:2/),
    ]);
    expect((r.notRead ?? []).filter(n => VUE_NOTE.test(n))).toEqual([]);
  });
});
