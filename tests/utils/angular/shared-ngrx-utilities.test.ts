/**
 * @fileoverview Tests for shared-ngrx-utilities.ts
 * @description Tests for Shared NgRx Utilities
 */

import { NgRxAnalysisUtilities } from '../../../src/utils/angular/shared-ngrx-utilities';
import { SEVERITY_THRESHOLDS } from '../../../src/utils/constants';

describe('utils/angular/shared-ngrx-utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxAnalysisUtilities', () => {
    describe('SEVERITY_CONFIG', () => {
      it('should have correct threshold values', () => {
        const config = NgRxAnalysisUtilities.SEVERITY_CONFIG;

        expect(config.thresholds.high).toBe(SEVERITY_THRESHOLDS.HIGH);
        expect(config.thresholds.medium).toBe(SEVERITY_THRESHOLDS.MEDIUM);
      });

      it('should have correct level values', () => {
        const config = NgRxAnalysisUtilities.SEVERITY_CONFIG;

        expect(config.levels.high).toBe('high');
        expect(config.levels.medium).toBe('medium');
        expect(config.levels.low).toBe('low');
      });

      it('should have correct category values', () => {
        const config = NgRxAnalysisUtilities.SEVERITY_CONFIG;

        expect(config.categories.dependency).toBe(
          SEVERITY_THRESHOLDS.CATEGORIES.DEPENDENCY
        );
        expect(config.categories.module).toBe(
          SEVERITY_THRESHOLDS.CATEGORIES.MODULE
        );
        expect(config.categories.devtools).toBe(
          SEVERITY_THRESHOLDS.CATEGORIES.DEVTOOLS
        );
        expect(config.categories.feature).toBe(
          SEVERITY_THRESHOLDS.CATEGORIES.FEATURE
        );
      });
    });

    describe('calculateSeverity', () => {
      it('should return high for violations above high threshold', () => {
        const highThreshold = SEVERITY_THRESHOLDS.HIGH;
        const result = NgRxAnalysisUtilities.calculateSeverity(
          highThreshold + 1
        );

        expect(result).toBe('high');
      });

      it('should return medium for violations above medium threshold', () => {
        const mediumThreshold = SEVERITY_THRESHOLDS.MEDIUM;
        const highThreshold = SEVERITY_THRESHOLDS.HIGH;

        const result = NgRxAnalysisUtilities.calculateSeverity(
          mediumThreshold + 1
        );

        if (mediumThreshold + 1 <= highThreshold) {
          expect(result).toBe('medium');
        }
      });

      it('should return low for violations at or below medium threshold', () => {
        const result = NgRxAnalysisUtilities.calculateSeverity(0);

        expect(result).toBe('low');
      });

      it('should return low for zero violations', () => {
        const result = NgRxAnalysisUtilities.calculateSeverity(0);

        expect(result).toBe('low');
      });
    });

    describe('matchesCategoryIgnoreCase', () => {
      it('should match when text contains category case-insensitively', () => {
        expect(
          NgRxAnalysisUtilities.matchesCategoryIgnoreCase(
            'Missing DEPENDENCY',
            'dependency'
          )
        ).toBe(true);
      });

      it('should match when category is uppercase', () => {
        expect(
          NgRxAnalysisUtilities.matchesCategoryIgnoreCase(
            'module configuration error',
            'MODULE'
          )
        ).toBe(true);
      });

      it('should return false when text does not contain category', () => {
        expect(
          NgRxAnalysisUtilities.matchesCategoryIgnoreCase(
            'Some random text',
            'dependency'
          )
        ).toBe(false);
      });

      it('should handle empty strings', () => {
        expect(
          NgRxAnalysisUtilities.matchesCategoryIgnoreCase('', 'category')
        ).toBe(false);
        expect(
          NgRxAnalysisUtilities.matchesCategoryIgnoreCase('some text', '')
        ).toBe(true);
      });
    });

    describe('countIssuesByCategory', () => {
      it('should count issues matching category in violations', () => {
        const violations = [
          'Missing dependency: @ngrx/store',
          'Missing dependency: @ngrx/effects',
          'Module configuration error',
        ];
        const suggestions: string[] = [];

        const result = NgRxAnalysisUtilities.countIssuesByCategory(
          violations,
          suggestions,
          'dependency'
        );

        expect(result).toBe(2);
      });

      it('should count issues matching category in suggestions', () => {
        const violations: string[] = [];
        const suggestions = [
          'Consider adding devtools for debugging',
          'DevTools configuration is recommended',
        ];

        const result = NgRxAnalysisUtilities.countIssuesByCategory(
          violations,
          suggestions,
          'devtools'
        );

        expect(result).toBe(2);
      });

      it('should count issues in both violations and suggestions', () => {
        const violations = ['Feature store not configured'];
        const suggestions = ['Feature store organization recommended'];

        const result = NgRxAnalysisUtilities.countIssuesByCategory(
          violations,
          suggestions,
          'feature'
        );

        expect(result).toBe(2);
      });

      it('should return zero when no matches found', () => {
        const violations = ['Some violation'];
        const suggestions = ['Some suggestion'];

        const result = NgRxAnalysisUtilities.countIssuesByCategory(
          violations,
          suggestions,
          'nonexistent'
        );

        expect(result).toBe(0);
      });
    });

    describe('calculateSetupAreas', () => {
      it('should calculate counts for all setup areas', () => {
        const violations = [
          'Dependency issue',
          'Module configuration problem',
          'DevTools not configured',
          'Feature store missing',
        ];
        const suggestions = ['Add dependency', 'Configure module'];

        const result = NgRxAnalysisUtilities.calculateSetupAreas(
          violations,
          suggestions
        );

        expect(result.dependencyIssues).toBeGreaterThanOrEqual(1);
        expect(result.moduleConfigIssues).toBeGreaterThanOrEqual(1);
        expect(result.devtoolsIssues).toBeGreaterThanOrEqual(1);
        expect(result.featureStoreIssues).toBeGreaterThanOrEqual(1);
      });

      it('should return zeros when no issues match categories', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        const result = NgRxAnalysisUtilities.calculateSetupAreas(
          violations,
          suggestions
        );

        expect(result.dependencyIssues).toBe(0);
        expect(result.moduleConfigIssues).toBe(0);
        expect(result.devtoolsIssues).toBe(0);
        expect(result.featureStoreIssues).toBe(0);
      });
    });

    describe('deduplicateResults', () => {
      it('should remove duplicate violations', () => {
        const results = {
          violations: ['Violation A', 'Violation A', 'Violation B'],
          suggestions: ['Suggestion A'],
        };

        const result = NgRxAnalysisUtilities.deduplicateResults(results);

        expect(result.violations).toHaveLength(2);
        expect(result.violations).toContain('Violation A');
        expect(result.violations).toContain('Violation B');
      });

      it('should remove duplicate suggestions', () => {
        const results = {
          violations: ['Violation A'],
          suggestions: ['Suggestion A', 'Suggestion A', 'Suggestion B'],
        };

        const result = NgRxAnalysisUtilities.deduplicateResults(results);

        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions).toContain('Suggestion A');
        expect(result.suggestions).toContain('Suggestion B');
      });

      it('should handle empty arrays', () => {
        const results = {
          violations: [],
          suggestions: [],
        };

        const result = NgRxAnalysisUtilities.deduplicateResults(results);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should preserve unique items', () => {
        const results = {
          violations: ['A', 'B', 'C'],
          suggestions: ['D', 'E', 'F'],
        };

        const result = NgRxAnalysisUtilities.deduplicateResults(results);

        expect(result.violations).toHaveLength(3);
        expect(result.suggestions).toHaveLength(3);
      });
    });

    describe('getSetupAnalysisSummary', () => {
      it('should calculate total issues correctly', () => {
        const results = {
          violations: ['V1', 'V2'],
          suggestions: ['S1', 'S2', 'S3'],
        };

        const summary = NgRxAnalysisUtilities.getSetupAnalysisSummary(results);

        expect(summary.totalIssues).toBe(5);
        expect(summary.violationsCount).toBe(2);
        expect(summary.suggestionsCount).toBe(3);
      });

      it('should set analysisComplete to true', () => {
        const results = {
          violations: [],
          suggestions: [],
        };

        const summary = NgRxAnalysisUtilities.getSetupAnalysisSummary(results);

        expect(summary.analysisComplete).toBe(true);
      });

      it('should calculate severity based on violations count', () => {
        const lowResults = {
          violations: [],
          suggestions: [],
        };

        const lowSummary =
          NgRxAnalysisUtilities.getSetupAnalysisSummary(lowResults);
        expect(lowSummary.severity).toBe('low');

        const highResults = {
          violations: Array(SEVERITY_THRESHOLDS.HIGH + 1).fill('violation'),
          suggestions: [],
        };

        const highSummary =
          NgRxAnalysisUtilities.getSetupAnalysisSummary(highResults);
        expect(highSummary.severity).toBe('high');
      });

      it('should include setup areas breakdown', () => {
        const results = {
          violations: ['Dependency missing', 'Module error'],
          suggestions: ['Add devtools', 'Feature store recommended'],
        };

        const summary = NgRxAnalysisUtilities.getSetupAnalysisSummary(results);

        expect(summary.setupAreas).toBeDefined();
        expect(typeof summary.setupAreas.dependencyIssues).toBe('number');
        expect(typeof summary.setupAreas.moduleConfigIssues).toBe('number');
        expect(typeof summary.setupAreas.devtoolsIssues).toBe('number');
        expect(typeof summary.setupAreas.featureStoreIssues).toBe('number');
      });

      it('should handle empty results', () => {
        const results = {
          violations: [],
          suggestions: [],
        };

        const summary = NgRxAnalysisUtilities.getSetupAnalysisSummary(results);

        expect(summary.totalIssues).toBe(0);
        expect(summary.violationsCount).toBe(0);
        expect(summary.suggestionsCount).toBe(0);
        expect(summary.severity).toBe('low');
        expect(summary.analysisComplete).toBe(true);
      });
    });
  });
});
