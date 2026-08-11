import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AutomatedCodeQualityGatesLaw } from '../../src/laws/deployment/automated-code-quality-gates';
import { HealthCheckMonitoringLaw } from '../../src/laws/deployment/health-check-monitoring';
import { PrePrQualityGatesLaw } from '../../src/laws/deployment/pre-pr-quality-gates';
import { MdFooterTemplateLaw } from '../../src/laws/documentation/md-footer-template';
import { AutomatedReviewToolsAnalyzerValidation } from '../../src/utils/git/automated-review-tools-analyzer/automated-review-tools-analyzer-validation';
import { FileUtils } from '../../src/utils';

describe('CI discovery, service detection and footer boundaries', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const baseConfig = (): ReturnType<typeof FileUtils.getMinimalDefaultConfig> =>
    FileUtils.getMinimalDefaultConfig();
  const declaringCi = (
    glob: string
  ): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => {
    const config = baseConfig();
    (config as { pathMappings?: unknown }).pathMappings = { cicdConfig: glob };
    return config;
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cifoot-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * Routing one CI helper through the shared discovery left three others with
   * their own hardcoded provider lists, so the same repository was recognised
   * by some laws and declared CI-less by others.
   */
  describe('every CI detector consults the same discovery', () => {
    const projectWithCiElsewhere = (): void => {
      write(
        'package.json',
        JSON.stringify({
          name: 'p',
          scripts: { lint: 'eslint .', build: 'tsc', test: 'jest' },
          devDependencies: { eslint: '^9', prettier: '^3', typescript: '^5' },
        })
      );
      write('.eslintrc.json', '{}');
      write('.prettierrc', '{}');
      write('tsconfig.json', '{}');
      write(
        'jest.config.js',
        'module.exports = { collectCoverage: true, coverageThreshold: { global: { lines: 80, statements: 80, branches: 80, functions: 80 } } };'
      );
      write(
        'infra/ci/gates.yaml',
        [
          'steps:',
          '  - name: lint',
          '  - name: format',
          '  - name: build',
          '  - name: security',
        ].join('\n')
      );
    };

    it('code review quality no longer claims there is no CI', () => {
      projectWithCiElsewhere();

      const result =
        AutomatedReviewToolsAnalyzerValidation.executeAutomatedReviewToolsAnalysisWorkflow(
          root,
          declaringCi('infra/ci/*.yaml')
        );

      expect(result.violations.some(v => /CI\/CD/i.test(v))).toBe(false);
    });

    it('quality gates read the declared pipeline for lint, build and security', () => {
      projectWithCiElsewhere();

      const result = AutomatedCodeQualityGatesLaw.check({
        projectRoot: root,
        config: declaringCi('infra/ci/*.yaml'),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('still reports a project whose pipeline it genuinely cannot find', () => {
      projectWithCiElsewhere();

      const result = AutomatedCodeQualityGatesLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect((result.violations ?? []).length).toBeGreaterThan(0);
    });

    it('counts a build script by its NAME, not only its command', () => {
      // `"build": "tsc"` is the conventional shape; only the commands were
      // scanned, so every toolchain whose binary is not spelled "build" looked
      // like a project with no build script.
      projectWithCiElsewhere();

      const gates = (
        AutomatedCodeQualityGatesLaw as unknown as {
          analyzeBuildGates: (r: string, c?: unknown) => { hasBuildGates: boolean };
        }
      ).analyzeBuildGates(root, declaringCi('infra/ci/*.yaml'));

      expect(gates.hasBuildGates).toBe(true);
    });

    it('accepts server-side required checks on a host that keeps them there', () => {
      projectWithCiElsewhere();
      execSync('git init -q', { cwd: root });
      fs.appendFileSync(
        path.join(root, '.git', 'config'),
        '\n[remote "origin"]\n\turl = git@bitbucket.org:team/repo.git\n'
      );

      const result = PrePrQualityGatesLaw.check({
        projectRoot: root,
        config: declaringCi('infra/ci/*.yaml'),
      });

      expect(
        (result.violations ?? []).some(v => /required status checks/i.test(v))
      ).toBe(false);
    });
  });

  /**
   * A framework in devDependencies is tooling, and a static-file server runs no
   * application code — neither makes a project a service that owes a health
   * endpoint, a database probe and Kubernetes manifests.
   */
  describe('a service is judged by what it runs, not by its tooling', () => {
    it('says nothing to a client that serves its own build for tests', async () => {
      write(
        'package.json',
        JSON.stringify({
          name: 'client',
          dependencies: { '@angular/core': '^19' },
          devDependencies: { 'http-server': '^14', playwright: '^1' },
        })
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('says nothing when a server framework is only a devDependency', async () => {
      write(
        'package.json',
        JSON.stringify({
          name: 'lib',
          dependencies: {},
          devDependencies: { express: '^4' },
        })
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('still judges a project that ships a server framework', async () => {
      write(
        'package.json',
        JSON.stringify({ name: 'api', dependencies: { express: '^4' } })
      );

      const result = await HealthCheckMonitoringLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect(result.violations).toContain('Missing health check endpoints');
    });
  });

  /**
   * The footer boundary matched the FIRST horizontal rule with no `m` flag, so
   * the lazy capture ran to end-of-file: a document using `---` as a section
   * divider had its whole body read as the footer, and the first line of prose
   * containing `Rating:` was judged as the rating.
   */
  describe('the footer is the block after the LAST horizontal rule', () => {
    const footerLines = [
      '**Document Version:** 1.0',
      '**Last Updated:** August 11, 2026',
      '**Status:** Current',
      '**Investment Rating:** A',
    ];

    it('ignores prose before the final rule that mentions a rating', async () => {
      write(
        'NOTES.md',
        [
          '# Notes',
          '',
          'Intro.',
          '',
          '---',
          '',
          '## A write-up',
          '',
          'The captured value was `**Investment Rating:** WRONG` — that was the defect.',
          '',
          '---',
          '',
          ...footerLines,
          '',
        ].join('\n')
      );

      const result = await MdFooterTemplateLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });

    it('still reports a document whose real footer rating is unreadable', async () => {
      write(
        'NOTES.md',
        [
          '# Notes',
          '',
          '---',
          '',
          'Body.',
          '',
          '---',
          '',
          '**Document Version:** 1.0',
          '**Last Updated:** August 11, 2026',
          '**Status:** Current',
          '**Investment Rating:** ¯\\_(ツ)_/¯',
          '',
        ].join('\n')
      );

      const result = await MdFooterTemplateLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect(
        (result.violations ?? []).some(v => /rating format/i.test(v))
      ).toBe(true);
    });

    it('reads a footer in a document with a single rule', async () => {
      write('NOTES.md', ['# Notes', '', '---', '', ...footerLines, ''].join('\n'));

      const result = await MdFooterTemplateLaw.check({
        projectRoot: root,
        config: baseConfig(),
      });

      expect(result.violations ?? []).toEqual([]);
    });
  });
});