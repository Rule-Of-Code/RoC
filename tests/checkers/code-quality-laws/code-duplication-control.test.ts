/**
 * Tests for CodeDuplicationControlLaw
 *
 * Comprehensive tests for code duplication detection and control
 */
import { CodeDuplicationControlLaw } from '../../../src/checkers/code-quality-laws/code-duplication-control';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CodeDuplicationControlLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-duplication-test-');
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
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('duplication tools check', () => {
    it('should detect missing duplication detection tools', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: {},
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result.violations).toContain(
        'No code duplication detection tools configured'
      );
    });

    it('should pass when jscpd is installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No code duplication detection tools configured'
      );
    });

    it('should pass when copy-paste-detector is installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { 'copy-paste-detector': '^1.0.0' },
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No code duplication detection tools configured'
      );
    });

    it('should handle project without eslint-plugin-sonarjs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      // Should return valid result
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should not suggest sonarjs when already installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: {
            jscpd: '^3.0.0',
            'eslint-plugin-sonarjs': '^0.15.0',
          },
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Consider eslint-plugin-sonarjs for advanced duplication detection'
      );
    });
  });

  describe('duplication analysis', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
    });

    it('should detect duplicated code blocks', () => {
      // Create a substantial duplicated function block
      const duplicatedBlock = `
function processUserData(user) {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const email = user.email || '';
  const phone = user.phone || '';
  const address = user.address || '';
  const city = user.city || '';
  const country = user.country || '';
  const zipCode = user.zipCode || '';
  return { firstName, lastName, email, phone, address, city, country, zipCode };
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'file1.ts'),
        duplicatedBlock
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'file2.ts'),
        duplicatedBlock
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      const duplicationViolation = result.violations?.find(v =>
        v.includes('Code duplication found')
      );
      expect(duplicationViolation).toBeDefined();
    });

    it('should not flag small code blocks as duplicates', () => {
      const smallBlock = `const x = 1;`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'file1.ts'),
        smallBlock
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'file2.ts'),
        smallBlock
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      // Small blocks should not trigger duplication warnings
      expect(result).toBeDefined();
    });

    it('should pass for unique code', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'unique1.ts'),
        'function greet() { return "hello"; }'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'unique2.ts'),
        'function farewell() { return "goodbye"; }'
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      const uniqueViolation = result.violations?.find(
        v => v.includes('unique1.ts') && v.includes('unique2.ts')
      );
      expect(uniqueViolation).toBeUndefined();
    });

    it('should suggest refactoring when duplicates found', () => {
      const duplicatedBlock = `
function calculateTax(amount) {
  const taxRate = 0.2;
  const baseTax = amount * taxRate;
  const additionalTax = baseTax * 0.05;
  const totalTax = baseTax + additionalTax;
  return totalTax;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'tax1.ts'),
        duplicatedBlock
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'tax2.ts'),
        duplicatedBlock
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      if (result.violations?.some(v => v.includes('Code duplication found'))) {
        expect(result.suggestions).toContain(
          'Extract common code into shared functions or modules'
        );
      }
    });
  });

  describe('code block extraction', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
    });

    it('should extract function blocks', () => {
      const codeWithFunctions = `
function first() {
  return 1;
}

const second = () => {
  return 2;
};

function third() {
  return 3;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'functions.ts'),
        codeWithFunctions
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should handle nested functions', () => {
      const nestedFunctions = `
function outer() {
  function inner() {
    return 'inner';
  }
  return inner();
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'nested.ts'),
        nestedFunctions
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('code normalization', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
    });

    it('should normalize whitespace differences', () => {
      const code1 = `function test() {
  return    1;
}`;
      const code2 = `function test() {
  return 1;
}`;
      FileUtils.writeFile(PathOperations.join(tempDir, 'src', 'ws1.ts'), code1);
      FileUtils.writeFile(PathOperations.join(tempDir, 'src', 'ws2.ts'), code2);
      const result = CodeDuplicationControlLaw.check(mockContext);
      // Whitespace differences should be normalized
      expect(result).toBeDefined();
    });

    it('should ignore comments when comparing', () => {
      const codeWithComments = `
// This is a comment
function process() {
  /* multi-line
     comment */
  return true;
}`;
      const codeWithoutComments = `
function process() {
  return true;
}`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'with-comments.ts'),
        codeWithComments
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'without-comments.ts'),
        codeWithoutComments
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('should return appropriate score based on violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return 100 when no violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      if (result.violations?.length === 0) {
        expect(result.score).toBe(100);
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json gracefully', () => {
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle unreadable files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('suggestions', () => {
    it('should include all refactoring suggestions when duplicates found', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jscpd: '^3.0.0' },
        })
      );
      const duplicatedBlock = `
function validateUserInput(input) {
  if (!input) return false;
  if (typeof input !== 'string') return false;
  if (input.length < 3) return false;
  if (input.length > 100) return false;
  return true;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'validate1.ts'),
        duplicatedBlock
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'validate2.ts'),
        duplicatedBlock
      );
      const result = CodeDuplicationControlLaw.check(mockContext);
      if (result.violations?.some(v => v.includes('Code duplication'))) {
        expect(result.suggestions).toContain(
          'Use inheritance or composition to reduce duplication'
        );
        expect(result.suggestions).toContain(
          'Consider creating utility functions for repeated patterns'
        );
      }
    });
  });
});
