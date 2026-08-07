/**
 * File Header Compliance Configuration - Tests
 * Tests for FileHeaderComplianceConfiguration class
 */
import { FileHeaderComplianceConfiguration } from '../../../src/utils/constitutional/file-header-compliance/file-header-compliance-configuration';

describe('FileHeaderComplianceConfiguration', () => {
  // ============================================
  // Static Constants
  // ============================================
  describe('Static Constants', () => {
    describe('FILE_HEADER_ANALYSIS_CONFIG', () => {
      it('should have maxSampleFiles', () => {
        expect(
          FileHeaderComplianceConfiguration.FILE_HEADER_ANALYSIS_CONFIG
            .maxSampleFiles
        ).toBe(20);
      });

      it('should have maxSearchDepth', () => {
        expect(
          FileHeaderComplianceConfiguration.FILE_HEADER_ANALYSIS_CONFIG
            .maxSearchDepth
        ).toBe(3);
      });

      it('should have maxExampleFiles', () => {
        expect(
          FileHeaderComplianceConfiguration.FILE_HEADER_ANALYSIS_CONFIG
            .maxExampleFiles
        ).toBe(3);
      });

      it('should have fileHeaderAnalysisLines', () => {
        expect(
          FileHeaderComplianceConfiguration.FILE_HEADER_ANALYSIS_CONFIG
            .fileHeaderAnalysisLines
        ).toBe(10);
      });
    });

    describe('HEADER_INDICATOR_PATTERNS', () => {
      it('should have patterns array', () => {
        expect(
          Array.isArray(
            FileHeaderComplianceConfiguration.HEADER_INDICATOR_PATTERNS.patterns
          )
        ).toBe(true);
      });

      it('should include copyright pattern', () => {
        expect(
          FileHeaderComplianceConfiguration.HEADER_INDICATOR_PATTERNS.patterns
        ).toContain('copyright');
      });

      it('should include license pattern', () => {
        expect(
          FileHeaderComplianceConfiguration.HEADER_INDICATOR_PATTERNS.patterns
        ).toContain('license');
      });

      it('should include @fileoverview pattern', () => {
        expect(
          FileHeaderComplianceConfiguration.HEADER_INDICATOR_PATTERNS.patterns
        ).toContain('@fileoverview');
      });

      it('should include @author pattern', () => {
        expect(
          FileHeaderComplianceConfiguration.HEADER_INDICATOR_PATTERNS.patterns
        ).toContain('@author');
      });
    });

    describe('SOURCE_FILE_CONFIG', () => {
      it('should have extensions array', () => {
        expect(
          Array.isArray(
            FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG.extensions
          )
        ).toBe(true);
      });

      it('should include .ts extension', () => {
        expect(
          FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG.extensions
        ).toContain('.ts');
      });

      it('should include .js extension', () => {
        expect(
          FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG.extensions
        ).toContain('.js');
      });

      it('should have skipPatterns array', () => {
        expect(
          Array.isArray(
            FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG.skipPatterns
          )
        ).toBe(true);
      });

      it('should skip test files', () => {
        expect(
          FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG.skipPatterns
        ).toContain('.test.');
      });

      it('should skip spec files', () => {
        expect(
          FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG.skipPatterns
        ).toContain('.spec.');
      });
    });

    describe('DIRECTORY_FILTER_CONFIG', () => {
      it('should have skipDirectories array', () => {
        expect(
          Array.isArray(
            FileHeaderComplianceConfiguration.DIRECTORY_FILTER_CONFIG
              .skipDirectories
          )
        ).toBe(true);
      });

      it('should skip node_modules', () => {
        expect(
          FileHeaderComplianceConfiguration.DIRECTORY_FILTER_CONFIG
            .skipDirectories
        ).toContain('node_modules');
      });

      it('should skip dist', () => {
        expect(
          FileHeaderComplianceConfiguration.DIRECTORY_FILTER_CONFIG
            .skipDirectories
        ).toContain('dist');
      });

      it('should skip .git', () => {
        expect(
          FileHeaderComplianceConfiguration.DIRECTORY_FILTER_CONFIG
            .skipDirectories
        ).toContain('.git');
      });

      it('should have srcDirectory', () => {
        expect(
          FileHeaderComplianceConfiguration.DIRECTORY_FILTER_CONFIG.srcDirectory
        ).toBe('src');
      });
    });

    describe('FILE_READING_CONFIG', () => {
      it('should have encoding', () => {
        expect(
          FileHeaderComplianceConfiguration.FILE_READING_CONFIG.encoding
        ).toBe('utf8');
      });

      it('should have errorHandling', () => {
        expect(
          FileHeaderComplianceConfiguration.FILE_READING_CONFIG.errorHandling
        ).toBe('skip');
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have violations', () => {
        expect(
          FileHeaderComplianceConfiguration.VALIDATION_MESSAGES.violations
        ).toBeDefined();
        expect(
          FileHeaderComplianceConfiguration.VALIDATION_MESSAGES.violations
            .missingHeaders
        ).toBeDefined();
      });

      it('should have suggestions', () => {
        expect(
          FileHeaderComplianceConfiguration.VALIDATION_MESSAGES.suggestions
        ).toBeDefined();
        expect(
          FileHeaderComplianceConfiguration.VALIDATION_MESSAGES.suggestions
            .addHeaders
        ).toBeDefined();
        expect(
          FileHeaderComplianceConfiguration.VALIDATION_MESSAGES.suggestions
            .includeCompliance
        ).toBeDefined();
      });
    });
  });

  // ============================================
  // Getter Methods
  // ============================================
  describe('Getter Methods', () => {
    describe('getFileHeaderAnalysisConfig()', () => {
      it('should return file header analysis config', () => {
        const result =
          FileHeaderComplianceConfiguration.getFileHeaderAnalysisConfig();
        expect(result.maxSampleFiles).toBeDefined();
        expect(result.maxSearchDepth).toBeDefined();
        expect(result.maxExampleFiles).toBeDefined();
        expect(result.fileHeaderAnalysisLines).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          FileHeaderComplianceConfiguration.getFileHeaderAnalysisConfig();
        expect(result).toBe(
          FileHeaderComplianceConfiguration.FILE_HEADER_ANALYSIS_CONFIG
        );
      });
    });

    describe('getHeaderIndicatorPatterns()', () => {
      it('should return header indicator patterns', () => {
        const result =
          FileHeaderComplianceConfiguration.getHeaderIndicatorPatterns();
        expect(result.patterns).toBeDefined();
        expect(Array.isArray(result.patterns)).toBe(true);
      });

      it('should return same as static constant', () => {
        const result =
          FileHeaderComplianceConfiguration.getHeaderIndicatorPatterns();
        expect(result).toBe(
          FileHeaderComplianceConfiguration.HEADER_INDICATOR_PATTERNS
        );
      });
    });

    describe('getSourceFileConfig()', () => {
      it('should return source file config', () => {
        const result = FileHeaderComplianceConfiguration.getSourceFileConfig();
        expect(result.extensions).toBeDefined();
        expect(result.skipPatterns).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result = FileHeaderComplianceConfiguration.getSourceFileConfig();
        expect(result).toBe(
          FileHeaderComplianceConfiguration.SOURCE_FILE_CONFIG
        );
      });
    });

    describe('getDirectoryFilterConfig()', () => {
      it('should return directory filter config', () => {
        const result =
          FileHeaderComplianceConfiguration.getDirectoryFilterConfig();
        expect(result.skipDirectories).toBeDefined();
        expect(result.srcDirectory).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          FileHeaderComplianceConfiguration.getDirectoryFilterConfig();
        expect(result).toBe(
          FileHeaderComplianceConfiguration.DIRECTORY_FILTER_CONFIG
        );
      });
    });

    describe('getFileReadingConfig()', () => {
      it('should return file reading config', () => {
        const result = FileHeaderComplianceConfiguration.getFileReadingConfig();
        expect(result.encoding).toBeDefined();
        expect(result.errorHandling).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result = FileHeaderComplianceConfiguration.getFileReadingConfig();
        expect(result).toBe(
          FileHeaderComplianceConfiguration.FILE_READING_CONFIG
        );
      });
    });

    describe('getValidationMessages()', () => {
      it('should return validation messages', () => {
        const result =
          FileHeaderComplianceConfiguration.getValidationMessages();
        expect(result.violations).toBeDefined();
        expect(result.suggestions).toBeDefined();
      });

      it('should return same as static constant', () => {
        const result =
          FileHeaderComplianceConfiguration.getValidationMessages();
        expect(result).toBe(
          FileHeaderComplianceConfiguration.VALIDATION_MESSAGES
        );
      });
    });
  });

  // ============================================
  // Utility Methods
  // ============================================
  describe('Utility Methods', () => {
    describe('shouldSkipDirectory()', () => {
      it('should return true for node_modules', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('node_modules')
        ).toBe(true);
      });

      it('should return true for dist', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('dist')
        ).toBe(true);
      });

      it('should return true for .git', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('.git')
        ).toBe(true);
      });

      it('should return true for test', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('test')
        ).toBe(true);
      });

      it('should return true for coverage', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('coverage')
        ).toBe(true);
      });

      it('should return false for src', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('src')
        ).toBe(false);
      });

      it('should return false for lib', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('lib')
        ).toBe(false);
      });

      it('should return false for custom directory', () => {
        expect(
          FileHeaderComplianceConfiguration.shouldSkipDirectory('custom')
        ).toBe(false);
      });
    });
  });
});
