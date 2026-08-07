import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { EnvironmentParityStandardsLaw } from '../../src/checkers/deployment-laws/environment-parity-standards';
import { AutomatedCodeQualityGatesLaw } from '../../src/laws/deployment/automated-code-quality-gates';
import { PreDeploymentChecklistLaw } from '../../src/laws/deployment/pre-deployment-checklist';
import { PrePrQualityGatesLaw } from '../../src/laws/deployment/pre-pr-quality-gates';
import { PerformanceMonitoringStandardsLaw } from '../../src/laws/performance/performance-monitoring-standards';
import { FileUtils } from '../../src/utils';

/**
 * Regression: a backend consumer, 2026-07-13.
 *
 * One WRONG INCENTIVE and five stack-blind detectors. The incentive is the
 * important one: the checklist law demanded 90% of the boxes be TICKED — in the
 * repository — so the only way to pass was to commit a checklist asserting you
 * had verified things you had not. A law that is passed by pre-ticking a
 * checklist teaches people to lie, and BE refused to lie. They were right.
 */
describe('a backend consumer: wrong incentives and stack blindness (v7.9.5)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const config = (): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => {
    const c = FileUtils.getMinimalDefaultConfig();
    c.project.type = 'python';
    return c;
  };

  const checklistViolations = async (): Promise<string[]> => {
    const result = await Promise.resolve(
      PreDeploymentChecklistLaw.check({ projectRoot: root, config: config() })
    );
    return (result.violations ?? []).filter(v => /CHECKLIST/i.test(v));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-incentive-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('Pre-Deployment Checklist: structure, never ticked boxes', () => {
    it('accepts our OWN generated template — every box unticked', async () => {
      // The law used to fail the very template it generates. An honest team
      // commits an unticked checklist; the boxes are ticked at deploy time.
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      write('PRE_DEPLOYMENT_CHECKLIST.md', template);

      expect(template).not.toMatch(/- \[x\]/i);
      await expect(checklistViolations()).resolves.toEqual([]);
    });

    it('fails a checklist with no rollback and no security steps', async () => {
      write(
        'PRE_DEPLOYMENT_CHECKLIST.md',
        '# Pre-Deployment\n\n## Build\n- [ ] Unit tests pass\n- [ ] Build compiles\n'
      );

      const violations = await checklistViolations();
      expect(violations.join(' ')).toContain('security');
      expect(violations.join(' ')).toContain('rollback');
    });

    it('fails a checklist that has headings but no steps at all', async () => {
      write('PRE_DEPLOYMENT_CHECKLIST.md', '# Pre-Deployment Checklist\n');

      await expect(checklistViolations()).resolves.not.toEqual([]);
    });

    it('never rewards a pre-ticked checklist over an honest one', async () => {
      const covering = (mark: string): string =>
        `# Pre-Deployment\n\n## Build & Tests\n- [${mark}] Unit tests pass\n\n## Security\n- [${mark}] Vulnerability scan complete\n\n## Rollback\n- [${mark}] Rollback plan verified\n`;

      write('PRE_DEPLOYMENT_CHECKLIST.md', covering(' '));
      const honest = await checklistViolations();

      write('PRE_DEPLOYMENT_CHECKLIST.md', covering('x'));
      const preTicked = await checklistViolations();

      // Ticking the boxes buys nothing, so there is nothing to gain by lying.
      expect(honest).toEqual([]);
      expect(preTicked).toEqual(honest);
    });
  });

  describe('Environment Parity: the contract, never the secrets', () => {
    it('accepts .env.example as the environment contract', () => {
      write('pyproject.toml', '[project]\nname="s"\nversion="0.1.0"\n');
      write('.env.example', 'DB_URL=postgres://user:pass@host/db\n');
      write('api/app.py', 'import os\nENV = os.environ.get("APP_ENV")\n');

      const result = EnvironmentParityStandardsLaw.check({
        projectRoot: root,
        config: config(),
      });

      // Never "commit .env.production" — that would be committing secrets.
      expect((result.violations ?? []).join(' ')).not.toMatch(
        /Insufficient environment files/i
      );
    });

    it('asks for .env.example — not for .env.production — when nothing is declared', () => {
      write('pyproject.toml', '[project]\nname="s"\nversion="0.1.0"\n');
      write('api/app.py', 'x = 1\n');

      const details = (
        EnvironmentParityStandardsLaw.check({
          projectRoot: root,
          config: config(),
        }).suggestions ?? []
      ).join(' ');

      expect(details).toContain('.env.example');
      expect(details).toMatch(/do NOT commit \.env\.production/i);
    });
  });

  describe('Quality gates speak Python', () => {
    const pythonProject = (): void => {
      write(
        'pyproject.toml',
        [
          '[project]',
          'name="svc"',
          'version="0.1.0"',
          '',
          '[build-system]',
          'requires = ["hatchling"]',
          '',
          '[tool.ruff.lint]',
          'select = ["ALL"]',
          '',
          '[tool.ruff.format]',
          'quote-style = "double"',
          '',
          '[tool.mypy]',
          'strict = true',
          '',
          '[tool.bandit]',
          'exclude_dirs = ["tests"]',
          '',
          '[tool.pytest.ini_options]',
          'addopts = "--cov=api --cov-fail-under=90"',
          '',
        ].join('\n')
      );
      write(
        '.pre-commit-config.yaml',
        'repos:\n  - repo: local\n    hooks:\n      - id: ruff\n      - id: mypy\n      - id: bandit\n      - id: pip-audit\n'
      );
      write('api/app.py', 'import os\nENV = os.environ.get("APP_ENV")\n');
    };

    it('accepts ruff + mypy + bandit as quality gates (no .eslintrc anywhere)', () => {
      pythonProject();

      const result = AutomatedCodeQualityGatesLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations).toEqual([]);
    });

    it('still fails a Python project with no linter, formatter or scanner', () => {
      write('pyproject.toml', '[project]\nname="bare"\nversion="0.1.0"\n');
      write('api/app.py', 'x = 1\n');

      const result = AutomatedCodeQualityGatesLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations?.length).toBeGreaterThan(0);
    });
  });

  describe('Branch protection: server-side hosts are not "missing" it', () => {
    it('does not demand a .github/ file from a Bitbucket repo', async () => {
      write('pyproject.toml', '[project]\nname="s"\nversion="0.1.0"\n');
      write('bitbucket-pipelines.yml', 'pipelines:\n  default:\n    - step:\n');
      write(
        '.git/config',
        '[remote "origin"]\n\turl = git@bitbucket.org:team/svc.git\n'
      );

      const result = await Promise.resolve(
        PrePrQualityGatesLaw.check({ projectRoot: root, config: config() })
      );

      expect((result.violations ?? []).join(' ')).not.toMatch(
        /branch protection/i
      );
    });
  });

  describe('Performance monitoring: a backend has no browser', () => {
    it('does not demand RUM or a Lighthouse budget from a service', async () => {
      write(
        'pyproject.toml',
        '[project]\nname="svc"\nversion="0.1.0"\ndependencies = ["prometheus_client"]\n'
      );
      write('api/app.py', 'from prometheus_client import Counter\n');
      write(
        'alerts.yml',
        'groups:\n  - name: svc\n    rules:\n      - alert: HighLatency\n'
      );

      const result = await PerformanceMonitoringStandardsLaw.check({
        projectRoot: root,
        config: config(),
      });

      const violations = (result.violations ?? []).join(' ');
      expect(violations).not.toMatch(/Real User Monitoring/i);
      expect(violations).not.toMatch(/Performance budget/i);
      expect(violations).not.toMatch(/Build performance/i);
    });

    it('still fails a service with no monitoring at all', async () => {
      write('pyproject.toml', '[project]\nname="bare"\nversion="0.1.0"\n');
      write('api/app.py', 'x = 1\n');

      const result = await PerformanceMonitoringStandardsLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations?.join(' ')).toMatch(
        /No performance monitoring tools configured/i
      );
    });
  });
});
