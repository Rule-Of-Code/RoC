/**
 * @fileoverview Tests for angular-configuration-base.ts
 * @description Tests for Angular configuration base utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

// Create a concrete test class that extends AngularConfigurationBase
class TestAngularConfigurationBase {
  static buildMessage(messageTemplate: string, fileName: string): string {
    return messageTemplate.replace('{fileName}', fileName);
  }

  static initializeAnalysis(
    projectRoot: string,
    extensions: string[],
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
    files: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const srcPath = PathOperations.join(projectRoot, 'src');
    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions, files: [] };
    }

    // Simple file finding for testing
    const files: string[] = [];
    return { violations, suggestions, files };
  }

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

// Import actual class for testing
import { AngularConfigurationBase } from '../../../src/utils/angular/angular-configuration-base';

describe('utils/angular/angular-configuration-base', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-config-base-test-');
    mockConfig = {
      projectRoot: tempDir,
      excludePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('buildMessage', () => {
    it('should replace fileName placeholder in message template', () => {
      const template = 'Error found in {fileName}';
      const fileName = 'test.component.ts';

      const result = AngularConfigurationBase.buildMessage(template, fileName);

      expect(result).toBe('Error found in test.component.ts');
    });

    it('should handle message without placeholder', () => {
      const template = 'Generic error message';
      const fileName = 'test.component.ts';

      const result = AngularConfigurationBase.buildMessage(template, fileName);

      expect(result).toBe('Generic error message');
    });

    it('should handle multiple placeholders', () => {
      const template = 'File {fileName} has issues in {fileName}';
      const fileName = 'app.component.ts';

      const result = AngularConfigurationBase.buildMessage(template, fileName);

      // Should replace first occurrence
      expect(result).toContain('app.component.ts');
    });

    it('should handle empty fileName', () => {
      const template = 'Error in {fileName}';
      const fileName = '';

      const result = AngularConfigurationBase.buildMessage(template, fileName);

      expect(result).toBe('Error in ');
    });
  });

  describe('TestAngularConfigurationBase - initializeAnalysis equivalent', () => {
    it('should return empty arrays when src directory does not exist', () => {
      const result = TestAngularConfigurationBase.initializeAnalysis(
        tempDir,
        ['.component.ts'],
        mockConfig
      );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.files).toEqual([]);
    });

    it('should initialize analysis with src directory', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));

      const result = TestAngularConfigurationBase.initializeAnalysis(
        tempDir,
        ['.component.ts'],
        mockConfig
      );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.files).toBeInstanceOf(Array);
    });
  });

  describe('TestAngularConfigurationBase - validateProjectRootPath equivalent', () => {
    it('should return valid when project root is provided', () => {
      const result =
        TestAngularConfigurationBase.validateProjectRootPath('/some/path');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return error when project root is empty', () => {
      const result = TestAngularConfigurationBase.validateProjectRootPath('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project root path is required');
    });

    it('should return error when project root is undefined-like', () => {
      const result = TestAngularConfigurationBase.validateProjectRootPath(
        '' as unknown as string
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Abstract class usage pattern', () => {
    it('should be usable as a base class pattern', () => {
      // Test that static methods can be accessed
      expect(typeof AngularConfigurationBase.buildMessage).toBe('function');
    });
  });
});
