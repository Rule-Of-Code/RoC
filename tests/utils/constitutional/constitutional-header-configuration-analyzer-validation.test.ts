/**
 * Header Configuration Analyzer Validation - Tests
 * Tests for HeaderConfigurationAnalyzerValidation class
 */
import { HeaderConfigurationAnalyzerValidation } from '../../../src/utils/constitutional/header-configuration-analyzer/header-configuration-analyzer-validation';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('HeaderConfigurationAnalyzerValidation', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('header-config-validation-test-');
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
      expect(typeof HeaderConfigurationAnalyzerValidation).toBe('function');
    });

    it('should have executeHeaderConfigurationAnalysisWorkflow static method', () => {
      expect(
        typeof HeaderConfigurationAnalyzerValidation.executeHeaderConfigurationAnalysisWorkflow
      ).toBe('function');
    });

    it('should have checkHeaderTemplates static method', () => {
      expect(
        typeof HeaderConfigurationAnalyzerValidation.checkHeaderTemplates
      ).toBe('function');
    });

    it('should have checkConstitutionalDocs static method', () => {
      expect(
        typeof HeaderConfigurationAnalyzerValidation.checkConstitutionalDocs
      ).toBe('function');
    });

    it('should have checkPackageJsonConfiguration static method', () => {
      expect(
        typeof HeaderConfigurationAnalyzerValidation.checkPackageJsonConfiguration
      ).toBe('function');
    });

    it('should have checkHeaderTools static method', () => {
      expect(
        typeof HeaderConfigurationAnalyzerValidation.checkHeaderTools
      ).toBe('function');
    });

    it('should have checkHeaderScripts static method', () => {
      expect(
        typeof HeaderConfigurationAnalyzerValidation.checkHeaderScripts
      ).toBe('function');
    });
  });

  // ============================================
  // executeHeaderConfigurationAnalysisWorkflow Method Tests
  // ============================================
  describe('executeHeaderConfigurationAnalysisWorkflow()', () => {
    describe('result structure', () => {
      it('should return object with violations array', () => {
        const result =
          HeaderConfigurationAnalyzerValidation.executeHeaderConfigurationAnalysisWorkflow(
            tempDir
          );
        expect(result).toHaveProperty('violations');
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return object with suggestions array', () => {
        const result =
          HeaderConfigurationAnalyzerValidation.executeHeaderConfigurationAnalysisWorkflow(
            tempDir
          );
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('when no configuration exists', () => {
      it('should return violations', () => {
        const result =
          HeaderConfigurationAnalyzerValidation.executeHeaderConfigurationAnalysisWorkflow(
            tempDir
          );
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should return suggestions', () => {
        const result =
          HeaderConfigurationAnalyzerValidation.executeHeaderConfigurationAnalysisWorkflow(
            tempDir
          );
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================
  // checkHeaderTemplates Method Tests
  // ============================================
  describe('checkHeaderTemplates()', () => {
    describe('when no template exists', () => {
      it('should add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(violations.length).toBeGreaterThan(0);
      });

      it('should add suggestion', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should include template in violation message', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        const hasTemplateMessage = violations.some(v =>
          v.toLowerCase().includes('template')
        );
        expect(hasTemplateMessage).toBe(true);
      });
    });

    describe('when templates/file-header.txt exists', () => {
      beforeEach(() => {
        const templatesPath = PathOperations.join(tempDir, 'templates');
        FileUtils.createDirectory(templatesPath);
        FileUtils.writeFileSync(
          PathOperations.join(templatesPath, 'file-header.txt'),
          '/**\n * Copyright 2024\n */'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });

      it('should not add suggestion', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when config/header-template.txt exists', () => {
      beforeEach(() => {
        const configPath = PathOperations.join(tempDir, 'config');
        FileUtils.createDirectory(configPath);
        FileUtils.writeFileSync(
          PathOperations.join(configPath, 'header-template.txt'),
          '/**\n * Copyright 2024\n */'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });
    });

    describe('when .header-template exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, '.header-template'),
          '/**\n * Copyright 2024\n */'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });
    });

    describe('when docs/header-template.md exists', () => {
      beforeEach(() => {
        const docsPath = PathOperations.join(tempDir, 'docs');
        FileUtils.createDirectory(docsPath);
        FileUtils.writeFileSync(
          PathOperations.join(docsPath, 'header-template.md'),
          '# Header Template\n\n```\n/**\n * Copyright 2024\n */\n```'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTemplates(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });
    });
  });

  // ============================================
  // checkConstitutionalDocs Method Tests
  // ============================================
  describe('checkConstitutionalDocs()', () => {
    describe('when no docs exist', () => {
      it('should add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkConstitutionalDocs(
          tempDir,
          violations,
          suggestions
        );
        expect(violations.length).toBeGreaterThan(0);
      });

      it('should add suggestion', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkConstitutionalDocs(
          tempDir,
          violations,
          suggestions
        );
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when CONSTITUTION.md exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'CONSTITUTION.md'),
          '# Constitution'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkConstitutionalDocs(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });
    });

    describe('when POLICIES.md exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'POLICIES.md'),
          '# Policies'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkConstitutionalDocs(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });
    });

    describe('when CODE_OF_CONDUCT.md exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'CODE_OF_CONDUCT.md'),
          '# Code of Conduct'
        );
      });

      it('should not add violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkConstitutionalDocs(
          tempDir,
          violations,
          suggestions
        );
        expect(violations).toHaveLength(0);
      });
    });
  });

  // ============================================
  // checkPackageJsonConfiguration Method Tests
  // ============================================
  describe('checkPackageJsonConfiguration()', () => {
    describe('when package.json does not exist', () => {
      it('should not throw error', () => {
        const suggestions: string[] = [];
        expect(() => {
          HeaderConfigurationAnalyzerValidation.checkPackageJsonConfiguration(
            tempDir,
            suggestions
          );
        }).not.toThrow();
      });
    });

    describe('when package.json exists', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({ name: 'test-project' })
        );
      });

      it('should add header tool suggestion when no tools', () => {
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkPackageJsonConfiguration(
          tempDir,
          suggestions
        );
        const hasToolSuggestion = suggestions.some(
          s =>
            s.toLowerCase().includes('license') ||
            s.toLowerCase().includes('header')
        );
        expect(hasToolSuggestion).toBe(true);
      });

      it('should add script suggestion when no scripts', () => {
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkPackageJsonConfiguration(
          tempDir,
          suggestions
        );
        const hasScriptSuggestion = suggestions.some(s =>
          s.toLowerCase().includes('script')
        );
        expect(hasScriptSuggestion).toBe(true);
      });
    });
  });

  // ============================================
  // checkHeaderTools Method Tests
  // ============================================
  describe('checkHeaderTools()', () => {
    describe('when no tools exist', () => {
      it('should add suggestion', () => {
        const packageJson = { name: 'test' };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTools(
          packageJson,
          suggestions
        );
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when license-header exists in dependencies', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          dependencies: { 'license-header': '^1.0.0' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTools(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when license-header exists in devDependencies', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          devDependencies: { 'license-header': '^1.0.0' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTools(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when @coorpacademy/license-header exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          devDependencies: { '@coorpacademy/license-header': '^1.0.0' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTools(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when add-license-header exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          devDependencies: { 'add-license-header': '^1.0.0' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTools(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when copyright-header exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          devDependencies: { 'copyright-header': '^1.0.0' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderTools(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });
  });

  // ============================================
  // checkHeaderScripts Method Tests
  // ============================================
  describe('checkHeaderScripts()', () => {
    describe('when no scripts exist', () => {
      it('should add suggestion', () => {
        const packageJson = { name: 'test' };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderScripts(
          packageJson,
          suggestions
        );
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when header script exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          scripts: { header: 'add-license-header' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderScripts(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when license script exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          scripts: { license: 'add-license-header' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderScripts(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when copyright script exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          scripts: { copyright: 'add-copyright' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderScripts(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('when add-headers script exists', () => {
      it('should not add suggestion', () => {
        const packageJson = {
          name: 'test',
          scripts: { 'add-headers': 'node scripts/add-headers.js' },
        };
        const suggestions: string[] = [];
        HeaderConfigurationAnalyzerValidation.checkHeaderScripts(
          packageJson,
          suggestions
        );
        expect(suggestions).toHaveLength(0);
      });
    });
  });
});
