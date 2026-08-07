/**
 * Header Automation Analyzer - Tests
 * Tests for HeaderAutomationAnalyzer class
 */
import { HeaderAutomationAnalyzer } from '../../../src/utils/constitutional/header-automation-analyzer/header-automation-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('HeaderAutomationAnalyzer', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('header-automation-analyzer-test-');
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
      expect(typeof HeaderAutomationAnalyzer).toBe('function');
    });

    it('should have checkHeaderAutomation static method', () => {
      expect(typeof HeaderAutomationAnalyzer.checkHeaderAutomation).toBe(
        'function'
      );
    });
  });

  // ============================================
  // checkHeaderAutomation Method Tests
  // ============================================
  describe('checkHeaderAutomation()', () => {
    describe('result structure', () => {
      it('should return object with violations array', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result).toHaveProperty('violations');
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return object with suggestions array', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('when no automation exists', () => {
      it('should return violations for missing automation', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should include "no automated" in violation message', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        const hasNoAutomation = result.violations.some(
          v =>
            v.toLowerCase().includes('no automated') ||
            (v.toLowerCase().includes('no') &&
              v.toLowerCase().includes('header management'))
        );
        expect(hasNoAutomation).toBe(true);
      });

      it('should return suggestions for setting up automation', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when husky hooks exist with header keywords', () => {
      beforeEach(() => {
        const huskyPath = PathOperations.join(tempDir, '.husky');
        FileUtils.createDirectory(huskyPath);
        FileUtils.writeFileSync(
          PathOperations.join(huskyPath, 'pre-commit'),
          '#!/bin/sh\nnpm run add-header'
        );
        // Create .git directory to enable husky detection
        const gitPath = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(gitPath);
      });

      it('should return no violations', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('when GitHub Actions exist with header keywords', () => {
      beforeEach(() => {
        const workflowPath = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowPath);
        FileUtils.writeFileSync(
          PathOperations.join(workflowPath, 'header-check.yml'),
          'name: Header Check\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run check-header'
        );
      });

      it('should return no violations', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('when pre-commit config exists with header keywords', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, '.pre-commit-config.yaml'),
          'repos:\n  - hooks:\n      - id: license-header'
        );
      });

      it('should return no violations', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('when package.json has header scripts', () => {
      beforeEach(() => {
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {
              'add-header': 'node scripts/add-headers.js',
            },
          })
        );
      });

      it('should return no violations', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('when custom header tools exist', () => {
      beforeEach(() => {
        const scriptsPath = PathOperations.join(tempDir, 'scripts');
        FileUtils.createDirectory(scriptsPath);
        FileUtils.writeFileSync(
          PathOperations.join(scriptsPath, 'add-headers.js'),
          'console.log("Adding headers")'
        );
      });

      it('should return no violations', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('improvement suggestions', () => {
      beforeEach(() => {
        // Create only one form of automation
        FileUtils.writeFileSync(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {
              'add-header': 'node scripts/add-headers.js',
            },
          })
        );
      });

      it('should suggest pre-commit hooks when not present', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        const hasPreCommitSuggestion = result.suggestions.some(
          s =>
            s.toLowerCase().includes('pre-commit') ||
            s.toLowerCase().includes('hook')
        );
        expect(hasPreCommitSuggestion).toBe(true);
      });

      it('should suggest GitHub Actions when not present', () => {
        const result = HeaderAutomationAnalyzer.checkHeaderAutomation(tempDir);
        const hasGitHubSuggestion = result.suggestions.some(
          s =>
            s.toLowerCase().includes('github') ||
            s.toLowerCase().includes('action')
        );
        expect(hasGitHubSuggestion).toBe(true);
      });
    });
  });
});
