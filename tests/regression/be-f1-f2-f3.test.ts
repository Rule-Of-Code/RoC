import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeReviewQualityLaw } from '../../src/checkers/git-laws/code-review-quality';
import { AutomatedCodeQualityGatesLaw } from '../../src/laws/deployment/automated-code-quality-gates';
import { PreDeploymentChecklistLaw } from '../../src/laws/deployment/pre-deployment-checklist';
import { FileUtils } from '../../src/utils';

/**
 * Regression: a backend consumer F1/F2/F3, verified by them in the code of v7.9.5.
 *
 * F2 is the one to remember: the law failed on SCORE while two of its deductions
 * emitted only suggestions — so a project was told "FAILED, score 90" with an
 * EMPTY violation list. A law that fails while listing nothing to fix is unusable.
 */
describe('a backend consumer F1/F2/F3 (v7.9.6)', () => {
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

  /** A Python service shaped like BE's: ruff + mypy + bandit, Flask, Prometheus. */
  const beService = (): void => {
    write(
      'pyproject.toml',
      [
        '[project]',
        'name="svc"',
        'version="0.1.0"',
        'dependencies = ["flask", "prometheus_client"]',
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
    write(
      'bitbucket-pipelines.yml',
      'pipelines:\n  default:\n    - step:\n        script:\n          - ruff check .\n          - pytest\n          - review\n'
    );
    write(
      'api/app.py',
      [
        'import logging, os',
        'from flask import Flask, abort',
        'from prometheus_client import Counter',
        '',
        'logging.config.dictConfig({"version": 1})',
        'app = Flask(__name__)',
        '',
        '@app.route("/api/health")',
        'def health():',
        '    return {"status": "ok"}, 200',
        '',
        '@app.route("/orders")',
        'def orders():',
        '    if not authorized():',
        '        abort(401)',
        '    return {}',
        '',
      ].join('\n')
    );
    write(
      'tests/test_api.py',
      'def test_health(client):\n    assert client.get("/api/health").status_code == 200\n'
    );
    write(
      'PRE_DEPLOYMENT_CHECKLIST.md',
      '# PD\n\n## Build & Tests\n- [ ] pytest passes\n\n## Security\n- [ ] bandit + pip-audit clean\n\n## Rollback\n- [ ] rollback plan verified\n'
    );
    write(
      'CONTRIBUTING.md',
      '# Contributing\n\n## Code Review\nEvery PR needs one approval and a green pipeline.\n'
    );
    write('PULL_REQUEST_TEMPLATE.md', '## What\n## Why\n## How tested\n');
    write(
      '.git/config',
      '[remote "origin"]\n\turl = git@bitbucket.org:team/svc.git\n'
    );
  };

  const bareService = (): void => {
    write('pyproject.toml', '[project]\nname="bare"\nversion="0.1.0"\n');
    write('api/app.py', 'x = 1\n');
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-f123-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('F1 — Code Review Quality sees ruff + mypy', () => {
    it('passes a Python service with ruff/mypy/bandit and review guidelines', async () => {
      beService();

      const result = CodeReviewQualityLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations).toEqual([]);
    });

    it('still fails a service with no tooling and no guidelines', async () => {
      bareService();

      const result = CodeReviewQualityLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations?.length).toBeGreaterThan(0);
    });
  });

  describe('F2 — a law never fails while listing nothing to fix', () => {
    it('does not fail on score alone when there are zero violations', async () => {
      beService();

      const result = AutomatedCodeQualityGatesLaw.check({
        projectRoot: root,
        config: config(),
      });

      // The score may sit below 100 (advisory deductions), but a law fails on
      // its VIOLATIONS. "FAILED, score 90, [0 violations]" is unusable.
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });

    it('never reports passed:false with an empty violation list', async () => {
      bareService();

      const result = AutomatedCodeQualityGatesLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.passed).toBe(false);
      expect(result.violations?.length).toBeGreaterThan(0);
    });
  });

  describe('F3 — the checklist law asks PythonSatisfaction', () => {
    it('does not claim "Health checks not configured" when /api/health is served', async () => {
      beService();

      const result = await PreDeploymentChecklistLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.violations).toEqual([]);
    });

    it('reports one build violation, in one wording', async () => {
      bareService();

      const result = await PreDeploymentChecklistLaw.check({
        projectRoot: root,
        config: config(),
      });
      const violations = (result.violations ?? []).filter(v =>
        /build validation/i.test(v)
      );

      // It used to run the same check twice and emit two wordings of one defect.
      expect(violations).toHaveLength(1);
    });

    it('still fails a bare service that has none of it', async () => {
      bareService();

      const result = await PreDeploymentChecklistLaw.check({
        projectRoot: root,
        config: config(),
      });

      expect(result.passed).toBe(false);
      expect(result.violations?.length).toBeGreaterThan(0);
    });
  });
});
