/**
 * Professional Excellence Law - Tests
 * Comprehensive tests for ProfessionalExcellenceLaw class
 */
import { ProfessionalExcellenceLaw } from '../../../src/checkers/sacred-laws/professional-excellence';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ProfessionalExcellenceLaw', () => {
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
    tempDir = FileUtils.createTempDirectory('professional-excellence-test-');
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
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should fail when no quality tools are configured', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

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
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Quality Tools Detection - Essential
  // ============================================
  describe('Quality Tools Detection - Essential', () => {
    it('should detect eslint', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasEslintViolation = result.violations!.some(
        v => v.includes('eslint') && v.includes('Missing')
      );
      expect(hasEslintViolation).toBe(false);
    });

    it('should detect prettier', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasPrettierViolation = result.violations!.some(
        v => v.includes('prettier') && v.includes('Missing')
      );
      expect(hasPrettierViolation).toBe(false);
    });

    it('should detect typescript', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasTypescriptViolation = result.violations!.some(
        v => v.includes('typescript') && v.includes('Missing')
      );
      expect(hasTypescriptViolation).toBe(false);
    });

    it('should flag missing eslint', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasEslintViolation = result.violations!.some(v =>
        v.includes('eslint')
      );
      expect(hasEslintViolation).toBe(true);
    });

    it('should flag missing prettier', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasPrettierViolation = result.violations!.some(v =>
        v.includes('prettier')
      );
      expect(hasPrettierViolation).toBe(true);
    });

    it('should flag missing typescript', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasTypescriptViolation = result.violations!.some(v =>
        v.includes('typescript')
      );
      expect(hasTypescriptViolation).toBe(true);
    });
  });

  // ============================================
  // Quality Tools Detection - Advanced (Optional)
  // ============================================
  describe('Quality Tools Detection - Advanced', () => {
    it('should suggest husky when missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasHuskySuggestion = result.suggestions!.some(s =>
        s.includes('husky')
      );
      expect(hasHuskySuggestion).toBe(true);
    });

    it('should suggest lint-staged when missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasLintStagedSuggestion = result.suggestions!.some(s =>
        s.includes('lint-staged')
      );
      expect(hasLintStagedSuggestion).toBe(true);
    });

    it('should not suggest husky when present', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
            husky: '^9.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasHuskySuggestion = result.suggestions!.some(
        s => s.includes('husky') && s.includes('Consider adding')
      );
      expect(hasHuskySuggestion).toBe(false);
    });
  });

  // ============================================
  // Professional Standards Detection
  // ============================================
  describe('Professional Standards Detection', () => {
    it('should detect .eslintrc.js config file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasEslintConfigViolation = result.violations!.some(v =>
        v.includes('Missing .eslintrc.js')
      );
      expect(hasEslintConfigViolation).toBe(false);
    });

    it('should detect tsconfig.json config file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasTsConfigViolation = result.violations!.some(v =>
        v.includes('Missing tsconfig.json')
      );
      expect(hasTsConfigViolation).toBe(false);
    });

    it('should detect .prettierrc config file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasPrettierConfigViolation = result.violations!.some(v =>
        v.includes('Missing .prettierrc')
      );
      expect(hasPrettierConfigViolation).toBe(false);
    });

    it('should flag missing config files', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      // The canonical name is now the flat-config default; legacy .eslintrc.js
      // is still accepted, but a project with NO eslint config is flagged
      // against the modern name.
      expect(
        result.violations!.some(v => v.includes('Missing eslint.config.mjs'))
      ).toBe(true);
      expect(
        result.violations!.some(v => v.includes('Missing tsconfig.json'))
      ).toBe(true);
      expect(
        result.violations!.some(v => v.includes('Missing .prettierrc'))
      ).toBe(true);
    });

    it('accepts flat ESLint config and modern prettier (a downstream consumer Nx finding)', () => {
      // ESLint 9 flat config + .prettierrc.json — the modern, correct setup the
      // old exact-name check reported as "Missing .eslintrc.js" / "Missing
      // .prettierrc".
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'eslint.config.mjs'),
        'export default [];'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.prettierrc.json'),
        '{}'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      expect(
        result.violations!.some(v => v.includes('Missing eslint'))
      ).toBe(false);
      expect(
        result.violations!.some(v => v.includes('Missing .prettierrc'))
      ).toBe(false);
    });

    it('should suggest coding standards documentation', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasStandardsSuggestion = result.suggestions!.some(
        s => s.includes('coding standards') || s.includes('style guidelines')
      );
      expect(hasStandardsSuggestion).toBe(true);
    });
  });

  // ============================================
  // Enterprise Practices Detection
  // ============================================
  describe('Enterprise Practices Detection', () => {
    it('should suggest SECURITY.md when missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasSecuritySuggestion = result.suggestions!.some(s =>
        s.includes('SECURITY.md')
      );
      expect(hasSecuritySuggestion).toBe(true);
    });

    it('should suggest CODE_OF_CONDUCT.md when missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasCodeOfConductSuggestion = result.suggestions!.some(s =>
        s.includes('CODE_OF_CONDUCT.md')
      );
      expect(hasCodeOfConductSuggestion).toBe(true);
    });

    it('should suggest error tracking when missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasErrorTrackingSuggestion = result.suggestions!.some(s =>
        s.includes('error tracking')
      );
      expect(hasErrorTrackingSuggestion).toBe(true);
    });

    it('should not suggest error tracking when sentry is present', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@sentry/node': '^7.0.0',
          },
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      const hasErrorTrackingSuggestion = result.suggestions!.some(s =>
        s.includes('Consider adding error tracking')
      );
      expect(hasErrorTrackingSuggestion).toBe(false);
    });
  });

  // ============================================
  // Score Calculation
  // ============================================
  describe('Score Calculation', () => {
    it('should return score 100 when all checks pass', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(PathOperations.join(tempDir, '.prettierrc'), '{}');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CODING_STANDARDS.md'),
        '# Standards'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'SECURITY.md'),
        '# Security'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CODE_OF_CONDUCT.md'),
        '# Conduct'
      );
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'sonar-project.properties'),
        'key=test'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@sentry/node': '^7.0.0',
          },
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
            husky: '^9.0.0',
            'lint-staged': '^15.0.0',
            commitizen: '^4.0.0',
            '@commitlint/cli': '^18.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result.score).toBe(100);
    });

    it('should deduct points for each violation', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative scores', () => {
      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should handle missing package.json', () => {
      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const context = createContext(tempDir);
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle non-existent project root gracefully', () => {
      const context = createContext('/non/existent/path');
      const result = ProfessionalExcellenceLaw.check(context);

      expect(result).toBeDefined();
    });
  });
});
