/**
 * File Header Compliance Validation - Tests
 * Tests for FileHeaderComplianceValidation class
 */
import { FileHeaderComplianceValidation } from '../../../src/utils/constitutional/file-header-compliance/file-header-compliance-validation';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('FileHeaderComplianceValidation', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'file-header-compliance-validation-test-'
    );
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // Class Structure Tests
  // ============================================
  describe('Class Structure', () => {
    it('should be a class', () => {
      expect(typeof FileHeaderComplianceValidation).toBe('function');
    });

    it('should have executeAnalysisWorkflow static method', () => {
      expect(
        typeof FileHeaderComplianceValidation.executeAnalysisWorkflow
      ).toBe('function');
    });

    it('should have getSampleFiles static method', () => {
      expect(typeof FileHeaderComplianceValidation.getSampleFiles).toBe(
        'function'
      );
    });

    it('should have isSourceFile static method', () => {
      expect(typeof FileHeaderComplianceValidation.isSourceFile).toBe(
        'function'
      );
    });
  });

  // ============================================
  // executeAnalysisWorkflow Method Tests
  // ============================================
  describe('executeAnalysisWorkflow()', () => {
    describe('result structure', () => {
      it('should return object with violations array', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result).toHaveProperty('violations');
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return object with suggestions array', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('when src directory does not exist', () => {
      it('should return empty violations', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should return empty suggestions', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('when src has files without headers', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'file1.ts'),
          'export const a = 1;'
        );
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'file2.ts'),
          'export const b = 2;'
        );
      });

      it('should report violations', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should include file count in violation', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.violations[0]).toMatch(/\d+\/\d+/);
      });

      it('should include percentage in violation', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.violations[0]).toMatch(/\d+(\.\d+)?%/);
      });

      it('should include suggestion to add headers', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        const hasSuggestion = result.suggestions.some(s =>
          s.toLowerCase().includes('add')
        );
        expect(hasSuggestion).toBe(true);
      });
    });

    describe('when src has files with headers', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'compliant.ts'),
          `/**
 * @fileoverview Compliant file
 * Copyright 2024
 */
export const x = 1;`
        );
      });

      it('should return no violations', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should return no suggestions', () => {
        const result =
          FileHeaderComplianceValidation.executeAnalysisWorkflow(tempDir);
        expect(result.suggestions).toHaveLength(0);
      });
    });
  });

  // ============================================
  // getSampleFiles Method Tests
  // ============================================
  describe('getSampleFiles()', () => {
    beforeEach(() => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);
    });

    describe('return type', () => {
      it('should return an array', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('when directory is empty', () => {
      it('should return empty array', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result).toHaveLength(0);
      });
    });

    describe('when directory has source files', () => {
      it('should return TypeScript files', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'app.ts'),
          'const x = 1;'
        );
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result.some(f => f.endsWith('.ts'))).toBe(true);
      });

      it('should return JavaScript files', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'app.js'),
          'const x = 1;'
        );
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result.some(f => f.endsWith('.js'))).toBe(true);
      });
    });

    describe('file filtering', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'app.ts'),
          'const x = 1;'
        );
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'app.spec.ts'),
          'test()'
        );
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'app.test.ts'),
          'test()'
        );
      });

      it('should exclude spec files', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result.some(f => f.includes('.spec.'))).toBe(false);
      });

      it('should exclude test files', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result.some(f => f.includes('.test.'))).toBe(false);
      });
    });

    describe('nested directories', () => {
      it('should find files in subdirectories', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        const nestedPath = PathOperations.join(srcPath, 'nested');
        FileUtils.createDirectory(nestedPath);
        FileUtils.writeFileSync(
          PathOperations.join(nestedPath, 'deep.ts'),
          'const x = 1;'
        );
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result.some(f => f.includes('deep.ts'))).toBe(true);
      });
    });

    describe('max sample files limit', () => {
      it('should respect the max sample files limit', () => {
        const srcPath = PathOperations.join(tempDir, 'src');
        // Create 30 files (more than max of 20)
        for (let i = 0; i < 30; i++) {
          FileUtils.writeFileSync(
            PathOperations.join(srcPath, `file${i}.ts`),
            `const x${i} = ${i};`
          );
        }
        const result = FileHeaderComplianceValidation.getSampleFiles(srcPath);
        expect(result.length).toBeLessThanOrEqual(20);
      });
    });
  });

  // ============================================
  // isSourceFile Method Tests
  // ============================================
  describe('isSourceFile()', () => {
    describe('valid source files', () => {
      it('should return true for .ts files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('app.ts')).toBe(
          true
        );
      });

      it('should return true for .js files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('app.js')).toBe(
          true
        );
      });

      it('should return true for .tsx files', () => {
        expect(
          FileHeaderComplianceValidation.isSourceFile('component.tsx')
        ).toBe(true);
      });

      it('should return true for .jsx files', () => {
        expect(
          FileHeaderComplianceValidation.isSourceFile('component.jsx')
        ).toBe(true);
      });
    });

    describe('excluded patterns', () => {
      it('should return false for .test. files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('app.test.ts')).toBe(
          false
        );
      });

      it('should return false for .spec. files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('app.spec.ts')).toBe(
          false
        );
      });

      it('should return false for .d.ts files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('types.d.ts')).toBe(
          false
        );
      });

      it('should return false for index files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('index.ts')).toBe(
          false
        );
      });
    });

    describe('non-source files', () => {
      it('should return false for .json files', () => {
        expect(
          FileHeaderComplianceValidation.isSourceFile('package.json')
        ).toBe(false);
      });

      it('should return false for .md files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('README.md')).toBe(
          false
        );
      });

      it('should return false for .css files', () => {
        expect(FileHeaderComplianceValidation.isSourceFile('styles.css')).toBe(
          false
        );
      });

      it('should return false for .html files', () => {
        expect(
          FileHeaderComplianceValidation.isSourceFile('template.html')
        ).toBe(false);
      });
    });
  });
});
