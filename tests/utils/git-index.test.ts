/**
 * Git Index (Barrel) Tests
 * Tests for the git utility module barrel exports
 */
import * as GitModule from '../../src/utils/git';

describe('git/index (barrel exports)', () => {
  describe('Automated Review Tools Analyzer exports', () => {
    it('should export AutomatedReviewToolsAnalyzer', () => {
      expect(GitModule.AutomatedReviewToolsAnalyzer).toBeDefined();
    });

    it('should export AutomatedReviewToolsAnalyzerConfiguration', () => {
      expect(GitModule.AutomatedReviewToolsAnalyzerConfiguration).toBeDefined();
    });

    it('should export AutomatedReviewToolsAnalyzerValidation', () => {
      expect(GitModule.AutomatedReviewToolsAnalyzerValidation).toBeDefined();
    });

    it('should have checkAutomatedReviewTools method', () => {
      expect(
        typeof GitModule.AutomatedReviewToolsAnalyzer.checkAutomatedReviewTools
      ).toBe('function');
    });
  });

  describe('Review Guidelines Analyzer exports', () => {
    it('should export ReviewGuidelinesAnalyzer', () => {
      expect(GitModule.ReviewGuidelinesAnalyzer).toBeDefined();
    });

    it('should export ReviewGuidelinesAnalyzerConfiguration', () => {
      expect(GitModule.ReviewGuidelinesAnalyzerConfiguration).toBeDefined();
    });

    it('should export ReviewGuidelinesAnalyzerValidation', () => {
      expect(GitModule.ReviewGuidelinesAnalyzerValidation).toBeDefined();
    });

    it('should have checkReviewGuidelines method', () => {
      expect(
        typeof GitModule.ReviewGuidelinesAnalyzer.checkReviewGuidelines
      ).toBe('function');
    });
  });

  describe('Review Templates Analyzer exports', () => {
    it('should export ReviewTemplatesAnalyzer', () => {
      expect(GitModule.ReviewTemplatesAnalyzer).toBeDefined();
    });

    it('should export ReviewTemplatesAnalyzerConfiguration', () => {
      expect(GitModule.ReviewTemplatesAnalyzerConfiguration).toBeDefined();
    });

    it('should export ReviewTemplatesAnalyzerValidation', () => {
      expect(GitModule.ReviewTemplatesAnalyzerValidation).toBeDefined();
    });

    it('should have checkReviewTemplates method', () => {
      expect(
        typeof GitModule.ReviewTemplatesAnalyzer.checkReviewTemplates
      ).toBe('function');
    });
  });

  describe('All exports are functional', () => {
    it('should export 9 main classes/modules', () => {
      const expectedExports = [
        'AutomatedReviewToolsAnalyzer',
        'AutomatedReviewToolsAnalyzerConfiguration',
        'AutomatedReviewToolsAnalyzerValidation',
        'ReviewGuidelinesAnalyzer',
        'ReviewGuidelinesAnalyzerConfiguration',
        'ReviewGuidelinesAnalyzerValidation',
        'ReviewTemplatesAnalyzer',
        'ReviewTemplatesAnalyzerConfiguration',
        'ReviewTemplatesAnalyzerValidation',
      ];

      for (const exportName of expectedExports) {
        expect(
          (GitModule as unknown as Record<string, unknown>)[exportName]
        ).toBeDefined();
      }
    });
  });
});
