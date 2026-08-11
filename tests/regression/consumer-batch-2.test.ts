import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeDocumentationLaw } from '../../src/checkers/code-quality-laws/code-documentation';
import { DeploymentLawBase } from '../../src/checkers/deployment-laws/deployment-law-base';
import { HealthCheckMonitoringLaw } from '../../src/laws/deployment/health-check-monitoring';
import { MdFooterTemplateLaw } from '../../src/laws/documentation/md-footer-template';
import { CachingHeadersAnalyzerService } from '../../src/laws/performance/cdn-caching-strategy/services/caching-headers.analyzer';
import { CiCdDetector } from '../../src/utils/ci-cd-detector';
import { FileUtils } from '../../src/utils';
import { hasCiConfig } from '../../src/utils/project-discovery';

/**
 * Consumer reports against 7.18.0 — three of them against fixes shipped IN
 * 7.18.0. Each is pinned here against the input the reporter actually had, not
 * against the convenient one the original fix was proved with.
 */
describe('consumer batch 2', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const config = (
    extra: Record<string, unknown> = {}
  ): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => ({
    ...FileUtils.getMinimalDefaultConfig(),
    ...extra,
  });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-batch2-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * The rating check was rewritten in 7.18.0 to accept any declared scale, and
   * then proved against `Investment Rating: A`. Real footers bold the label.
   * `Rating:` matches INSIDE the bold span, so the capture was `** A` and every
   * letter-grade test failed on the asterisks — 83 of the reporter's 84 files.
   */
  describe('md-footer-template reads a rating through markdown emphasis', () => {
    const footer = (rating: string): string =>
      [
        '# Doc',
        '',
        'Body.',
        '',
        '---',
        '',
        '**Document Version:** 1.0',
        '**Last Updated:** August 10, 2026',
        '**Status:** Current',
        `**Investment Rating:** ${rating}`,
        '',
      ].join('\n');

    it.each([['A'], ['B+'], ['C-'], ['8/10'], ['needs-review']])(
      'accepts a bolded label with rating %s',
      async rating => {
        write('README.md', footer(rating));

        const result = await MdFooterTemplateLaw.check({
          projectRoot: root,
          config: config(),
        });

        expect(
          (result.violations ?? []).some(v => /rating format/i.test(v))
        ).toBe(false);
      }
    );

    it('still reports a rating nobody can read', async () => {
      write('README.md', footer('¯\\_(ツ)_/¯'));

      const result = await MdFooterTemplateLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect((result.violations ?? []).some(v => /rating format/i.test(v))).toBe(
        true
      );
    });

    it('honours ignores for files the project did not author', async () => {
      write('README.md', footer('A'));
      // Scaffolded by Capacitor into ios/, never written by the team.
      write('ios/App/CapApp-SPM/README.md', '# Generated\n\nNo footer.\n');

      const ignored = config();
      ignored.ignores.global = ['ios/**'];

      const withIgnore = await MdFooterTemplateLaw.check({
        projectRoot: root,
        config: ignored,
      });
      const without = await MdFooterTemplateLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(
        (withIgnore.violations ?? []).some(v => /missing constitutional/i.test(v))
      ).toBe(false);
      expect(
        (without.violations ?? []).some(v => /missing constitutional/i.test(v))
      ).toBe(true);
    });
  });

  /**
   * `projectIsAService` returned true the moment a file named `health.ts`
   * existed. A browser client's readiness probe — which calls `GET /api/health`
   * and interprets the answer — lives in exactly such a file, and the law then
   * demanded an endpoint, a database and Kubernetes probes from a PWA.
   */
  describe('health-check-monitoring judges services, not filenames', () => {
    it('says nothing to a client that merely consumes /api/health', async () => {
      write(
        'package.json',
        JSON.stringify({ name: 'client', dependencies: { '@angular/core': '^22' } })
      );
      write(
        'src/health.ts',
        '// client-side readiness probe\nexport const probe = () => fetch("/api/health");'
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('still judges a Node service', async () => {
      write(
        'package.json',
        JSON.stringify({ name: 'api', dependencies: { express: '^4' } })
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations).toContain('Missing health check endpoints');
    });

    it('still judges a Python web service', async () => {
      write(
        'pyproject.toml',
        '[project]\nname = "api"\ndependencies = ["fastapi", "uvicorn"]\n'
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect((result.violations ?? []).length).toBeGreaterThan(0);
    });

    it('says nothing to a Python CLI', async () => {
      write(
        'pyproject.toml',
        '[project]\nname = "mytool"\ndependencies = ["click", "rich"]\n'
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations ?? []).toEqual([]);
    });
  });

  /**
   * Eight copies of the CI provider list existed: five inline in laws, one in
   * DeploymentLawBase, one in CiCdDetector, and one in project-discovery — which
   * was added AS the shared module without noticing CiCdDetector already was
   * one. There is one list now, and a project can declare a path no allowlist
   * could guess.
   */
  describe('CI discovery has one list and a declared escape hatch', () => {
    const cloudBuildOnly = (): void => {
      write('pyproject.toml', '[project]\nname = "svc"\n');
      write('infra/cloudbuild/gates.yaml', 'steps:\n  - name: pytest\n');
      write('infra/cloudbuild/release.yaml', 'steps:\n  - name: deploy\n');
    };

    it('cannot guess a Cloud Build config at an arbitrary path', () => {
      cloudBuildOnly();

      expect(hasCiConfig(root)).toBe(false);
    });

    it('finds it when the project declares where it lives', () => {
      cloudBuildOnly();
      const declared = { pathMappings: { cicdConfig: 'infra/cloudbuild/*.yaml' } };

      expect(hasCiConfig(root, declared)).toBe(true);
    });

    it('every entry point agrees, because there is one list', () => {
      cloudBuildOnly();
      const declared = { pathMappings: { cicdConfig: 'infra/cloudbuild/*.yaml' } };

      expect(CiCdDetector.hasAnyCiConfig(root, declared)).toBe(true);
      expect(
        DeploymentLawBase.hasCICDConfiguration(
          root,
          declared as unknown as ReturnType<
            typeof FileUtils.getMinimalDefaultConfig
          >
        )
      ).toBe(true);
    });

    it.each([
      ['cloudbuild.yaml'],
      ['.circleci/config.yml'],
      ['.drone.yml'],
      ['.travis.yml'],
      ['bitbucket-pipelines.yml'],
    ])('recognises %s without any declaration', file => {
      write(file, 'steps: []\n');

      expect(hasCiConfig(root)).toBe(true);
    });
  });

  /**
   * Every prose line of a JSDoc block begins with `*`, which is neither `//`
   * nor `/*`, so the per-line classifier counted it as code. A file with two
   * full doc blocks measured 3.6% commented where the honest figure was 38%.
   */
  describe('comment ratio counts a JSDoc block as comment', () => {
    const jsdocFile = [
      '/**',
      ' * The launch page.',
      ' * Explains what it coordinates.',
      ' */',
      'export class LaunchPage {',
      '  readonly ready = true;',
      '}',
    ].join('\n');

    it('counts continuation lines as comments, not code', () => {
      const counted = (
        CodeDocumentationLaw as unknown as {
          countLines: (c: string) => { codeLines: number; commentLines: number };
        }
      ).countLines(jsdocFile);

      expect(counted.commentLines).toBe(4);
      expect(counted.codeLines).toBe(3);
    });

    it('still counts ordinary code as code', () => {
      const counted = (
        CodeDocumentationLaw as unknown as {
          countLines: (c: string) => { codeLines: number; commentLines: number };
        }
      ).countLines('const a = 1;\nconst b = 2;\n// one comment\n');

      expect(counted.codeLines).toBe(2);
      expect(counted.commentLines).toBe(1);
    });

    it('closes the block on the same line for /* … */', () => {
      const counted = (
        CodeDocumentationLaw as unknown as {
          countLines: (c: string) => { codeLines: number; commentLines: number };
        }
      ).countLines('/* inline */\nconst a = 1;\n');

      expect(counted.commentLines).toBe(1);
      expect(counted.codeLines).toBe(1);
    });
  });

  /**
   * Firebase Hosting's `headers` entries hold an ARRAY of {key, value} — the
   * only shape `firebase deploy` accepts. Indexing an array by a header name is
   * undefined for every array, so no valid firebase.json could pass.
   */
  describe('Firebase caching headers are read as the array they are', () => {
    const firebase = (headers: unknown): void =>
      write('firebase.json', JSON.stringify({ hosting: { public: 'dist', headers } }));

    it('detects Cache-Control declared in Firebase schema', () => {
      firebase([
        {
          source: '**/*.@(js|css)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ]);

      expect(CachingHeadersAnalyzerService.analyze(root).configured).toBe(true);
    });

    it('still reports a config with no caching header at all', () => {
      firebase([
        { source: '**', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
      ]);

      expect(CachingHeadersAnalyzerService.analyze(root).configured).toBe(false);
    });

    it('accepts the dictionary shape other hosts use', () => {
      firebase([{ source: '**', headers: { 'Cache-Control': 'max-age=60' } }]);

      expect(CachingHeadersAnalyzerService.analyze(root).configured).toBe(true);
    });
  });
});