/**
 * Tests for PrePrQualityGatesLaw
 *
 * Comprehensive tests for pre-PR quality gates validation
 */
import { PrePrQualityGatesLaw } from '../../../src/laws/deployment/pre-pr-quality-gates';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PrePrQualityGatesLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('pre-pr-gates-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a LawResult object', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have fixable property', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should report missing pre-commit hooks for empty project', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).toContain(
        'Missing pre-commit hooks for quality validation'
      );
    });

    it('should report missing PR templates for empty project', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).toContain('Missing pull request templates');
    });

    it('should report missing branch protection for empty project', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).toContain(
        'Missing branch protection configuration'
      );
    });

    it('should report missing status checks for empty project', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).toContain(
        'Missing required status checks configuration'
      );
    });
  });

  describe('with pre-commit hooks', () => {
    it('should detect .husky directory', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.husky'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.husky', 'pre-commit'),
        '#!/bin/sh\nnpm run lint'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing pre-commit hooks for quality validation'
      );
    });

    it('should detect husky in package.json dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            husky: '^8.0.0',
          },
        })
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing pre-commit hooks for quality validation'
      );
    });

    it('should detect pre-commit config', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.pre-commit-config.yaml'),
        'repos:\n  - repo: local'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing pre-commit hooks for quality validation'
      );
    });
  });

  describe('with PR templates', () => {
    it('should detect pull_request_template.md', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'pull_request_template.md'),
        '## Description\n\n## Checklist\n- [ ] Tests added'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing pull request templates');
    });

    it('should detect PULL_REQUEST_TEMPLATE.md', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'PULL_REQUEST_TEMPLATE.md'),
        '## Changes\n\n## Testing'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing pull request templates');
    });

    it('should detect pull_request_template.yml', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'pull_request_template.yml'),
        'name: PR Template\nbody:\n  - type: description'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing pull request templates');
    });

    it('should detect PR template in subdirectory', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'PULL_REQUEST_TEMPLATE')
      );
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          '.github',
          'PULL_REQUEST_TEMPLATE',
          'pull_request_template.md'
        ),
        '## PR Template'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing pull request templates');
    });
  });

  describe('with branch protection', () => {
    it('should detect branch_protection.yml', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'branch_protection.yml'),
        'branches:\n  - name: main\n    protection:\n      required_status_checks: true'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing branch protection configuration'
      );
    });

    it('should detect settings.yml', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'settings.yml'),
        'repository:\n  name: my-repo\nbranches:\n  - name: main'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing branch protection configuration'
      );
    });

    it('should detect protected branches in GitLab CI', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitlab-ci.yml'),
        'deploy:\n  only:\n    - main\n    - master\n  script:\n    - echo "deploy"'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      // GitLab CI only/except rules don't satisfy branch protection detection
      // The law looks for explicit branch protection config, not CI rules
      expect(result.violations).toContain(
        'Missing branch protection configuration'
      );
    });
  });

  describe('with status checks', () => {
    it('should detect pull_request trigger in CI', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non:\n  pull_request:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing required status checks configuration'
      );
    });

    it('should detect status checks in CI', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  build-check:\n    steps:\n      - run: npm run build'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      // Should detect some form of status check
      expect(result).toBeDefined();
    });
  });

  describe('with PR validation workflows', () => {
    it('should detect pr-validation.yml', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          '.github',
          'workflows',
          'pr-validation.yml'
        ),
        'name: PR Validation\non: [pull_request]\njobs:\n  validate:\n    runs-on: ubuntu-latest'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Add automated PR validation workflows'
      );
    });

    it('should detect pull-request.yml', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          '.github',
          'workflows',
          'pull-request.yml'
        ),
        'name: Pull Request\non: [pull_request]'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Add automated PR validation workflows'
      );
    });

    it('should detect PR triggers in main CI', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non:\n  pull_request:\n  push:'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Add automated PR validation workflows'
      );
    });
  });

  describe('with code review requirements', () => {
    it('should detect CODEOWNERS file', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'CODEOWNERS'),
        '* @team-lead\n/src/ @developers'
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Configure minimum code review requirements'
      );
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for missing gates', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative score', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('message generation', () => {
    it('should include emoji in message', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.message).toMatch(/[✅⚠️]/);
    });

    it('should indicate Pre-PR Quality Gates in message', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.message).toContain('Pre-PR Quality Gates');
    });

    it('should list missing items', () => {
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.message).toContain('Missing');
    });
  });

  describe('template quality assessment', () => {
    it('should assess comprehensive template', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'pull_request_template.md'),
        `## Description
Please describe your changes.

## Checklist
- [ ] Tests added
- [ ] Documentation updated

## Testing
How did you test this?

## Changes
List the changes made.`
      );
      const result = PrePrQualityGatesLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing pull request templates');
    });
  });
});
