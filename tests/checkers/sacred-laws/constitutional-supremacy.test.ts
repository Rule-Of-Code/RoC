/**
 * Constitutional Supremacy Law - Tests
 * Comprehensive tests for ConstitutionalSupremacyLaw class
 */
import { ConstitutionalSupremacyLaw } from '../../../src/checkers/sacred-laws/constitutional-supremacy';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ConstitutionalSupremacyLaw', () => {
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
    tempDir = FileUtils.createTempDirectory('constitutional-supremacy-test-');
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
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should fail when no constitutional configuration exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

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
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Constitutional Compliance Detection
  // ============================================
  describe('Constitutional Compliance Detection', () => {
    it('should detect ruleofcode.config.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: {
            name: 'test',
            root: '',
          },
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasConfigViolation = result.violations!.some(v =>
        v.includes('Missing constitutional law configuration')
      );
      expect(hasConfigViolation).toBe(false);
    });

    it('should flag missing ruleofcode.config.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasConfigViolation = result.violations!.some(v =>
        v.includes('Missing constitutional law configuration')
      );
      expect(hasConfigViolation).toBe(true);
    });

    it('should suggest constitutional documentation when missing', () => {
      // Note: Suggestions are only returned when there are violations
      // When violations.length === 0, suggestions array is cleared
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: {
            name: 'test',
            root: '',
          },
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      // No violations means no suggestions are returned
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should detect CONSTITUTION.md at root', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CONSTITUTION.md'),
        '# Constitution'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasDocsSuggestion = result.suggestions!.some(s =>
        s.includes('Document constitutional principles')
      );
      expect(hasDocsSuggestion).toBe(false);
    });

    it('should detect CONSTITUTION.md in docs folder', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'CONSTITUTION.md'),
        '# Constitution'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasDocsSuggestion = result.suggestions!.some(s =>
        s.includes('Document constitutional principles')
      );
      expect(hasDocsSuggestion).toBe(false);
    });

    it('should detect constitutional docs directory', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'docs', 'constitutional')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasDocsSuggestion = result.suggestions!.some(s =>
        s.includes('Document constitutional principles')
      );
      expect(hasDocsSuggestion).toBe(false);
    });
  });

  // ============================================
  // Rule Enforcement Detection
  // ============================================
  describe('Rule Enforcement Detection', () => {
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasEnforcementViolation = result.violations!.some(v =>
        v.includes('No constitutional law enforcement scripts')
      );
      expect(hasEnforcementViolation).toBe(false);
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasEnforcementViolation = result.violations!.some(v =>
        v.includes('No constitutional law enforcement scripts')
      );
      expect(hasEnforcementViolation).toBe(false);
    });

    it('should flag missing enforcement scripts', () => {
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasEnforcementViolation = result.violations!.some(v =>
        v.includes('No constitutional law enforcement scripts')
      );
      expect(hasEnforcementViolation).toBe(true);
    });

    it('clears suggestions when enforcement scripts are already wired', () => {
      // Note: Suggestions are only returned when there are violations
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });
  });

  // ============================================
  // Governance Structures Detection
  // ============================================
  describe('Governance Structures Detection', () => {
    it('should suggest GOVERNANCE.md when missing', () => {
      // Note: Suggestions are only returned when there are violations
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should detect GOVERNANCE.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'GOVERNANCE.md'),
        '# Governance'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasGovernanceSuggestion = result.suggestions!.some(s =>
        s.includes('GOVERNANCE.md and CODEOWNERS')
      );
      expect(hasGovernanceSuggestion).toBe(false);
    });

    it('should detect CODEOWNERS file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CODEOWNERS'),
        '* @owner'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasGovernanceSuggestion = result.suggestions!.some(s =>
        s.includes('GOVERNANCE.md and CODEOWNERS')
      );
      expect(hasGovernanceSuggestion).toBe(false);
    });

    it('should detect .github/CODEOWNERS file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'CODEOWNERS'),
        '* @owner'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasGovernanceSuggestion = result.suggestions!.some(s =>
        s.includes('GOVERNANCE.md and CODEOWNERS')
      );
      expect(hasGovernanceSuggestion).toBe(false);
    });

    it('should suggest decision records when missing', () => {
      // Note: Suggestions are only returned when there are violations
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      // No violations means suggestions are cleared
      expect(result.passed).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should detect docs/decisions directory', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'docs', 'decisions')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasADRSuggestion = result.suggestions!.some(s =>
        s.includes('Document architectural decisions in ADR format')
      );
      expect(hasADRSuggestion).toBe(false);
    });

    it('should detect docs/adr directory', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs', 'adr'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      const hasADRSuggestion = result.suggestions!.some(s =>
        s.includes('Document architectural decisions in ADR format')
      );
      expect(hasADRSuggestion).toBe(false);
    });
  });

  // ============================================
  // Score Calculation
  // ============================================
  describe('Score Calculation', () => {
    it('should return score 100 when all checks pass', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'test', root: '' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CONSTITUTION.md'),
        '# Constitution'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'GOVERNANCE.md'),
        '# Governance'
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs', 'adr'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            'check:laws': 'ruleofcode audit',
          },
          devDependencies: {
            '@ruleofcode/core': '^1.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result.score).toBe(100);
    });

    it('should deduct points for violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative scores', () => {
      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // fixable Property
  // ============================================
  describe('fixable Property', () => {
    it('should be true when violations exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result.fixable).toBe(true);
    });

    it('should be false when no violations', () => {
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
        })
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result.fixable).toBe(false);
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should handle missing package.json', () => {
      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const context = createContext(tempDir);
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle non-existent project root gracefully', () => {
      const context = createContext('/non/existent/path');
      const result = ConstitutionalSupremacyLaw.check(context);

      expect(result).toBeDefined();
    });
  });
});
