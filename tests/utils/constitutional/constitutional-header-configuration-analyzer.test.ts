/**
 * Header Configuration Analyzer - Tests
 * Tests for HeaderConfigurationAnalyzer class
 */
import { HeaderConfigurationAnalyzer } from '../../../src/utils/constitutional/header-configuration-analyzer/header-configuration-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('HeaderConfigurationAnalyzer', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'header-configuration-analyzer-test-'
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
      expect(typeof HeaderConfigurationAnalyzer).toBe('function');
    });

    it('should have checkHeaderConfiguration static method', () => {
      expect(typeof HeaderConfigurationAnalyzer.checkHeaderConfiguration).toBe(
        'function'
      );
    });
  });

  // ============================================
  // checkHeaderConfiguration Method Tests
  // ============================================
  describe('checkHeaderConfiguration()', () => {
    describe('result structure', () => {
      it('should return object with violations array', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        expect(result).toHaveProperty('violations');
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return object with suggestions array', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('when no configuration exists', () => {
      it('should return violations for missing header template', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasTemplateViolation = result.violations.some(v =>
          v.toLowerCase().includes('template')
        );
        expect(hasTemplateViolation).toBe(true);
      });

      it('should return violations for missing constitutional docs', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasDocsViolation = result.violations.some(
          v =>
            v.toLowerCase().includes('constitutional') ||
            v.toLowerCase().includes('documentation')
        );
        expect(hasDocsViolation).toBe(true);
      });

      it('should return suggestions', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when header template exists', () => {
      beforeEach(() => {
        const templatesPath = PathOperations.join(tempDir, 'templates');
        FileUtils.createDirectory(templatesPath);
        FileUtils.writeFileSync(
          PathOperations.join(templatesPath, 'file-header.txt'),
          '/**\n * Copyright 2024\n * @license MIT\n */'
        );
      });

      it('should not report template violation', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasTemplateViolation = result.violations.some(v =>
          v.toLowerCase().includes('header template')
        );
        expect(hasTemplateViolation).toBe(false);
      });
    });

    describe('when CONSTITUTION.md exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'CONSTITUTION.md'),
          '# Constitution\n\nProject policies...'
        );
      });

      it('should not report constitutional docs violation', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasDocsViolation = result.violations.some(
          v => v.toLowerCase() === 'no constitutional documentation found'
        );
        expect(hasDocsViolation).toBe(false);
      });
    });

    describe('when POLICIES.md exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'POLICIES.md'),
          '# Policies\n\nProject policies...'
        );
      });

      it('should not report constitutional docs violation', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasDocsViolation = result.violations.some(
          v => v.toLowerCase() === 'no constitutional documentation found'
        );
        expect(hasDocsViolation).toBe(false);
      });
    });

    describe('when CODE_OF_CONDUCT.md exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'CODE_OF_CONDUCT.md'),
          '# Code of Conduct\n\nBe nice...'
        );
      });

      it('should not report constitutional docs violation', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasDocsViolation = result.violations.some(
          v => v.toLowerCase() === 'no constitutional documentation found'
        );
        expect(hasDocsViolation).toBe(false);
      });
    });

    describe('when package.json has header tools', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            devDependencies: {
              'license-header': '^1.0.0',
            },
          })
        );
      });

      it('should not suggest adding header tools', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasToolSuggestion = result.suggestions.some(
          s =>
            s.toLowerCase().includes('license-header') &&
            s.toLowerCase().includes('consider')
        );
        expect(hasToolSuggestion).toBe(false);
      });
    });

    describe('when package.json has header scripts', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {
              header: 'add-license-header',
            },
          })
        );
      });

      it('should not suggest adding header scripts', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        const hasScriptSuggestion = result.suggestions.some(
          s =>
            s.toLowerCase().includes('npm scripts') &&
            s.toLowerCase().includes('automated header')
        );
        expect(hasScriptSuggestion).toBe(false);
      });
    });

    describe('with complete configuration', () => {
      beforeEach(() => {
        // Create template
        const templatesPath = PathOperations.join(tempDir, 'templates');
        FileUtils.createDirectory(templatesPath);
        FileUtils.writeFileSync(
          PathOperations.join(templatesPath, 'file-header.txt'),
          '/**\n * Copyright 2024\n */'
        );

        // Create constitution
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'CONSTITUTION.md'),
          '# Constitution'
        );

        // Create package.json with tools and scripts
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {
              header: 'add-license-header',
            },
            devDependencies: {
              'license-header': '^1.0.0',
            },
          })
        );
      });

      it('should return no violations', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        expect(result.violations).toHaveLength(0);
      });

      it('should return no suggestions', () => {
        const result =
          HeaderConfigurationAnalyzer.checkHeaderConfiguration(tempDir);
        expect(result.suggestions).toHaveLength(0);
      });
    });
  });
});
