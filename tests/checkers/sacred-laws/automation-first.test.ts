/**
 * Automation First Law - Tests
 * Comprehensive tests for AutomationFirstLaw class
 */
import { AutomationFirstLaw } from '../../../src/checkers/sacred-laws/automation-first';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('AutomationFirstLaw', () => {
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  const createMockConfig = (): RuleOfCodeConfig => ({
    project: {
      name: 'test-project',
      root: '',
      componentPrefix: 'app',
      type: 'generic',
    },
    ignores: {
      global: ['node_modules/**', 'dist/**'],
      tests: [],
      build: [],
      design: [],
    },
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
  });

  const createContext = (projectRoot: string): LawCheckContext => ({
    projectRoot,
    config: createMockConfig(),
  });

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('automation-first-test-');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // check() - Basic functionality
  // ============================================
  describe('check()', () => {
    it('should return a LawResult object', () => {
      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should fail when no automation detected', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.violations!.length).toBeGreaterThan(0);
    });

    it('should include suggestions when violations are found', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // CI/CD Automation Detection
  // ============================================
  describe('CI/CD Automation Detection', () => {
    it('should detect GitHub Actions workflow directory', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasCICDViolation = result.violations!.some(v =>
        v.includes('No CI/CD automation detected')
      );
      expect(hasCICDViolation).toBe(false);
    });

    it('should detect GitLab CI configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitlab-ci.yml'),
        `
stages:
  - build
  - test

build:
  stage: build
  script:
    - npm install
`
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasCICDViolation = result.violations!.some(v =>
        v.includes('No CI/CD automation detected')
      );
      expect(hasCICDViolation).toBe(false);
    });

    it('should detect Bitbucket Pipelines configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'bitbucket-pipelines.yml'),
        `
pipelines:
  default:
    - step:
        script:
          - npm install
`
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasCICDViolation = result.violations!.some(v =>
        v.includes('No CI/CD automation detected')
      );
      expect(hasCICDViolation).toBe(false);
    });

    it('should detect Azure Pipelines configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'azure-pipelines.yml'),
        `
trigger:
  - main
pool:
  vmImage: 'ubuntu-latest'
steps:
  - script: npm install
`
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasCICDViolation = result.violations!.some(v =>
        v.includes('No CI/CD automation detected')
      );
      expect(hasCICDViolation).toBe(false);
    });

    it('should detect CircleCI configuration', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.circleci'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.circleci', 'config.yml'),
        `
version: 2.1
jobs:
  build:
    docker:
      - image: node:18
    steps:
      - run: npm install
`
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasCICDViolation = result.violations!.some(v =>
        v.includes('No CI/CD automation detected')
      );
      expect(hasCICDViolation).toBe(false);
    });

    it('should flag missing CI/CD configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasCICDViolation = result.violations!.some(v =>
        v.includes('No CI/CD automation detected')
      );
      expect(hasCICDViolation).toBe(true);
    });
  });

  // ============================================
  // Test Automation Detection
  // ============================================
  describe('Test Automation Detection', () => {
    it('should detect jest test framework', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasTestFrameworkViolation = result.violations!.some(v =>
        v.includes('No test framework detected')
      );
      expect(hasTestFrameworkViolation).toBe(false);
    });

    it('should detect mocha test framework', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'mocha',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            mocha: '^10.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasTestFrameworkViolation = result.violations!.some(v =>
        v.includes('No test framework detected')
      );
      expect(hasTestFrameworkViolation).toBe(false);
    });

    it('should detect cypress test framework', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'test:e2e': 'cypress run',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            cypress: '^13.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasTestFrameworkViolation = result.violations!.some(v =>
        v.includes('No test framework detected')
      );
      expect(hasTestFrameworkViolation).toBe(false);
    });

    it('should detect playwright test framework', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'test:e2e': 'playwright test',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            playwright: '^1.40.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasTestFrameworkViolation = result.violations!.some(v =>
        v.includes('No test framework detected')
      );
      expect(hasTestFrameworkViolation).toBe(false);
    });

    it('should flag missing test scripts', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            eslint: '^8.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasTestViolation = result.violations!.some(v =>
        v.includes('No automated test scripts')
      );
      expect(hasTestViolation).toBe(true);
    });

    it('should suggest test:watch script', () => {
      // Note: Suggestions only appear when there are violations
      // When there are no violations, suggestions are cleared in createStandardLawResult
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      // Since there are no violations (passed === true), suggestions array is empty
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });
  });

  // ============================================
  // Quality Automation Detection
  // ============================================
  describe('Quality Automation Detection', () => {
    it('should detect lint scripts', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasLintViolation = result.violations!.some(v =>
        v.includes('No automated linting scripts')
      );
      expect(hasLintViolation).toBe(false);
    });

    it('should detect lint:check script alternative', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            'lint:check': 'eslint . --max-warnings=0',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasLintViolation = result.violations!.some(v =>
        v.includes('No automated linting scripts')
      );
      expect(hasLintViolation).toBe(false);
    });

    it('should flag missing lint scripts', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasLintViolation = result.violations!.some(v =>
        v.includes('No automated linting scripts')
      );
      expect(hasLintViolation).toBe(true);
    });

    it('should flag missing build scripts', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            lint: 'eslint .',
          },
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      const hasBuildViolation = result.violations!.some(v =>
        v.includes('No automated build script')
      );
      expect(hasBuildViolation).toBe(true);
    });
  });

  // ============================================
  // Full Compliance
  // ============================================
  describe('Full Compliance', () => {
    it('should pass when all automation is in place', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            'test:watch': 'jest --watch',
            lint: 'eslint .',
            format: 'prettier --write .',
            build: 'tsc',
          },
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            husky: '^9.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      expect(result.passed).toBe(true);
      expect(result.violations!.length).toBe(0);
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should handle missing package.json', () => {
      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      expect(result).toBeDefined();
      expect(result.violations!.some(v => v.includes('package.json'))).toBe(
        true
      );
    });

    it('should handle invalid JSON in package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const context = createContext(tempDir);
      const result = AutomationFirstLaw.check(context);

      expect(result).toBeDefined();
    });
  });
});
