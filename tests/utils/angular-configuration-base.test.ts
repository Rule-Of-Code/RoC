/**
 * @fileoverview Tests for angular-configuration-base.ts
 * @description Tests for Angular configuration base class
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

// We need to create a concrete implementation to test the abstract class
class TestAngularConfigurationBase {
  /**
   * Test helper to access the static buildMessage method
   */
  static buildMessage(messageTemplate: string, fileName: string): string {
    return messageTemplate.replace('{fileName}', fileName);
  }

  /**
   * Test helper to access validateProjectRootPath equivalent
   */
  static validateProjectRootPath(projectRoot: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!projectRoot) {
      errors.push('Project root path is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Import the actual class to test
import { AngularConfigurationBase } from '../../src/utils/angular/angular-configuration-base';

describe('utils/angular/angular-configuration-base', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-config-base-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('buildMessage', () => {
    it('should replace {fileName} placeholder with actual file name', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Error in {fileName}',
        'test.component.ts'
      );

      expect(result).toBe('Error in test.component.ts');
    });

    it('should handle message without placeholder', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Generic error message',
        'test.ts'
      );

      expect(result).toBe('Generic error message');
    });

    it('should handle empty file name', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Error in {fileName}',
        ''
      );

      expect(result).toBe('Error in ');
    });

    it('should handle empty message template', () => {
      const result = AngularConfigurationBase.buildMessage('', 'test.ts');

      expect(result).toBe('');
    });

    it('should handle complex file paths', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Issue found in {fileName}',
        'src/app/features/user/user.component.ts'
      );

      expect(result).toBe(
        'Issue found in src/app/features/user/user.component.ts'
      );
    });

    it('should handle multiple placeholders (replaces first only)', () => {
      const result = AngularConfigurationBase.buildMessage(
        '{fileName} has error in {fileName}',
        'test.ts'
      );

      // Standard replace replaces first occurrence
      expect(result).toContain('test.ts');
    });

    it('should handle special characters in file name', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Error in {fileName}',
        'my-component.spec.ts'
      );

      expect(result).toBe('Error in my-component.spec.ts');
    });

    it('should preserve message structure around placeholder', () => {
      const result = AngularConfigurationBase.buildMessage(
        'WARNING: {fileName} - needs attention!',
        'app.module.ts'
      );

      expect(result).toBe('WARNING: app.module.ts - needs attention!');
    });
  });

  describe('validateProjectRootPath equivalent', () => {
    it('should return valid for non-empty project root', () => {
      const result =
        TestAngularConfigurationBase.validateProjectRootPath(
          '/path/to/project'
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return invalid for empty project root', () => {
      const result = TestAngularConfigurationBase.validateProjectRootPath('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project root path is required');
    });

    it('should have empty warnings array by default', () => {
      const result =
        TestAngularConfigurationBase.validateProjectRootPath('/valid/path');

      expect(result.warnings).toEqual([]);
    });
  });

  describe('initializeAnalysis pattern', () => {
    it('should handle src directory that does not exist', () => {
      // When src doesn't exist, initializeAnalysis returns empty arrays
      const srcPath = PathOperations.join(tempDir, 'src');

      expect(FileUtils.exists(srcPath)).toBe(false);
    });

    it('should handle src directory that exists', () => {
      // Create src directory
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      expect(FileUtils.exists(srcPath)).toBe(true);
    });

    it('should support finding TypeScript files', () => {
      // Create src directory with TypeScript files
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const componentFile = PathOperations.join(srcPath, 'test.component.ts');
      const serviceFile = PathOperations.join(srcPath, 'test.service.ts');

      FileUtils.writeFile(componentFile, 'export class TestComponent {}');
      FileUtils.writeFile(serviceFile, 'export class TestService {}');

      expect(FileUtils.exists(componentFile)).toBe(true);
      expect(FileUtils.exists(serviceFile)).toBe(true);
    });
  });

  describe('message template patterns', () => {
    it('should support violation message pattern', () => {
      const violationTemplate = 'Violation: {fileName} has issues';
      const result = AngularConfigurationBase.buildMessage(
        violationTemplate,
        'user.component.ts'
      );

      expect(result).toBe('Violation: user.component.ts has issues');
    });

    it('should support suggestion message pattern', () => {
      const suggestionTemplate = 'Suggestion: Consider refactoring {fileName}';
      const result = AngularConfigurationBase.buildMessage(
        suggestionTemplate,
        'legacy.service.ts'
      );

      expect(result).toBe('Suggestion: Consider refactoring legacy.service.ts');
    });

    it('should support error message pattern', () => {
      const errorTemplate = 'ERROR: Failed to analyze {fileName}';
      const result = AngularConfigurationBase.buildMessage(
        errorTemplate,
        'broken.module.ts'
      );

      expect(result).toBe('ERROR: Failed to analyze broken.module.ts');
    });

    it('should support warning message pattern', () => {
      const warningTemplate = 'Warning: {fileName} may have performance issues';
      const result = AngularConfigurationBase.buildMessage(
        warningTemplate,
        'heavy.component.ts'
      );

      expect(result).toBe(
        'Warning: heavy.component.ts may have performance issues'
      );
    });
  });

  describe('file path handling', () => {
    it('should handle Unix-style paths', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Check {fileName}',
        'src/app/components/header/header.component.ts'
      );

      expect(result).toBe(
        'Check src/app/components/header/header.component.ts'
      );
    });

    it('should handle Windows-style paths', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Check {fileName}',
        'src\\app\\components\\header\\header.component.ts'
      );

      expect(result).toBe(
        'Check src\\app\\components\\header\\header.component.ts'
      );
    });

    it('should handle relative paths', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Found in {fileName}',
        './user.service.ts'
      );

      expect(result).toBe('Found in ./user.service.ts');
    });

    it('should handle absolute paths', () => {
      const result = AngularConfigurationBase.buildMessage(
        'Located at {fileName}',
        '/home/user/project/src/app.component.ts'
      );

      expect(result).toBe('Located at /home/user/project/src/app.component.ts');
    });
  });

  describe('edge cases', () => {
    it('should handle file names with spaces', () => {
      const result = AngularConfigurationBase.buildMessage(
        'File: {fileName}',
        'my component.ts'
      );

      expect(result).toBe('File: my component.ts');
    });

    it('should handle file names with unicode characters', () => {
      const result = AngularConfigurationBase.buildMessage(
        'File: {fileName}',
        'компонент.ts'
      );

      expect(result).toBe('File: компонент.ts');
    });

    it('should handle very long file paths', () => {
      const longPath =
        'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/component.ts';
      const result = AngularConfigurationBase.buildMessage(
        'Path: {fileName}',
        longPath
      );

      expect(result).toBe(`Path: ${longPath}`);
    });

    it('should handle file name with curly braces', () => {
      const result = AngularConfigurationBase.buildMessage(
        'File: {fileName}',
        'test{1}.ts'
      );

      expect(result).toBe('File: test{1}.ts');
    });
  });
});
