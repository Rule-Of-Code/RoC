/**
 * Header Configuration Analyzer Configuration - Tests
 * Tests for HeaderConfigurationAnalyzerConfiguration class
 */
import { HeaderConfigurationAnalyzerConfiguration } from '../../../src/utils/constitutional/header-configuration-analyzer/header-configuration-analyzer-configuration';

describe('HeaderConfigurationAnalyzerConfiguration', () => {
  // ============================================
  // Static Constants
  // ============================================
  describe('Static Constants', () => {
    describe('HEADER_TEMPLATE_FILES', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(
            HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_FILES
          )
        ).toBe(true);
      });

      it('should have multiple template paths', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_FILES.length
        ).toBeGreaterThan(0);
      });

      it('should include templates/file-header.txt', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_FILES
        ).toContain('templates/file-header.txt');
      });

      it('should include .header-template', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_FILES
        ).toContain('.header-template');
      });
    });

    describe('HEADER_TEMPLATE_MESSAGES', () => {
      it('should have violationMessage', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_MESSAGES
            .violationMessage
        ).toBeDefined();
        expect(
          typeof HeaderConfigurationAnalyzerConfiguration
            .HEADER_TEMPLATE_MESSAGES.violationMessage
        ).toBe('string');
      });

      it('should have suggestionMessage', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_MESSAGES
            .suggestionMessage
        ).toBeDefined();
        expect(
          typeof HeaderConfigurationAnalyzerConfiguration
            .HEADER_TEMPLATE_MESSAGES.suggestionMessage
        ).toBe('string');
      });
    });

    describe('CONSTITUTIONAL_DOCS_FILES', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(
            HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_FILES
          )
        ).toBe(true);
      });

      it('should include CONSTITUTION.md', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_FILES
        ).toContain('CONSTITUTION.md');
      });

      it('should include POLICIES.md', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_FILES
        ).toContain('POLICIES.md');
      });

      it('should include CODE_OF_CONDUCT.md', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_FILES
        ).toContain('CODE_OF_CONDUCT.md');
      });
    });

    describe('CONSTITUTIONAL_DOCS_MESSAGES', () => {
      it('should have violationMessage', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_MESSAGES
            .violationMessage
        ).toBeDefined();
      });

      it('should have suggestionMessage', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_MESSAGES
            .suggestionMessage
        ).toBeDefined();
      });
    });

    describe('HEADER_TOOLS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS)
        ).toBe(true);
      });

      it('should have multiple tools', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS.length
        ).toBeGreaterThan(0);
      });

      it('should include license-header', () => {
        expect(HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS).toContain(
          'license-header'
        );
      });
    });

    describe('HEADER_TOOLS_SUGGESTION', () => {
      it('should be a string', () => {
        expect(
          typeof HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS_SUGGESTION
        ).toBe('string');
      });

      it('should mention license-header', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS_SUGGESTION
        ).toContain('license-header');
      });
    });

    describe('HEADER_SCRIPT_NAMES', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(
            HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_NAMES
          )
        ).toBe(true);
      });

      it('should include header', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_NAMES
        ).toContain('header');
      });

      it('should include license', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_NAMES
        ).toContain('license');
      });

      it('should include copyright', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_NAMES
        ).toContain('copyright');
      });
    });

    describe('HEADER_SCRIPT_SUGGESTION', () => {
      it('should be a string', () => {
        expect(
          typeof HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_SUGGESTION
        ).toBe('string');
      });

      it('should mention npm scripts', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_SUGGESTION
        ).toContain('npm scripts');
      });
    });

    describe('PACKAGE_JSON_CONFIG', () => {
      it('should have fileName', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.PACKAGE_JSON_CONFIG.fileName
        ).toBe('package.json');
      });

      it('should have fallbackSuggestion', () => {
        expect(
          HeaderConfigurationAnalyzerConfiguration.PACKAGE_JSON_CONFIG
            .fallbackSuggestion
        ).toBeDefined();
      });
    });
  });

  // ============================================
  // Getter Methods
  // ============================================
  describe('Getter Methods', () => {
    describe('getHeaderTemplatePatterns()', () => {
      it('should return template files', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getHeaderTemplatePatterns();
        expect(result.templateFiles).toBeDefined();
        expect(Array.isArray(result.templateFiles)).toBe(true);
      });

      it('should return violation message', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getHeaderTemplatePatterns();
        expect(result.violationMessage).toBeDefined();
        expect(typeof result.violationMessage).toBe('string');
      });

      it('should return suggestion message', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getHeaderTemplatePatterns();
        expect(result.suggestionMessage).toBeDefined();
        expect(typeof result.suggestionMessage).toBe('string');
      });
    });

    describe('getConstitutionalDocsPatterns()', () => {
      it('should return document files', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getConstitutionalDocsPatterns();
        expect(result.documentFiles).toBeDefined();
        expect(Array.isArray(result.documentFiles)).toBe(true);
      });

      it('should return violation message', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getConstitutionalDocsPatterns();
        expect(result.violationMessage).toBeDefined();
      });

      it('should return suggestion message', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getConstitutionalDocsPatterns();
        expect(result.suggestionMessage).toBeDefined();
      });
    });

    describe('getPackageJsonHeaderToolsPatterns()', () => {
      it('should return header tools', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getPackageJsonHeaderToolsPatterns();
        expect(result.headerTools).toBeDefined();
        expect(Array.isArray(result.headerTools)).toBe(true);
      });

      it('should return suggestion message', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getPackageJsonHeaderToolsPatterns();
        expect(result.suggestionMessage).toBeDefined();
      });
    });

    describe('getHeaderScriptPatterns()', () => {
      it('should return script names', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getHeaderScriptPatterns();
        expect(result.scriptNames).toBeDefined();
        expect(Array.isArray(result.scriptNames)).toBe(true);
      });

      it('should return suggestion message', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getHeaderScriptPatterns();
        expect(result.suggestionMessage).toBeDefined();
      });
    });

    describe('getPackageJsonConfig()', () => {
      it('should return fileName', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getPackageJsonConfig();
        expect(result.fileName).toBe('package.json');
      });

      it('should return fallbackSuggestion', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getPackageJsonConfig();
        expect(result.fallbackSuggestion).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          HeaderConfigurationAnalyzerConfiguration.getPackageJsonConfig();
        expect(result).toBe(
          HeaderConfigurationAnalyzerConfiguration.PACKAGE_JSON_CONFIG
        );
      });
    });
  });
});
