/**
 * Tests for NgRx State Normalization Types
 *
 * Tests TypeScript interface compliance and type structures.
 */
import {
  EntityUsageResult,
  NestedStateResult,
  NormalizationPatternResult,
  SelectorCompositionResult,
  StateConsistencyResult,
  StateNormalizationAnalysisResult,
} from '../../../src/laws/angular/ngrx-state-normalization-mandate/constants/types';

describe('NgRx State Normalization Types', () => {
  describe('EntityUsageResult', () => {
    it('should accept valid EntityUsageResult with required fields only', () => {
      const result: EntityUsageResult = {
        hasEntityAdapter: true,
        entityFiles: ['user.entity.ts'],
      };
      expect(result.hasEntityAdapter).toBe(true);
      expect(result.entityFiles).toEqual(['user.entity.ts']);
    });

    it('should accept EntityUsageResult with all fields', () => {
      const result: EntityUsageResult = {
        hasEntityAdapter: true,
        version: '13.0.0',
        entityFiles: ['user.entity.ts', 'product.entity.ts'],
      };
      expect(result.hasEntityAdapter).toBe(true);
      expect(result.version).toBe('13.0.0');
      expect(result.entityFiles.length).toBe(2);
    });

    it('should accept EntityUsageResult with false and empty array', () => {
      const result: EntityUsageResult = {
        hasEntityAdapter: false,
        entityFiles: [],
      };
      expect(result.hasEntityAdapter).toBe(false);
      expect(result.entityFiles.length).toBe(0);
    });
  });

  describe('NormalizationPatternResult', () => {
    it('should accept valid NormalizationPatternResult', () => {
      const result: NormalizationPatternResult = {
        followsPatterns: true,
        violations: [],
        issueCount: 0,
      };
      expect(result.followsPatterns).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.issueCount).toBe(0);
    });

    it('should accept result with violations', () => {
      const result: NormalizationPatternResult = {
        followsPatterns: false,
        violations: ['Nested state detected', 'Missing entity adapter'],
        issueCount: 2,
      };
      expect(result.followsPatterns).toBe(false);
      expect(result.violations.length).toBe(2);
      expect(result.issueCount).toBe(2);
    });
  });

  describe('NestedStateResult', () => {
    it('should accept valid NestedStateResult', () => {
      const result: NestedStateResult = {
        hasNestedState: false,
        examples: [],
        severity: 'low',
      };
      expect(result.hasNestedState).toBe(false);
      expect(result.examples).toEqual([]);
      expect(result.severity).toBe('low');
    });

    it('should accept all severity levels', () => {
      const severities: NestedStateResult['severity'][] = [
        'critical',
        'high',
        'medium',
        'low',
      ];
      severities.forEach(severity => {
        const result: NestedStateResult = {
          hasNestedState: true,
          examples: ['nested object'],
          severity,
        };
        expect(result.severity).toBe(severity);
      });
    });

    it('should accept result with examples', () => {
      const result: NestedStateResult = {
        hasNestedState: true,
        examples: ['user.profile.settings', 'order.items[0].details'],
        severity: 'high',
      };
      expect(result.hasNestedState).toBe(true);
      expect(result.examples.length).toBe(2);
    });
  });

  describe('SelectorCompositionResult', () => {
    it('should accept valid SelectorCompositionResult', () => {
      const result: SelectorCompositionResult = {
        followsBestPractices: true,
        issues: [],
        issueCount: 0,
      };
      expect(result.followsBestPractices).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.issueCount).toBe(0);
    });

    it('should accept result with issues', () => {
      const result: SelectorCompositionResult = {
        followsBestPractices: false,
        issues: ['Missing feature selector', 'Direct state access'],
        issueCount: 2,
      };
      expect(result.followsBestPractices).toBe(false);
      expect(result.issues.length).toBe(2);
      expect(result.issueCount).toBe(2);
    });
  });

  describe('StateConsistencyResult', () => {
    it('should accept valid StateConsistencyResult', () => {
      const result: StateConsistencyResult = {
        isConsistent: true,
        inconsistencies: [],
        stateShapeCount: 1,
      };
      expect(result.isConsistent).toBe(true);
      expect(result.inconsistencies).toEqual([]);
      expect(result.stateShapeCount).toBe(1);
    });

    it('should accept result with inconsistencies', () => {
      const result: StateConsistencyResult = {
        isConsistent: false,
        inconsistencies: ['Different state shapes in reducers'],
        stateShapeCount: 3,
      };
      expect(result.isConsistent).toBe(false);
      expect(result.inconsistencies.length).toBe(1);
      expect(result.stateShapeCount).toBe(3);
    });
  });

  describe('StateNormalizationAnalysisResult', () => {
    it('should accept valid composite result', () => {
      const result: StateNormalizationAnalysisResult = {
        entityUsage: {
          hasEntityAdapter: true,
          entityFiles: ['user.entity.ts'],
        },
        normalization: {
          followsPatterns: true,
          violations: [],
          issueCount: 0,
        },
        nestedState: {
          hasNestedState: false,
          examples: [],
          severity: 'low',
        },
        selectorComposition: {
          followsBestPractices: true,
          issues: [],
          issueCount: 0,
        },
        stateConsistency: {
          isConsistent: true,
          inconsistencies: [],
          stateShapeCount: 1,
        },
      };
      expect(result.entityUsage.hasEntityAdapter).toBe(true);
      expect(result.normalization.followsPatterns).toBe(true);
      expect(result.nestedState.hasNestedState).toBe(false);
      expect(result.selectorComposition.followsBestPractices).toBe(true);
      expect(result.stateConsistency.isConsistent).toBe(true);
    });
  });
});
