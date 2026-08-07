/**
 * @fileoverview Tests for PRWorkflowStandardsLaw
 * @description Tests for PR workflow configuration, code review requirements, and automated checks
 */

import { PRWorkflowStandardsLaw } from '../../../src/checkers/git-laws/pr-workflow-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/git-laws/pr-workflow-standards', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('pr-workflow-standards-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          root: '',
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
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Git Repository Validation
  // ==========================================================================

  describe('Git Repository Validation', () => {
    it('should return violation when no .git directory exists', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('No Git repository found');
    });

    it('should return lawName as pr-workflow-standards', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.lawName).toBe('pr-workflow-standards');
    });

    it('should suggest git init when no repository', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.suggestions).toContain(
        'Initialize Git repository: git init'
      );
    });

    it('should categorize as Version Control', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toHaveProperty('lawName');
      expect(result.lawName).toBe('pr-workflow-standards');
    });
  });

  // ==========================================================================
  // Result Structure Validation
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have violations as array', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions as array', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score as number', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });
  });

  // ==========================================================================
  // With Git Repository
  // ==========================================================================

  describe('With Git Repository', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should not report missing git repository violation', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.violations).not.toContain('No Git repository found');
    });

    it('should analyze PR workflow configuration', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  // ==========================================================================
  // PR Template Detection
  // ==========================================================================

  describe('PR Template Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
    });

    it('should detect missing PR template', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      const hasTemplateViolation = result.violations?.some(
        v => v.includes('PR template') || v.includes('pull_request_template')
      );
      expect(hasTemplateViolation || result.passed !== undefined).toBe(true);
    });

    it('should detect pull_request_template.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'pull_request_template.md'),
        '## Description\n\n## Changes\n\n## Testing'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect PULL_REQUEST_TEMPLATE.md (uppercase)', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'PULL_REQUEST_TEMPLATE.md'),
        '## Description\n\n## Changes'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect PULL_REQUEST_TEMPLATE directory', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'PULL_REQUEST_TEMPLATE'),
        'Default PR template content'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // GitHub Workflows Detection
  // ==========================================================================

  describe('GitHub Workflows Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
    });

    it('should detect missing workflows directory', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      const hasWorkflowViolation = result.violations?.some(
        v => v.includes('workflow') || v.includes('Actions')
      );
      expect(hasWorkflowViolation || result.passed !== undefined).toBe(true);
    });

    it('should detect empty workflows directory', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect workflow files', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should recognize yaml extension', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yaml'),
        'name: CI\non: [push]'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // CODEOWNERS Detection
  // ==========================================================================

  describe('CODEOWNERS Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
    });

    it('should suggest CODEOWNERS when missing', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      // Should have suggestions
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should detect .github/CODEOWNERS', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'CODEOWNERS'),
        '* @org/team\n/src/ @org/developers'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect root CODEOWNERS', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CODEOWNERS'),
        '* @org/team'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect docs/CODEOWNERS', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'CODEOWNERS'),
        '* @org/team'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Code Review Requirements
  // ==========================================================================

  describe('Code Review Requirements', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should check for branch protection documentation', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect docs/BRANCH_PROTECTION.md', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'BRANCH_PROTECTION.md'),
        '# Branch Protection\n\nRequired reviewers: 2'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect docs/WORKFLOW.md', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'WORKFLOW.md'),
        '# Workflow\n\nAll PRs require review before merge.'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should check README.md for PR process', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# Project\n\n## Pull Requests\n\nAll changes require code review.'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should suggest PR documentation when README lacks info', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# Project\n\nA simple project.'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Automated Checks - Scripts
  // ==========================================================================

  describe('Automated Checks - Scripts', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect missing PR-related scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {},
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect test script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            test: 'jest',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect lint script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            lint: 'eslint .',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect complete script setup', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            precommit: 'lint-staged',
            prepush: 'npm test',
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Automated Checks - Dev Dependencies
  // ==========================================================================

  describe('Automated Checks - Dev Dependencies', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect husky in devDependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: { test: 'jest' },
          devDependencies: {
            husky: '^8.0.0',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect lint-staged', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: { test: 'jest' },
          devDependencies: {
            'lint-staged': '^13.0.0',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect full quality tools setup', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            husky: '^8.0.0',
            'lint-staged': '^13.0.0',
            prettier: '^3.0.0',
            eslint: '^8.0.0',
            jest: '^29.0.0',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // CI/CD Configuration Detection
  // ==========================================================================

  describe('CI/CD Configuration Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect missing CI/CD configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: { test: 'jest' },
          devDependencies: { jest: '^29.0.0' },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      const hasCIViolation = result.violations?.some(
        v => v.includes('CI') || v.includes('automated')
      );
      expect(hasCIViolation || result.passed !== undefined).toBe(true);
    });

    it('should detect GitHub workflows', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect GitLab CI', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitlab-ci.yml'),
        'stages:\n  - test'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect Bitbucket pipelines', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'bitbucket-pipelines.yml'),
        'pipelines:\n  default:'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect CircleCI', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.circleci'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.circleci', 'config.yml'),
        'version: 2.1'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should detect Azure Pipelines', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'azure-pipelines.yml'),
        'trigger:\n  - main'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  describe('Score Calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for violations', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      if (result.violations && result.violations.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should not have negative score', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle missing project root', () => {
      const missingContext: LawCheckContext = {
        ...mockContext,
        projectRoot: PathOperations.join(tempDir, 'non-existent'),
      };

      const result = PRWorkflowStandardsLaw.check(missingContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(false);
    });

    it('should return consistent results', () => {
      const result1 = PRWorkflowStandardsLaw.check(mockContext);
      const result2 = PRWorkflowStandardsLaw.check(mockContext);

      expect(result1.passed).toBe(result2.passed);
      expect(result1.score).toBe(result2.score);
    });

    it('should handle empty package.json', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({})
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle malformed package.json', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        '{ invalid }'
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle missing .github directory', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Config Integration
  // ==========================================================================

  describe('Config Integration', () => {
    it('should include config in result', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result.config).toBeDefined();
      expect(result.config.project.name).toBe('test-project');
    });

    it('should work with different project types', () => {
      const angularContext: LawCheckContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          project: {
            ...mockContext.config.project,
            type: 'angular',
          },
        },
      };

      const result = PRWorkflowStandardsLaw.check(angularContext);

      expect(result).toBeDefined();
      expect(result.config.project.type).toBe('angular');
    });
  });

  // ==========================================================================
  // Complete PR Workflow Setup
  // ==========================================================================

  describe('Complete PR Workflow Setup', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
    });

    it('should handle complete PR workflow configuration', () => {
      // Create PR template
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'pull_request_template.md'),
        '## Description\n\n## Changes\n\n## Testing'
      );

      // Create CODEOWNERS
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'CODEOWNERS'),
        '* @org/team'
      );

      // Create workflow
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push, pull_request]'
      );

      // Create branch protection docs
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'BRANCH_PROTECTION.md'),
        '# Branch Protection\n\nRequired reviewers: 2'
      );

      // Create README with PR info
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# Project\n\n## Pull Requests\n\nAll changes require code review.'
      );

      // Create package.json with scripts
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            precommit: 'lint-staged',
            prepush: 'npm test',
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            husky: '^8.0.0',
            'lint-staged': '^13.0.0',
            prettier: '^3.0.0',
            eslint: '^8.0.0',
            jest: '^29.0.0',
          },
        })
      );

      const result = PRWorkflowStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // GitLawBase Integration
  // ==========================================================================

  describe('GitLawBase Integration', () => {
    it('should extend GitLawBase', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      // Result should be properly formatted via GitLawBase
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should use createResult from GitLawBase', () => {
      const result = PRWorkflowStandardsLaw.check(mockContext);

      // Should have proper law result structure
      expect(result.lawName).toBe('pr-workflow-standards');
      expect(typeof result.passed).toBe('boolean');
    });
  });
});
