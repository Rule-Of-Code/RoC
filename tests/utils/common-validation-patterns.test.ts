/**
 * CommonValidationPatterns Tests
 * Tests for the CommonValidationPatterns utility class
 */
import {
  CommonValidationPatterns,
  FileExistsChecker,
} from '../../src/utils/common-validation-patterns';

describe('CommonValidationPatterns', () => {
  // Mock file utils for testing
  const createMockFileUtils = (existingPaths: string[]): FileExistsChecker => ({
    exists: (path: string) => existingPaths.includes(path),
  });

  describe('checkDirectoryExists', () => {
    it('should return exists=true when directory exists', () => {
      const fileUtils = createMockFileUtils(['/project/src']);
      const result = CommonValidationPatterns.checkDirectoryExists(
        '/project/src',
        'src',
        fileUtils
      );

      expect(result.exists).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should return violations when directory does not exist', () => {
      const fileUtils = createMockFileUtils([]);
      const result = CommonValidationPatterns.checkDirectoryExists(
        '/project/src',
        'src',
        fileUtils
      );

      expect(result.exists).toBe(false);
      expect(result.violations).toContain('src directory not found');
      expect(result.suggestions).toContain('Create src directory');
    });
  });

  describe('checkFileExists', () => {
    it('should return exists=true when file exists', () => {
      const fileUtils = createMockFileUtils(['/project/package.json']);
      const result = CommonValidationPatterns.checkFileExists(
        '/project/package.json',
        'package.json',
        fileUtils
      );

      expect(result.exists).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should return violations when file does not exist', () => {
      const fileUtils = createMockFileUtils([]);
      const result = CommonValidationPatterns.checkFileExists(
        '/project/tsconfig.json',
        'tsconfig.json',
        fileUtils
      );

      expect(result.exists).toBe(false);
      expect(result.violations).toContain('tsconfig.json not found');
      expect(result.suggestions).toContain('Create tsconfig.json');
    });
  });

  describe('checkAnyFileExists', () => {
    it('should return exists=true when at least one file exists', () => {
      const fileUtils = createMockFileUtils(['/project/.eslintrc.js']);
      const filePaths = [
        '/project/.eslintrc.js',
        '/project/.eslintrc.json',
        '/project/eslint.config.js',
      ];

      const result = CommonValidationPatterns.checkAnyFileExists(
        filePaths,
        'ESLint config',
        fileUtils
      );

      expect(result.exists).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should return violations when no files exist', () => {
      const fileUtils = createMockFileUtils([]);
      const filePaths = ['/project/.eslintrc.js', '/project/.eslintrc.json'];

      const result = CommonValidationPatterns.checkAnyFileExists(
        filePaths,
        'ESLint config',
        fileUtils
      );

      expect(result.exists).toBe(false);
      expect(result.violations).toContain('No ESLint config found');
      expect(result.suggestions[0]).toContain(
        '/project/.eslintrc.js, /project/.eslintrc.json'
      );
    });
  });

  describe('checkAllFilesExist', () => {
    it('should return allExist=true when all files exist', () => {
      const fileUtils = createMockFileUtils([
        '/project/file1.ts',
        '/project/file2.ts',
      ]);
      const filePaths = ['/project/file1.ts', '/project/file2.ts'];

      const result = CommonValidationPatterns.checkAllFilesExist(
        filePaths,
        'required',
        fileUtils
      );

      expect(result.allExist).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.violations).toEqual([]);
    });

    it('should return missing files when some do not exist', () => {
      const fileUtils = createMockFileUtils(['/project/file1.ts']);
      const filePaths = [
        '/project/file1.ts',
        '/project/file2.ts',
        '/project/file3.ts',
      ];

      const result = CommonValidationPatterns.checkAllFilesExist(
        filePaths,
        'config',
        fileUtils
      );

      expect(result.allExist).toBe(false);
      expect(result.missing).toEqual([
        '/project/file2.ts',
        '/project/file3.ts',
      ]);
      expect(result.violations[0]).toContain('Missing config files');
      expect(result.suggestions).toContain('Create missing config files');
    });
  });

  describe('missingConfigViolation', () => {
    it('should create correct violation and suggestion', () => {
      const result =
        CommonValidationPatterns.missingConfigViolation('TypeScript');

      expect(result.violation).toBe('No TypeScript configuration found');
      expect(result.suggestion).toBe('Create TypeScript configuration');
    });
  });

  describe('invalidConfigViolation', () => {
    it('should create violation without reason', () => {
      const result = CommonValidationPatterns.invalidConfigViolation('ESLint');

      expect(result.violation).toBe('Invalid ESLint configuration');
      expect(result.suggestion).toBe('Fix ESLint configuration');
    });

    it('should create violation with reason', () => {
      const result = CommonValidationPatterns.invalidConfigViolation(
        'ESLint',
        'parse error'
      );

      expect(result.violation).toBe(
        'Invalid ESLint configuration (parse error)'
      );
      expect(result.suggestion).toBe('Fix ESLint configuration');
    });
  });

  describe('missingDependencyViolation', () => {
    it('should create correct violation and suggestion', () => {
      const result =
        CommonValidationPatterns.missingDependencyViolation('lodash');

      expect(result.violation).toBe('Missing dependency: lodash');
      expect(result.suggestion).toBe('Install lodash: npm install lodash');
    });
  });

  describe('missingScriptViolation', () => {
    it('should create violation without recommended script', () => {
      const result = CommonValidationPatterns.missingScriptViolation('test');

      expect(result.violation).toBe('Missing npm script: test');
      expect(result.suggestion).toBe('Add test script to package.json');
    });

    it('should create violation with recommended script', () => {
      const result = CommonValidationPatterns.missingScriptViolation(
        'test',
        'jest'
      );

      expect(result.violation).toBe('Missing npm script: test');
      expect(result.suggestion).toBe('Add script: "test": "jest"');
    });
  });

  describe('missingToolConfigViolation', () => {
    it('should create correct violation and suggestion', () => {
      const result =
        CommonValidationPatterns.missingToolConfigViolation('Prettier');

      expect(result.violation).toBe('No Prettier configuration found');
      expect(result.suggestion).toBe('Configure Prettier in project');
    });
  });

  describe('incompleteChecklistViolation', () => {
    it('should create violation with missing items', () => {
      const result = CommonValidationPatterns.incompleteChecklistViolation(
        'Security checklist',
        ['authentication', 'authorization']
      );

      expect(result.violation).toBe(
        'Security checklist incomplete: missing authentication, authorization'
      );
      expect(result.suggestion).toBe('Complete Security checklist items');
    });

    it('should handle single missing item', () => {
      const result = CommonValidationPatterns.incompleteChecklistViolation(
        'Deploy checklist',
        ['backup']
      );

      expect(result.violation).toBe(
        'Deploy checklist incomplete: missing backup'
      );
    });
  });

  describe('validatePattern', () => {
    it('should return valid=true for matching pattern', () => {
      const emailPattern = /^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
      const result = CommonValidationPatterns.validatePattern(
        emailPattern,
        'test@example.com',
        'email address'
      );

      expect(result.valid).toBe(true);
      expect(result.violation).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
    });

    it('should return violation for non-matching pattern', () => {
      const emailPattern = /^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
      const result = CommonValidationPatterns.validatePattern(
        emailPattern,
        'invalid-email',
        'email address'
      );

      expect(result.valid).toBe(false);
      expect(result.violation).toBe('Invalid email address: invalid-email');
      expect(result.suggestion).toBe('Use proper email address format');
    });
  });

  describe('validateSemVer', () => {
    it('should accept valid semver versions', () => {
      const validVersions = ['1.0.0', '0.0.1', '2.3.4', '10.20.30'];

      for (const version of validVersions) {
        const result = CommonValidationPatterns.validateSemVer(version);
        expect(result.valid).toBe(true);
      }
    });

    it('should accept versions with pre-release suffix', () => {
      const result = CommonValidationPatterns.validateSemVer('1.0.0-alpha.1');
      expect(result.valid).toBe(true);
    });

    it('should accept versions with build metadata', () => {
      const result = CommonValidationPatterns.validateSemVer('1.0.0+build.123');
      expect(result.valid).toBe(true);
    });

    it('should accept versions with both pre-release and build', () => {
      const result = CommonValidationPatterns.validateSemVer(
        '1.0.0-beta.2+build.456'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid versions', () => {
      const invalidVersions = ['1.0', '1', 'v1.0.0', '1.0.0.0', 'abc'];

      for (const version of invalidVersions) {
        const result = CommonValidationPatterns.validateSemVer(version);
        expect(result.valid).toBe(false);
      }
    });
  });
});
