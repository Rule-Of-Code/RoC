import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { DatabaseQueryOptimizationLaw } from '../../src/laws/performance/database-query-optimization';
import { BundleAnalysisAnalyzerService } from '../../src/laws/performance/bundle-optimization-strategy/services/bundle-analysis.analyzer';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { FileUtils } from '../../src/utils';

describe('duplicate law entries, database evidence and bundle policy', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-dup-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * Two laws that cannot disagree are one law wearing two names. Each duplicate
   * consumed a slot in the count the liveness floor is measured against, so the
   * floor a project trusted was higher than the number of distinct checks
   * protecting it.
   *
   * Four pairs existed. All four were declared in our own detectionLimits —
   * written down instead of fixed.
   */
  describe('no law declares itself a duplicate of another', () => {
    it('carries no detectionLimits entry admitting redundancy', () => {
      const admissions = ModularLawsRegistry.getAll().filter(law =>
        (law.detectionLimits ?? []).some((limit: string) =>
          /REDUNDANT law entry|duplicate law entry|Runs the SAME detector/i.test(
            limit
          )
        )
      );

      expect(admissions.map(law => law.name)).toEqual([]);
    });

    it.each([
      ['Advanced Bundle Optimization Policy'],
      ['Extended Core Web Vitals Compliance'],
      ['NgRx State Structure Patterns'],
      ['Extended Performance Monitoring Standards'],
    ])('%s is retired, and its twin remains', retired => {
      const names = ModularLawsRegistry.getAll().map(law => law.name);

      expect(names).not.toContain(retired);
    });

    it.each([
      ['Bundle Optimization Strategy Policy'],
      ['Core Web Vitals Compliance'],
      ['NgRx State Normalization Mandate'],
      ['Performance Monitoring Standards'],
    ])('%s is the surviving entry', kept => {
      const names = ModularLawsRegistry.getAll().map(law => law.name);

      expect(names).toContain(kept);
    });
  });

  /**
   * A database layer is proved by USE, not by a dependency name. `firebase` is
   * a meta-package covering Auth, Analytics, Messaging and more, and the old
   * substring test also matched unrelated packages such as
   * `@capacitor-firebase/authentication`.
   */
  describe('a database layer is proved by use', () => {
    it('says nothing to a client that only signs users in', async () => {
      write(
        'package.json',
        JSON.stringify({
          name: 'client',
          dependencies: {
            firebase: '^11',
            '@capacitor-firebase/authentication': '^7',
          },
        })
      );
      write(
        'src/app.ts',
        [
          "import { initializeApp } from 'firebase/app';",
          "import { getAuth, signInWithPopup } from 'firebase/auth';",
          'initializeApp({});',
        ].join('\n')
      );

      const result = await DatabaseQueryOptimizationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('still judges a project that opens Firestore', async () => {
      write(
        'package.json',
        JSON.stringify({ name: 'app', dependencies: { firebase: '^11' } })
      );
      write(
        'src/db.ts',
        [
          "import { getFirestore, collection } from 'firebase/firestore';",
          'const db = getFirestore();',
        ].join('\n')
      );

      const result = await DatabaseQueryOptimizationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      expect((result.violations ?? []).length).toBeGreaterThan(0);
    });

    /**
     * The substrate is scanned through the project's own file discovery, so a
     * file the analysis will never read cannot prove the substrate either.
     * Otherwise a repository whose only Firestore mention is a test fixture —
     * this one included — answers for query batching it does not perform.
     */
    it('says nothing when the only mention is in a test fixture', async () => {
      write('package.json', JSON.stringify({ name: 'app' }));
      write('src/app.ts', 'export const x = 1;');
      write(
        'src/app.spec.ts',
        [
          "import { getFirestore } from 'firebase/firestore';",
          'it("documents the shape", () => { getFirestore(); });',
        ].join('\n')
      );

      const result = await DatabaseQueryOptimizationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    /** A name that is merely listed is not a name that is imported. */
    it('says nothing to a script that only lists database packages', async () => {
      write('package.json', JSON.stringify({ name: 'tooling' }));
      write(
        'src/audit-deps.ts',
        "export const KNOWN_ORMS = ['mongoose', 'typeorm', 'knex'];\n"
      );

      const result = await DatabaseQueryOptimizationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('still judges a project that imports an ORM', async () => {
      write('package.json', JSON.stringify({ name: 'api' }));
      write(
        'src/db.ts',
        "import mongoose from 'mongoose';\nexport const c = mongoose.connect;\n"
      );

      const result = await DatabaseQueryOptimizationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      expect((result.violations ?? []).length).toBeGreaterThan(0);
    });

    it('still judges a project that ships an ORM schema', async () => {
      write('package.json', JSON.stringify({ name: 'api' }));
      write('src/index.ts', 'export const x = 1;');
      write('prisma/schema.prisma', 'model User { id Int @id }');

      const result = await DatabaseQueryOptimizationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      expect((result.violations ?? []).length).toBeGreaterThan(0);
    });
  });

  /**
   * On the esbuild builder there is no webpack analyzer to install and no
   * reason to install one. Budgets in the build configuration are where such a
   * project states its bundle policy — and the build fails on them, so it is an
   * enforced one.
   */
  describe('declared budgets count as a bundle-size policy', () => {
    const nxProject = (production: Record<string, unknown>): void => {
      write('package.json', JSON.stringify({ name: 'w' }));
      write('nx.json', '{}');
      write(
        'apps/web/project.json',
        JSON.stringify({
          name: 'web',
          targets: { build: { configurations: { production } } },
        })
      );
    };

    it('accepts budgets declared in the build configuration', () => {
      nxProject({
        budgets: [
          { type: 'initial', maximumWarning: '500kb', maximumError: '1mb' },
        ],
      });

      expect(BundleAnalysisAnalyzerService.analyze(root).isSetup).toBe(true);
    });

    it('still reports a project with neither a tool nor a budget', () => {
      nxProject({});

      expect(BundleAnalysisAnalyzerService.analyze(root).isSetup).toBe(false);
    });

    it('accepts an analyzer for a non-webpack bundler', () => {
      write(
        'package.json',
        JSON.stringify({
          name: 'w',
          devDependencies: { 'esbuild-visualizer': '^0.7' },
        })
      );

      expect(BundleAnalysisAnalyzerService.analyze(root).isSetup).toBe(true);
    });
  });
});