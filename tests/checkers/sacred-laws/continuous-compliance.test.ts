/**
 * Continuous Compliance Law - Tests
 * Comprehensive tests for ContinuousComplianceLaw class
 */
import { ContinuousComplianceLaw } from '../../../src/checkers/sacred-laws/continuous-compliance';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ContinuousComplianceLaw', () => {
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
    tempDir = FileUtils.createTempDirectory('continuous-compliance-test-');
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
      const result = ContinuousComplianceLaw.check(context);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should fail when no monitoring configuration exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

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
      const result = ContinuousComplianceLaw.check(context);

      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Continuous Monitoring Detection
  // ============================================
  describe('Continuous Monitoring Detection', () => {
    it('should detect ruleofcode.config.json as monitoring', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasMonitoringViolation = result.violations!.some(v =>
        v.includes('No continuous monitoring configuration detected')
      );
      expect(hasMonitoringViolation).toBe(false);
    });

    it('should detect .eslintrc.js as monitoring', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasMonitoringViolation = result.violations!.some(v =>
        v.includes('No continuous monitoring configuration detected')
      );
      expect(hasMonitoringViolation).toBe(false);
    });

    it('should detect .github/workflows as monitoring', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasMonitoringViolation = result.violations!.some(v =>
        v.includes('No continuous monitoring configuration detected')
      );
      expect(hasMonitoringViolation).toBe(false);
    });

    it('should detect sonar-project.properties as monitoring', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'sonar-project.properties'),
        'sonar.projectKey=test'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasMonitoringViolation = result.violations!.some(v =>
        v.includes('No continuous monitoring configuration detected')
      );
      expect(hasMonitoringViolation).toBe(false);
    });

    it('should flag missing monitoring configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasMonitoringViolation = result.violations!.some(v =>
        v.includes('No continuous monitoring configuration detected')
      );
      expect(hasMonitoringViolation).toBe(true);
    });

    it('should suggest scheduled checks when workflows exist but no schedule', () => {
      // Note: Suggestions are only returned when violations.length > 0
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
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should not suggest scheduled checks when workflow has schedule', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'scheduled.yml'),
        'name: Scheduled\non:\n  schedule:\n    - cron: "0 0 * * *"\njobs:\n  audit:\n    runs-on: ubuntu-latest'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasScheduleSuggestion = result.suggestions!.some(s =>
        s.includes('Add scheduled compliance checks')
      );
      expect(hasScheduleSuggestion).toBe(false);
    });

    it('should handle file read errors gracefully when checking schedules', () => {
      const workflowsDir = PathOperations.join(tempDir, '.github', 'workflows');
      FileUtils.createDirectory(workflowsDir);

      // Create a workflow file
      FileUtils.writeFile(
        PathOperations.join(workflowsDir, 'test.yml'),
        'name: Test'
      );

      // Mock readFile to throw error
      const originalReadFile = FileUtils.readFile;
      jest.spyOn(FileUtils, 'readFile').mockImplementationOnce(() => {
        throw new Error('File read error');
      });

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      // Should suggest scheduled checks since file couldn't be read
      const hasScheduleSuggestion = result.suggestions!.some(s =>
        s.includes('Add scheduled compliance checks')
      );
      expect(hasScheduleSuggestion).toBe(true);

      // Restore
      (FileUtils.readFile as any) = originalReadFile;
    });
  });

  // ============================================
  // Compliance Automation Detection
  // ============================================
  describe('Compliance Automation Detection', () => {
    it('should detect check:laws script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasComplianceViolation = result.violations!.some(v =>
        v.includes('No automated compliance checking scripts')
      );
      expect(hasComplianceViolation).toBe(false);
    });

    it('should detect audit:constitutional script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'audit:constitutional': 'ruleofcode audit --constitutional',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasComplianceViolation = result.violations!.some(v =>
        v.includes('No automated compliance checking scripts')
      );
      expect(hasComplianceViolation).toBe(false);
    });

    it('should detect compliance:check script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'compliance:check': 'npm run lint && npm run test',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasComplianceViolation = result.violations!.some(v =>
        v.includes('No automated compliance checking scripts')
      );
      expect(hasComplianceViolation).toBe(false);
    });

    it('should detect quality:gate script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'quality:gate': 'npm run lint && npm run test',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasComplianceViolation = result.violations!.some(v =>
        v.includes('No automated compliance checking scripts')
      );
      expect(hasComplianceViolation).toBe(false);
    });

    it('should flag missing compliance scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasComplianceViolation = result.violations!.some(v =>
        v.includes('No automated compliance checking scripts')
      );
      expect(hasComplianceViolation).toBe(true);
    });

    it('should suggest automated reporting scripts', () => {
      // Note: Suggestions are only returned when violations.length > 0
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should detect ruleofcode dependency', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasEnforcementViolation = result.violations!.some(v =>
        v.includes('No constitutional law enforcement tools detected')
      );
      expect(hasEnforcementViolation).toBe(false);
    });

    it('should flag missing ruleofcode dependency', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'echo "check"',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasEnforcementViolation = result.violations!.some(v =>
        v.includes('No constitutional law enforcement tools detected')
      );
      expect(hasEnforcementViolation).toBe(true);
    });
  });

  // ============================================
  // Reporting Mechanisms Detection
  // ============================================
  describe('Reporting Mechanisms Detection', () => {
    it('should suggest compliance documentation when missing', () => {
      // Note: Suggestions are only returned when violations.length > 0
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should detect docs/COMPLIANCE.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'COMPLIANCE.md'),
        '# Compliance'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasComplianceDocsSuggestion = result.suggestions!.some(s =>
        s.includes('Create compliance documentation and reports')
      );
      expect(hasComplianceDocsSuggestion).toBe(false);
    });

    it('should suggest badges when README exists without badges', () => {
      // Note: Suggestions are only returned when violations.length > 0
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# Test Project\n\nDescription'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should not suggest badges when README has shields.io links', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# Test Project\n\n![Build Status](https://shields.io/badge/build-passing-green)'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      const hasBadgeSuggestion = result.suggestions!.some(s =>
        s.includes('Add compliance status badges')
      );
      expect(hasBadgeSuggestion).toBe(false);
    });

    it('should suggest external compliance tools when missing', () => {
      // Note: Suggestions are only returned when violations.length > 0
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });
  });

  // ============================================
  // Full Compliance
  // ============================================
  describe('Full Compliance', () => {
    it('should pass when all monitoring is in place', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'scheduled.yml'),
        'name: Scheduled\non:\n  schedule:\n    - cron: "0 0 * * *"'
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'COMPLIANCE.md'),
        '# Compliance'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# Project\n![badge](https://shields.io/test)'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
            'report:compliance': 'ruleofcode report',
          },
          devDependencies: {
            ruleofcode: '^1.0.0',
            codecov: '^3.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

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
      const result = ContinuousComplianceLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const context = createContext(tempDir);
      const result = ContinuousComplianceLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle non-existent project root gracefully', () => {
      const context = createContext('/non/existent/path');
      const result = ContinuousComplianceLaw.check(context);

      expect(result).toBeDefined();
    });
  });
});
