/**
 * Tests for CicdConstitutionalTribunalLaw
 *
 * Comprehensive tests for CI/CD constitutional tribunal validation
 */
import { CicdConstitutionalTribunalLaw } from '../../../src/laws/deployment/cicd-constitutional-tribunal';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CicdConstitutionalTribunalLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('cicd-tribunal-test-');
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
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have fixable property', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should report no CI/CD pipeline for empty project', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).toContain(
        'No CI/CD pipeline configuration found'
      );
    });
  });

  describe('with CI/CD pipeline files', () => {
    it('should detect GitHub Actions CI workflow', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No CI/CD pipeline configuration found'
      );
    });

    it('should detect GitHub Actions main workflow', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'main.yml'),
        'name: Main\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No CI/CD pipeline configuration found'
      );
    });

    it('should detect GitLab CI', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitlab-ci.yml'),
        'stages:\n  - build\n  - test\nbuild:\n  script: npm run build'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No CI/CD pipeline configuration found'
      );
    });

    it('should detect Azure Pipelines', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'azure-pipelines.yml'),
        'trigger:\n  - main\npool:\n  vmImage: ubuntu-latest'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No CI/CD pipeline configuration found'
      );
    });

    it('should detect Bitbucket Pipelines', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'bitbucket-pipelines.yml'),
        'pipelines:\n  default:\n    - step:\n        script:\n          - npm test'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No CI/CD pipeline configuration found'
      );
    });

    it('should detect Jenkinsfile', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'Jenkinsfile'),
        'pipeline {\n  agent any\n  stages {\n    stage("Build") {\n      steps {\n        sh "npm run build"\n      }\n    }\n  }\n}'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No CI/CD pipeline configuration found'
      );
    });
  });

  describe('with constitutional checks', () => {
    it('should detect ruleofcode in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  check:\n    steps:\n      - run: npm run ruleofcode'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing constitutional compliance validation'
      );
    });

    it('should detect constitutional checks in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  constitutional:\n    steps:\n      - run: npm run constitutional:check'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing constitutional compliance validation'
      );
    });

    it('should detect compliance check in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  compliance:\n    steps:\n      - run: npm run compliance-check'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing constitutional compliance validation'
      );
    });
  });

  describe('with quality gates', () => {
    it('should detect lint in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  lint:\n    steps:\n      - run: npm run lint'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing quality gates'
      );
    });

    it('should detect eslint in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  check:\n    steps:\n      - run: npx eslint .'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing quality gates'
      );
    });

    it('should detect test coverage in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  test:\n    steps:\n      - run: npm run test:coverage'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing quality gates'
      );
    });

    it('should detect sonar in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  analysis:\n    steps:\n      - uses: sonarsource/sonarcloud-github-action@master'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing quality gates'
      );
    });
  });

  describe('with security scanning', () => {
    it('should detect npm audit in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  security:\n    steps:\n      - run: npm audit'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing security scanning'
      );
    });

    it('should detect snyk in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  security:\n    steps:\n      - uses: snyk/actions/node@master'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing security scanning'
      );
    });

    it('should detect codeql in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  codeql:\n    steps:\n      - uses: github/codeql-action/analyze@v2'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing security scanning'
      );
    });

    it('should detect vulnerability scan in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  security:\n    steps:\n      - run: npm run vulnerability-scan'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'CI/CD pipeline missing security scanning'
      );
    });
  });

  describe('with approval process', () => {
    it('should detect approval gates', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  deploy:\n    environment:\n      name: production\n      require-approval: true'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Consider adding approval gates for production deployments'
      );
    });

    it('should detect manual trigger', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non:\n  workflow_dispatch:\n    inputs:\n      manual-trigger: true'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Consider adding approval gates for production deployments'
      );
    });
  });

  describe('with rollback capabilities', () => {
    it('should detect rollback in pipeline', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  deploy:\n    steps:\n      - run: npm run rollback'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Implement automated rollback capabilities'
      );
    });

    it('should detect blue-green strategy', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  deploy:\n    strategy: blue-green'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Implement automated rollback capabilities'
      );
    });

    it('should detect canary deployment', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  deploy:\n    strategy: canary'
      );
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Implement automated rollback capabilities'
      );
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for missing pipeline', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative score', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('message generation', () => {
    it('should include emoji in message', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.message).toMatch(/[✅⚠️]/);
    });

    it('should indicate CI/CD Constitutional Tribunal in message', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.message).toContain('CI/CD Constitutional Tribunal');
    });

    it('should indicate no pipeline when missing', () => {
      const result = CicdConstitutionalTribunalLaw.check(mockContext);
      expect(result.message).toContain('No CI/CD pipeline found');
    });
  });
});
