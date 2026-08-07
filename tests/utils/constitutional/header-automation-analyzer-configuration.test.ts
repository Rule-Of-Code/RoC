/**
 * Header Automation Analyzer Configuration - Tests
 * Tests for HeaderAutomationAnalyzerConfiguration class
 */
import { HeaderAutomationAnalyzerConfiguration } from '../../../src/utils/constitutional/header-automation-analyzer/header-automation-analyzer-configuration';

describe('HeaderAutomationAnalyzerConfiguration', () => {
  // ============================================
  // Static Constants
  // ============================================
  describe('Static Constants', () => {
    describe('HEADER_KEYWORDS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(HeaderAutomationAnalyzerConfiguration.HEADER_KEYWORDS)
        ).toBe(true);
      });

      it('should contain header keyword', () => {
        expect(HeaderAutomationAnalyzerConfiguration.HEADER_KEYWORDS).toContain(
          'header'
        );
      });

      it('should contain copyright keyword', () => {
        expect(HeaderAutomationAnalyzerConfiguration.HEADER_KEYWORDS).toContain(
          'copyright'
        );
      });

      it('should contain license keyword', () => {
        expect(HeaderAutomationAnalyzerConfiguration.HEADER_KEYWORDS).toContain(
          'license'
        );
      });
    });

    describe('YAML_EXTENSIONS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(HeaderAutomationAnalyzerConfiguration.YAML_EXTENSIONS)
        ).toBe(true);
      });

      it('should contain .yml', () => {
        expect(HeaderAutomationAnalyzerConfiguration.YAML_EXTENSIONS).toContain(
          '.yml'
        );
      });

      it('should contain .yaml', () => {
        expect(HeaderAutomationAnalyzerConfiguration.YAML_EXTENSIONS).toContain(
          '.yaml'
        );
      });
    });

    describe('GITHUB_ACTIONS_PATTERNS', () => {
      it('should have workflowPath', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS
            .workflowPath
        ).toBeDefined();
        expect(
          HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS
            .workflowPath
        ).toContain('.github');
        expect(
          HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS
            .workflowPath
        ).toContain('workflows');
      });

      it('should have fileExtensions', () => {
        const exts =
          HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS
            .fileExtensions;
        expect(Array.isArray(exts)).toBe(true);
        expect(exts).toContain('.yml');
      });

      it('should have headerKeywords', () => {
        const keywords =
          HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS
            .headerKeywords;
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeGreaterThan(0);
      });
    });

    describe('HUSKY_HOOKS_PATTERNS', () => {
      it('should have huskyPath', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.HUSKY_HOOKS_PATTERNS.huskyPath
        ).toBe('.husky');
      });

      it('should have headerKeywords', () => {
        const keywords =
          HeaderAutomationAnalyzerConfiguration.HUSKY_HOOKS_PATTERNS
            .headerKeywords;
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeGreaterThan(0);
      });
    });

    describe('PRE_COMMIT_PATTERNS', () => {
      it('should have configFile', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.PRE_COMMIT_PATTERNS.configFile
        ).toBe('.pre-commit-config.yaml');
      });

      it('should have headerKeywords', () => {
        const keywords =
          HeaderAutomationAnalyzerConfiguration.PRE_COMMIT_PATTERNS
            .headerKeywords;
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeGreaterThan(0);
      });
    });

    describe('CUSTOM_HEADER_TOOLS_PATHS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(
            HeaderAutomationAnalyzerConfiguration.CUSTOM_HEADER_TOOLS_PATHS
          )
        ).toBe(true);
      });

      it('should have multiple paths', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.CUSTOM_HEADER_TOOLS_PATHS.length
        ).toBeGreaterThan(0);
      });
    });

    describe('HEADER_AUTOMATION_SUGGESTIONS', () => {
      it('should have noAutomation array', () => {
        expect(
          Array.isArray(
            HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_SUGGESTIONS
              .noAutomation
          )
        ).toBe(true);
      });

      it('should have preCommitHooks string', () => {
        expect(
          typeof HeaderAutomationAnalyzerConfiguration
            .HEADER_AUTOMATION_SUGGESTIONS.preCommitHooks
        ).toBe('string');
      });

      it('should have githubActions string', () => {
        expect(
          typeof HeaderAutomationAnalyzerConfiguration
            .HEADER_AUTOMATION_SUGGESTIONS.githubActions
        ).toBe('string');
      });
    });

    describe('HEADER_AUTOMATION_VIOLATIONS', () => {
      it('should have noAutomation message', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_VIOLATIONS
            .noAutomation
        ).toBeDefined();
        expect(
          typeof HeaderAutomationAnalyzerConfiguration
            .HEADER_AUTOMATION_VIOLATIONS.noAutomation
        ).toBe('string');
      });
    });

    describe('FILE_READING_CONFIG', () => {
      it('should have encoding', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.FILE_READING_CONFIG.encoding
        ).toBe('utf8');
      });

      it('should have fallbackToEmpty', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.FILE_READING_CONFIG
            .fallbackToEmpty
        ).toBe(true);
      });
    });

    describe('DIRECTORY_READING_CONFIG', () => {
      it('should have withFileTypes', () => {
        expect(
          HeaderAutomationAnalyzerConfiguration.DIRECTORY_READING_CONFIG
            .withFileTypes
        ).toBe(false);
      });
    });
  });

  // ============================================
  // Getter Methods
  // ============================================
  describe('Getter Methods', () => {
    describe('getGitHubActionsPatterns()', () => {
      it('should return GitHub Actions patterns', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getGitHubActionsPatterns();
        expect(result.workflowPath).toBeDefined();
        expect(result.fileExtensions).toBeDefined();
        expect(result.headerKeywords).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getGitHubActionsPatterns();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS
        );
      });
    });

    describe('getHuskyHooksPatterns()', () => {
      it('should return Husky hooks patterns', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getHuskyHooksPatterns();
        expect(result.huskyPath).toBeDefined();
        expect(result.headerKeywords).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getHuskyHooksPatterns();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.HUSKY_HOOKS_PATTERNS
        );
      });
    });

    describe('getPreCommitPatterns()', () => {
      it('should return pre-commit patterns', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getPreCommitPatterns();
        expect(result.configFile).toBeDefined();
        expect(result.headerKeywords).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getPreCommitPatterns();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.PRE_COMMIT_PATTERNS
        );
      });
    });

    describe('getPackageJsonScriptPatterns()', () => {
      it('should return package.json script patterns', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getPackageJsonScriptPatterns();
        expect(result.headerKeywords).toBeDefined();
        expect(Array.isArray(result.headerKeywords)).toBe(true);
      });
    });

    describe('getCustomHeaderToolsPatterns()', () => {
      it('should return custom header tools patterns', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getCustomHeaderToolsPatterns();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getCustomHeaderToolsPatterns();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.CUSTOM_HEADER_TOOLS_PATHS
        );
      });
    });

    describe('getImprovementSuggestions()', () => {
      it('should return improvement suggestions', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getImprovementSuggestions();
        expect(result.noAutomation).toBeDefined();
        expect(result.preCommitHooks).toBeDefined();
        expect(result.githubActions).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getImprovementSuggestions();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_SUGGESTIONS
        );
      });
    });

    describe('getViolationMessages()', () => {
      it('should return violation messages', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getViolationMessages();
        expect(result.noAutomation).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getViolationMessages();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_VIOLATIONS
        );
      });
    });

    describe('getFileReadingConfig()', () => {
      it('should return file reading config', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getFileReadingConfig();
        expect(result.encoding).toBe('utf8');
        expect(result.fallbackToEmpty).toBe(true);
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getFileReadingConfig();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.FILE_READING_CONFIG
        );
      });
    });

    describe('getDirectoryReadingConfig()', () => {
      it('should return directory reading config', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getDirectoryReadingConfig();
        expect(result.withFileTypes).toBe(false);
      });

      it('should return same as static constant', () => {
        const result =
          HeaderAutomationAnalyzerConfiguration.getDirectoryReadingConfig();
        expect(result).toBe(
          HeaderAutomationAnalyzerConfiguration.DIRECTORY_READING_CONFIG
        );
      });
    });
  });
});
