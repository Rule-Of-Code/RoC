/**
 * Header Automation Analyzer Validation - Tests
 * Tests for HeaderAutomationAnalyzerValidation class
 */
import { HeaderAutomationAnalyzerValidation } from '../../../src/utils/constitutional/header-automation-analyzer/header-automation-analyzer-validation';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('HeaderAutomationAnalyzerValidation', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'header-automation-validation-test-'
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
      expect(typeof HeaderAutomationAnalyzerValidation).toBe('function');
    });

    it('should have executeHeaderAutomationAnalysisWorkflow static method', () => {
      expect(
        typeof HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow
      ).toBe('function');
    });

    it('should have checkHuskyHooks static method', () => {
      expect(typeof HeaderAutomationAnalyzerValidation.checkHuskyHooks).toBe(
        'function'
      );
    });

    it('should have checkGitHubActions static method', () => {
      expect(typeof HeaderAutomationAnalyzerValidation.checkGitHubActions).toBe(
        'function'
      );
    });

    it('should have checkPreCommitConfig static method', () => {
      expect(
        typeof HeaderAutomationAnalyzerValidation.checkPreCommitConfig
      ).toBe('function');
    });

    it('should have checkPackageJsonScripts static method', () => {
      expect(
        typeof HeaderAutomationAnalyzerValidation.checkPackageJsonScripts
      ).toBe('function');
    });

    it('should have checkCustomHeaderTools static method', () => {
      expect(
        typeof HeaderAutomationAnalyzerValidation.checkCustomHeaderTools
      ).toBe('function');
    });

    it('should have addImprovementSuggestions static method', () => {
      expect(
        typeof HeaderAutomationAnalyzerValidation.addImprovementSuggestions
      ).toBe('function');
    });

    it('should have hasHeaderInScripts static method', () => {
      expect(typeof HeaderAutomationAnalyzerValidation.hasHeaderInScripts).toBe(
        'function'
      );
    });
  });

  // ============================================
  // executeHeaderAutomationAnalysisWorkflow Method Tests
  // ============================================
  describe('executeHeaderAutomationAnalysisWorkflow()', () => {
    describe('result structure', () => {
      it('should return object with violations array', () => {
        const result =
          HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
            tempDir
          );
        expect(result).toHaveProperty('violations');
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return object with suggestions array', () => {
        const result =
          HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
            tempDir
          );
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('when no automation exists', () => {
      it('should return violations', () => {
        const result =
          HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
            tempDir
          );
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should return suggestions', () => {
        const result =
          HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
            tempDir
          );
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when some automation exists', () => {
      beforeEach(() => {
        // Create Husky hooks to trigger hasAnyAutomation = true
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
        const huskyPath = PathOperations.join(tempDir, '.husky');
        FileUtils.createDirectory(huskyPath);
        FileUtils.writeFileSync(
          PathOperations.join(huskyPath, 'pre-commit'),
          '#!/bin/sh\nnpm run add-header'
        );
      });

      it('should return empty violations when automation exists', () => {
        const result =
          HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
            tempDir
          );
        expect(result.violations).toEqual([]);
      });

      it('should provide improvement suggestions', () => {
        const result =
          HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
            tempDir
          );
        // When hasHeaderHook=true, other automations=false, should suggest GitHub Actions/pre-commit
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================
  // checkHuskyHooks Method Tests
  // ============================================
  describe('checkHuskyHooks()', () => {
    describe('when .husky directory does not exist', () => {
      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkHuskyHooks(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when .husky exists but no header keywords', () => {
      beforeEach(() => {
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
        const huskyPath = PathOperations.join(tempDir, '.husky');
        FileUtils.createDirectory(huskyPath);
        FileUtils.writeFileSync(
          PathOperations.join(huskyPath, 'pre-commit'),
          '#!/bin/sh\nnpm test'
        );
      });

      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkHuskyHooks(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when .husky exists with header keywords', () => {
      beforeEach(() => {
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
        const huskyPath = PathOperations.join(tempDir, '.husky');
        FileUtils.createDirectory(huskyPath);
        FileUtils.writeFileSync(
          PathOperations.join(huskyPath, 'pre-commit'),
          '#!/bin/sh\nnpm run add-header'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkHuskyHooks(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when .husky has copyright keyword', () => {
      beforeEach(() => {
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
        const huskyPath = PathOperations.join(tempDir, '.husky');
        FileUtils.createDirectory(huskyPath);
        FileUtils.writeFileSync(
          PathOperations.join(huskyPath, 'pre-commit'),
          '#!/bin/sh\nnpm run check-copyright'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkHuskyHooks(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when .husky has license keyword', () => {
      beforeEach(() => {
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
        const huskyPath = PathOperations.join(tempDir, '.husky');
        FileUtils.createDirectory(huskyPath);
        FileUtils.writeFileSync(
          PathOperations.join(huskyPath, 'pre-commit'),
          '#!/bin/sh\nnpm run add-license'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkHuskyHooks(tempDir);
        expect(result).toBe(true);
      });
    });
    describe('when git hooks exist but .husky does not', () => {
      beforeEach(() => {
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
        const hooksPath = PathOperations.join(gitPath, 'hooks');
        FileUtils.createDirectory(hooksPath);
        FileUtils.writeFileSync(
          PathOperations.join(hooksPath, 'pre-commit'),
          '#!/bin/sh\nnpm test'
        );
      });

      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkHuskyHooks(tempDir);
        expect(result).toBe(false);
      });
    });
  });

  // ============================================
  // checkGitHubActions Method Tests
  // ============================================
  describe('checkGitHubActions()', () => {
    describe('when .github/workflows does not exist', () => {
      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkGitHubActions(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when workflows exist but no header keywords', () => {
      beforeEach(() => {
        const workflowPath = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowPath);
        FileUtils.writeFileSync(
          PathOperations.join(workflowPath, 'ci.yml'),
          'name: CI\njobs:\n  build:\n    runs-on: ubuntu-latest'
        );
      });

      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkGitHubActions(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when workflows have header keywords', () => {
      beforeEach(() => {
        const workflowPath = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowPath);
        FileUtils.writeFileSync(
          PathOperations.join(workflowPath, 'header.yml'),
          'name: Header Check\njobs:\n  check-header:\n    runs-on: ubuntu-latest'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkGitHubActions(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when workflows have license keywords', () => {
      beforeEach(() => {
        const workflowPath = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowPath);
        FileUtils.writeFileSync(
          PathOperations.join(workflowPath, 'license.yml'),
          'name: License Check\njobs:\n  check-license:\n    runs-on: ubuntu-latest'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkGitHubActions(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when workflows directory has non-yaml files', () => {
      beforeEach(() => {
        const workflowPath = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowPath);
        // Non-yaml file with header keyword - should be skipped by extension filter
        FileUtils.writeFileSync(
          PathOperations.join(workflowPath, 'README.txt'),
          'header instructions for workflows'
        );
        // Valid yaml file without header keyword
        FileUtils.writeFileSync(
          PathOperations.join(workflowPath, 'build.yml'),
          'name: Build\njobs:\n  build:\n    runs-on: ubuntu-latest'
        );
      });

      it('should skip non-yaml files and return false when no yaml files have header keywords', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkGitHubActions(tempDir);
        expect(result).toBe(false);
      });
    });
  });

  // ============================================
  // checkPreCommitConfig Method Tests
  // ============================================
  describe('checkPreCommitConfig()', () => {
    describe('when .pre-commit-config.yaml does not exist', () => {
      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPreCommitConfig(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when config exists but no header keywords', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, '.pre-commit-config.yaml'),
          'repos:\n  - hooks:\n      - id: trailing-whitespace'
        );
      });

      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPreCommitConfig(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when config has header keywords', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, '.pre-commit-config.yaml'),
          'repos:\n  - hooks:\n      - id: add-header'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPreCommitConfig(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when config has license keywords', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, '.pre-commit-config.yaml'),
          'repos:\n  - hooks:\n      - id: license-check'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPreCommitConfig(tempDir);
        expect(result).toBe(true);
      });
    });
  });

  // ============================================
  // checkPackageJsonScripts Method Tests
  // ============================================
  describe('checkPackageJsonScripts()', () => {
    describe('when package.json does not exist', () => {
      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPackageJsonScripts(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when package.json has no scripts', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({ name: 'test' })
        );
      });

      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPackageJsonScripts(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when scripts have no header keywords', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test',
            scripts: { build: 'tsc', test: 'jest' },
          })
        );
      });

      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPackageJsonScripts(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when scripts have header keywords', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test',
            scripts: { 'add-header': 'node scripts/header.js' },
          })
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkPackageJsonScripts(tempDir);
        expect(result).toBe(true);
      });
    });
  });

  // ============================================
  // checkCustomHeaderTools Method Tests
  // ============================================
  describe('checkCustomHeaderTools()', () => {
    describe('when no custom tools exist', () => {
      it('should return false', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkCustomHeaderTools(tempDir);
        expect(result).toBe(false);
      });
    });

    describe('when scripts/add-headers.js exists', () => {
      beforeEach(() => {
        const scriptsPath = PathOperations.join(tempDir, 'scripts');
        FileUtils.createDirectory(scriptsPath);
        FileUtils.writeFileSync(
          PathOperations.join(scriptsPath, 'add-headers.js'),
          'console.log("Adding headers")'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkCustomHeaderTools(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when scripts/update-headers.sh exists', () => {
      beforeEach(() => {
        const scriptsPath = PathOperations.join(tempDir, 'scripts');
        FileUtils.createDirectory(scriptsPath);
        FileUtils.writeFileSync(
          PathOperations.join(scriptsPath, 'update-headers.sh'),
          '#!/bin/sh\necho "Updating headers"'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkCustomHeaderTools(tempDir);
        expect(result).toBe(true);
      });
    });

    describe('when tools/header-tool.js exists', () => {
      beforeEach(() => {
        const toolsPath = PathOperations.join(tempDir, 'tools');
        FileUtils.createDirectory(toolsPath);
        FileUtils.writeFileSync(
          PathOperations.join(toolsPath, 'header-tool.js'),
          'console.log("Header tool")'
        );
      });

      it('should return true', () => {
        const result =
          HeaderAutomationAnalyzerValidation.checkCustomHeaderTools(tempDir);
        expect(result).toBe(true);
      });
    });
  });

  // ============================================
  // addImprovementSuggestions Method Tests
  // ============================================
  describe('addImprovementSuggestions()', () => {
    it('should add pre-commit suggestion when no hooks present', () => {
      const suggestions: string[] = [];
      HeaderAutomationAnalyzerValidation.addImprovementSuggestions(
        suggestions,
        false, // hasHeaderHook
        false, // hasPreCommitHeaders
        true // hasAutomatedHeaders
      );
      const hasPreCommitSuggestion = suggestions.some(s =>
        s.toLowerCase().includes('pre-commit')
      );
      expect(hasPreCommitSuggestion).toBe(true);
    });

    it('should add GitHub Actions suggestion when not present', () => {
      const suggestions: string[] = [];
      HeaderAutomationAnalyzerValidation.addImprovementSuggestions(
        suggestions,
        true, // hasHeaderHook
        true, // hasPreCommitHeaders
        false // hasAutomatedHeaders
      );
      const hasGitHubSuggestion = suggestions.some(
        s =>
          s.toLowerCase().includes('github') ||
          s.toLowerCase().includes('action')
      );
      expect(hasGitHubSuggestion).toBe(true);
    });

    it('should not add suggestions when all automation present', () => {
      const suggestions: string[] = [];
      HeaderAutomationAnalyzerValidation.addImprovementSuggestions(
        suggestions,
        true, // hasHeaderHook
        true, // hasPreCommitHeaders
        true // hasAutomatedHeaders
      );
      expect(suggestions).toHaveLength(0);
    });
  });

  // ============================================
  // hasHeaderInScripts Method Tests
  // ============================================
  describe('hasHeaderInScripts()', () => {
    it('should return false for null scripts', () => {
      const result =
        HeaderAutomationAnalyzerValidation.hasHeaderInScripts(null);
      expect(result).toBe(false);
    });

    it('should return false for empty scripts', () => {
      const result = HeaderAutomationAnalyzerValidation.hasHeaderInScripts({});
      expect(result).toBe(false);
    });

    it('should return false for scripts without header keywords', () => {
      const result = HeaderAutomationAnalyzerValidation.hasHeaderInScripts({
        build: 'tsc',
        test: 'jest',
      });
      expect(result).toBe(false);
    });

    it('should return true for scripts with header keyword', () => {
      const result = HeaderAutomationAnalyzerValidation.hasHeaderInScripts({
        'add-header': 'node scripts/header.js',
      });
      expect(result).toBe(true);
    });

    it('should return true for scripts with copyright keyword', () => {
      const result = HeaderAutomationAnalyzerValidation.hasHeaderInScripts({
        'add-copyright': 'node scripts/copyright.js',
      });
      expect(result).toBe(true);
    });

    it('should return true for scripts with license keyword', () => {
      const result = HeaderAutomationAnalyzerValidation.hasHeaderInScripts({
        'add-license': 'node scripts/license.js',
      });
      expect(result).toBe(true);
    });
  });
});
