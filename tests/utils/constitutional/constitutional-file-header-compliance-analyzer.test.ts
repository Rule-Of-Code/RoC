/**
 * File Header Compliance Analyzer - Tests
 * Tests for FileHeaderComplianceAnalyzer class
 */
import { FileHeaderComplianceAnalyzer } from '../../../src/utils/constitutional/file-header-compliance/file-header-compliance-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('FileHeaderComplianceAnalyzer', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'file-header-compliance-analyzer-test-'
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
      expect(typeof FileHeaderComplianceAnalyzer).toBe('function');
    });

    it('should have checkFileHeaderCompliance static method', () => {
      expect(
        typeof FileHeaderComplianceAnalyzer.checkFileHeaderCompliance
      ).toBe('function');
    });
  });

  // ============================================
  // checkFileHeaderCompliance Method Tests
  // ============================================
  describe('checkFileHeaderCompliance()', () => {
    describe('result structure', () => {
      it('should return object with violations array', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result).toHaveProperty('violations');
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return object with suggestions array', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('when src directory does not exist', () => {
      it('should return empty violations', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should return empty suggestions', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('when src directory exists but is empty', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
      });

      it('should return empty violations', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should return empty suggestions', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('when files exist without headers', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'example.ts'),
          'export const foo = "bar";'
        );
      });

      it('should return violations for files without headers', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should include percentage in violation message', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        const hasPercentage = result.violations.some(v => v.includes('%'));
        expect(hasPercentage).toBe(true);
      });

      it('should return suggestions for adding headers', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when files exist with proper headers', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'example.ts'),
          `/**
 * @fileoverview Example file with proper header
 * @author Test Author
 * @license MIT
 * Copyright 2024
 */
export const foo = "bar";`
        );
      });

      it('should return empty violations', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should return empty suggestions', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('with mixed header compliance', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);

        // File with header
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'with-header.ts'),
          `/**
 * @fileoverview File with header
 * Copyright 2024
 */
export const a = 1;`
        );

        // File without header
        FileUtils.writeFileSync(
          PathOperations.join(srcPath, 'without-header.ts'),
          'export const b = 2;'
        );
      });

      it('should report violations for files without headers', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should include count in violation message', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        const hasCount = result.violations.some(v => /\d+\/\d+/.test(v));
        expect(hasCount).toBe(true);
      });
    });

    describe('with nested directories', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        const nestedPath = PathOperations.join(srcPath, 'nested');
        FileUtils.createDirectory(nestedPath);
        FileUtils.writeFileSync(
          PathOperations.join(nestedPath, 'deep.ts'),
          'export const deep = true;'
        );
      });

      it('should analyze files in nested directories', () => {
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    describe('with different file extensions', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
      });

      it('should analyze TypeScript files', () => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'src', 'file.ts'),
          'export const x = 1;'
        );
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should analyze JavaScript files', () => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'src', 'file.js'),
          'export const x = 1;'
        );
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    describe('with various header indicators', () => {
      beforeEach(() => {
        const srcPath = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcPath);
      });

      it('should recognize copyright header', () => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'src', 'copyright.ts'),
          '// Copyright 2024\nexport const x = 1;'
        );
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should recognize license header', () => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'src', 'license.ts'),
          '// MIT License\nexport const x = 1;'
        );
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should recognize @fileoverview header', () => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'src', 'fileoverview.ts'),
          '/** @fileoverview Test */\nexport const x = 1;'
        );
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should recognize @author header', () => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'src', 'author.ts'),
          '// @author Test Author\nexport const x = 1;'
        );
        const result =
          FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(tempDir);
        expect(result.violations).toHaveLength(0);
      });
    });
  });
});
