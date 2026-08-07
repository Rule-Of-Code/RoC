/**
 * @fileoverview Tests for UnitTestAutomationStandardsConstants
 * @description Test automation standards constants and utilities
 */
import { UnitTestAutomationStandardsConstants } from '../../../src/laws/testing/unit-test-automation-standards/constants/automation';

describe('UnitTestAutomationStandardsConstants', () => {
  describe('TEST_SCRIPT_PATTERNS', () => {
    it('should include test script', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS
      ).toContain('test');
    });

    it('should include test:unit script', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS
      ).toContain('test:unit');
    });

    it('should include test:watch script', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS
      ).toContain('test:watch');
    });

    it('should include test:e2e script', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS
      ).toContain('test:e2e');
    });

    it('should include test:ci script', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS
      ).toContain('test:ci');
    });

    it('should have 5 script patterns', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS
      ).toHaveLength(5);
    });
  });

  describe('TEST_RUNNER_CONFIG_PATTERNS', () => {
    it('should have JEST_CONFIG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.JEST_CONFIG.test(
          'jest.config.js'
        )
      ).toBe(true);
    });

    it('should have MOCHA_CONFIG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.MOCHA_CONFIG.test(
          '.mocharc'
        )
      ).toBe(true);
    });

    it('should have VITEST_CONFIG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.VITEST_CONFIG.test(
          'vitest.config.js'
        )
      ).toBe(true);
    });

    it('should have KARMA_CONFIG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.KARMA_CONFIG.test(
          'karma.config.js'
        )
      ).toBe(true);
    });

    it('should have PLAYWRIGHT_CONFIG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.PLAYWRIGHT_CONFIG.test(
          'playwright.config.ts'
        )
      ).toBe(true);
    });

    it('should have CYPRESS_CONFIG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.CYPRESS_CONFIG.test(
          'cypress.config.js'
        )
      ).toBe(true);
    });
  });

  describe('TEST_RUNNER_DEPENDENCIES', () => {
    it('should include jest', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toContain('jest');
    });

    it('should include mocha', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toContain('mocha');
    });

    it('should include vitest', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toContain('vitest');
    });

    it('should include karma', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toContain('karma');
    });

    it('should include playwright', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toContain('playwright');
    });

    it('should include cypress', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toContain('cypress');
    });

    it('should have 6 dependencies', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toHaveLength(6);
    });
  });

  describe('CICD_CONFIG_FILES', () => {
    it('should include GitHub workflows', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        '.github/workflows'
      );
    });

    it('should include GitLab CI', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        '.gitlab-ci.yml'
      );
    });

    it('should include Bitbucket Pipelines', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        'bitbucket-pipelines.yml'
      );
    });

    it('should include Azure Pipelines', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        'azure-pipelines.yml'
      );
    });

    it('should include Jenkinsfile', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        'Jenkinsfile'
      );
    });

    it('should include CircleCI', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        '.circleci/config.yml'
      );
    });

    it('should include Travis CI', () => {
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toContain(
        '.travis.yml'
      );
    });
  });

  describe('CICD_PATTERNS', () => {
    it('should have GITHUB_ACTIONS pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.CICD_PATTERNS.GITHUB_ACTIONS.test(
          '.github/workflows'
        )
      ).toBe(true);
    });

    it('should have GITLAB_CI pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.CICD_PATTERNS.GITLAB_CI.test(
          '.gitlab-ci.yml'
        )
      ).toBe(true);
    });

    it('should have BITBUCKET_PIPELINES pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.CICD_PATTERNS.BITBUCKET_PIPELINES.test(
          'bitbucket-pipelines.yml'
        )
      ).toBe(true);
    });

    it('should have JENKINS pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.CICD_PATTERNS.JENKINS.test(
          'Jenkinsfile'
        )
      ).toBe(true);
    });
  });

  describe('AUTOMATED_TEST_PATTERNS', () => {
    it('should have NPM_TEST pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.AUTOMATED_TEST_PATTERNS.NPM_TEST.test(
          'npm test'
        )
      ).toBe(true);
      expect(
        UnitTestAutomationStandardsConstants.AUTOMATED_TEST_PATTERNS.NPM_TEST.test(
          'npm run test'
        )
      ).toBe(true);
    });

    it('should have YARN_TEST pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.AUTOMATED_TEST_PATTERNS.YARN_TEST.test(
          'yarn test'
        )
      ).toBe(true);
    });

    it('should have PNPM_TEST pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.AUTOMATED_TEST_PATTERNS.PNPM_TEST.test(
          'pnpm test'
        )
      ).toBe(true);
    });

    it('should have JEST_COMMAND pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.AUTOMATED_TEST_PATTERNS.JEST_COMMAND.test(
          'jest'
        )
      ).toBe(true);
    });
  });

  describe('TEST_ENVIRONMENT_PATTERNS', () => {
    it('should have JEST_SETUP pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_ENVIRONMENT_PATTERNS.JEST_SETUP.test(
          'jest.setup.js'
        )
      ).toBe(true);
    });

    it('should have TEST_SETUP pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_ENVIRONMENT_PATTERNS.TEST_SETUP.test(
          'test.setup.ts'
        )
      ).toBe(true);
    });

    it('should have ENV_TEST pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_ENVIRONMENT_PATTERNS.ENV_TEST.test(
          '.env.test'
        )
      ).toBe(true);
    });

    it('should have FIXTURES pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.TEST_ENVIRONMENT_PATTERNS.FIXTURES.test(
          'fixtures'
        )
      ).toBe(true);
      expect(
        UnitTestAutomationStandardsConstants.TEST_ENVIRONMENT_PATTERNS.FIXTURES.test(
          '__mocks__'
        )
      ).toBe(true);
    });
  });

  describe('PARALLELIZATION_PATTERNS', () => {
    it('should have PARALLEL_FLAG pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.PARALLELIZATION_PATTERNS.PARALLEL_FLAG.test(
          '--parallel'
        )
      ).toBe(true);
      expect(
        UnitTestAutomationStandardsConstants.PARALLELIZATION_PATTERNS.PARALLEL_FLAG.test(
          '--maxWorkers'
        )
      ).toBe(true);
    });

    it('should have JEST_MAX_WORKERS pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.PARALLELIZATION_PATTERNS.JEST_MAX_WORKERS.test(
          'maxWorkers: 4'
        )
      ).toBe(true);
    });

    it('should have CI_WORKERS pattern', () => {
      expect(
        UnitTestAutomationStandardsConstants.PARALLELIZATION_PATTERNS.CI_WORKERS.test(
          '--workers=4'
        )
      ).toBe(true);
      expect(
        UnitTestAutomationStandardsConstants.PARALLELIZATION_PATTERNS.CI_WORKERS.test(
          '--jobs=4'
        )
      ).toBe(true);
    });
  });

  describe('hasTestScripts', () => {
    it('should return true when test script exists', () => {
      const packageJson = { scripts: { test: 'jest' } };
      expect(
        UnitTestAutomationStandardsConstants.hasTestScripts(packageJson)
      ).toBe(true);
    });

    it('should return true when test:unit script exists', () => {
      const packageJson = { scripts: { 'test:unit': 'jest' } };
      expect(
        UnitTestAutomationStandardsConstants.hasTestScripts(packageJson)
      ).toBe(true);
    });

    it('should return true when test:ci script exists', () => {
      const packageJson = { scripts: { 'test:ci': 'jest --ci' } };
      expect(
        UnitTestAutomationStandardsConstants.hasTestScripts(packageJson)
      ).toBe(true);
    });

    it('should return false when no test scripts', () => {
      const packageJson = {
        scripts: { build: 'webpack', start: 'node app.js' },
      };
      expect(
        UnitTestAutomationStandardsConstants.hasTestScripts(packageJson)
      ).toBe(false);
    });

    it('should return false when no scripts object', () => {
      const packageJson = { name: 'test-project' };
      expect(
        UnitTestAutomationStandardsConstants.hasTestScripts(packageJson)
      ).toBe(false);
    });
  });

  describe('hasCICDConfig', () => {
    it('should return true for GitHub Actions', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasCICDConfig(
          '.github/workflows/test.yml'
        )
      ).toBe(true);
    });

    it('should return true for GitLab CI', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasCICDConfig('.gitlab-ci.yml')
      ).toBe(true);
    });

    it('should return true for Bitbucket Pipelines', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasCICDConfig(
          'bitbucket-pipelines.yml'
        )
      ).toBe(true);
    });

    it('should return false for non-CI/CD content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasCICDConfig('package.json')
      ).toBe(false);
    });
  });

  describe('hasAutomatedTests', () => {
    it('should return true for npm test', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasAutomatedTests('npm test')
      ).toBe(true);
    });

    it('should return true for yarn test', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasAutomatedTests('yarn test')
      ).toBe(true);
    });

    it('should return true for jest command', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasAutomatedTests(
          'run jest --coverage'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasAutomatedTests('npm install')
      ).toBe(false);
    });
  });

  describe('hasTestEnvironment', () => {
    it('should return true for jest.setup content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasTestEnvironment('jest.setup.js')
      ).toBe(true);
    });

    it('should return true for fixtures content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasTestEnvironment('fixtures/')
      ).toBe(true);
    });

    it('should return true for __mocks__ content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasTestEnvironment('__mocks__/')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasTestEnvironment('src/app.ts')
      ).toBe(false);
    });
  });

  describe('hasParallelization', () => {
    it('should return true for --parallel flag', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasParallelization('--parallel')
      ).toBe(true);
    });

    it('should return true for maxWorkers', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasParallelization('maxWorkers: 4')
      ).toBe(true);
    });

    it('should return false for non-parallel content', () => {
      expect(
        UnitTestAutomationStandardsConstants.hasParallelization(
          'jest --coverage'
        )
      ).toBe(false);
    });
  });

  describe('getAutomationLevel', () => {
    it('should return EXCELLENT for all true', () => {
      expect(
        UnitTestAutomationStandardsConstants.getAutomationLevel(
          true,
          true,
          true,
          true
        )
      ).toBe('EXCELLENT');
    });

    it('should return CRITICAL for 3 true', () => {
      expect(
        UnitTestAutomationStandardsConstants.getAutomationLevel(
          true,
          true,
          true,
          false
        )
      ).toBe('CRITICAL');
    });

    it('should return CRITICAL for 2 true', () => {
      expect(
        UnitTestAutomationStandardsConstants.getAutomationLevel(
          true,
          true,
          false,
          false
        )
      ).toBe('CRITICAL');
    });

    it('should return CRITICAL for 1 true', () => {
      expect(
        UnitTestAutomationStandardsConstants.getAutomationLevel(
          true,
          false,
          false,
          false
        )
      ).toBe('CRITICAL');
    });

    it('should return CRITICAL for all false', () => {
      expect(
        UnitTestAutomationStandardsConstants.getAutomationLevel(
          false,
          false,
          false,
          false
        )
      ).toBe('CRITICAL');
    });
  });

  describe('getScoreDeduction', () => {
    it('should return 0 for EXCELLENT', () => {
      expect(
        UnitTestAutomationStandardsConstants.getScoreDeduction('EXCELLENT')
      ).toBe(0);
    });

    it('should return 10 for GOOD', () => {
      expect(
        UnitTestAutomationStandardsConstants.getScoreDeduction('GOOD')
      ).toBe(10);
    });

    it('should return 25 for ACCEPTABLE', () => {
      expect(
        UnitTestAutomationStandardsConstants.getScoreDeduction('ACCEPTABLE')
      ).toBe(25);
    });

    it('should return 50 for POOR', () => {
      expect(
        UnitTestAutomationStandardsConstants.getScoreDeduction('POOR')
      ).toBe(50);
    });

    it('should return 75 for CRITICAL', () => {
      expect(
        UnitTestAutomationStandardsConstants.getScoreDeduction('CRITICAL')
      ).toBe(75);
    });

    it('should return 0 for unknown level', () => {
      expect(
        UnitTestAutomationStandardsConstants.getScoreDeduction('UNKNOWN')
      ).toBe(0);
    });
  });

  describe('immutability', () => {
    it('should have consistent TEST_SCRIPT_PATTERNS', () => {
      const original = [
        ...UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS,
      ];
      expect(UnitTestAutomationStandardsConstants.TEST_SCRIPT_PATTERNS).toEqual(
        original
      );
    });

    it('should have consistent TEST_RUNNER_DEPENDENCIES', () => {
      const original = [
        ...UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES,
      ];
      expect(
        UnitTestAutomationStandardsConstants.TEST_RUNNER_DEPENDENCIES
      ).toEqual(original);
    });

    it('should have consistent CICD_CONFIG_FILES', () => {
      const original = [
        ...UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES,
      ];
      expect(UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES).toEqual(
        original
      );
    });
  });
});
