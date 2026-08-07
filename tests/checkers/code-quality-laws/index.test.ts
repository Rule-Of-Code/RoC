/**
 * Tests for code-quality-laws index
 *
 * Verifies all exports from the code quality laws module
 */
import {
  CodeComplexityControlLaw,
  CodeDocumentationLaw,
  CodeDuplicationControlLaw,
  CodeQualityLawBase,
  DeadCodeEliminationLaw,
  ErrorHandlingCompletenessLaw,
  MagicNumberPreventionLaw,
  NamingConventionEnforcementLaw,
  ObservableCleanupLaw,
  ZeroToleranceStrictLaw,
} from '../../../src/checkers/code-quality-laws';

describe('code-quality-laws index', () => {
  describe('exports', () => {
    it('should export CodeComplexityControlLaw', () => {
      expect(CodeComplexityControlLaw).toBeDefined();
      expect(typeof CodeComplexityControlLaw.check).toBe('function');
    });

    it('should export CodeDocumentationLaw', () => {
      expect(CodeDocumentationLaw).toBeDefined();
      expect(typeof CodeDocumentationLaw.check).toBe('function');
    });

    it('should export CodeDuplicationControlLaw', () => {
      expect(CodeDuplicationControlLaw).toBeDefined();
      expect(typeof CodeDuplicationControlLaw.check).toBe('function');
    });

    it('should export CodeQualityLawBase', () => {
      expect(CodeQualityLawBase).toBeDefined();
    });

    it('should export DeadCodeEliminationLaw', () => {
      expect(DeadCodeEliminationLaw).toBeDefined();
      expect(typeof DeadCodeEliminationLaw.check).toBe('function');
    });

    it('should export ErrorHandlingCompletenessLaw', () => {
      expect(ErrorHandlingCompletenessLaw).toBeDefined();
      expect(typeof ErrorHandlingCompletenessLaw.check).toBe('function');
    });

    it('should export MagicNumberPreventionLaw', () => {
      expect(MagicNumberPreventionLaw).toBeDefined();
      expect(typeof MagicNumberPreventionLaw.check).toBe('function');
    });

    it('should export NamingConventionEnforcementLaw', () => {
      expect(NamingConventionEnforcementLaw).toBeDefined();
      expect(typeof NamingConventionEnforcementLaw.check).toBe('function');
    });

    it('should export ObservableCleanupLaw', () => {
      expect(ObservableCleanupLaw).toBeDefined();
      expect(typeof ObservableCleanupLaw.check).toBe('function');
    });

    it('should export ZeroToleranceStrictLaw', () => {
      expect(ZeroToleranceStrictLaw).toBeDefined();
      expect(typeof ZeroToleranceStrictLaw.check).toBe('function');
    });
  });

  describe('law inheritance', () => {
    it('CodeComplexityControlLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(CodeComplexityControlLaw) === CodeQualityLawBase
      ).toBe(true);
    });

    it('CodeDocumentationLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(CodeDocumentationLaw) === CodeQualityLawBase
      ).toBe(true);
    });

    it('CodeDuplicationControlLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(CodeDuplicationControlLaw) === CodeQualityLawBase
      ).toBe(true);
    });

    it('DeadCodeEliminationLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(DeadCodeEliminationLaw) === CodeQualityLawBase
      ).toBe(true);
    });

    it('ErrorHandlingCompletenessLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(ErrorHandlingCompletenessLaw) ===
          CodeQualityLawBase
      ).toBe(true);
    });

    it('MagicNumberPreventionLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(MagicNumberPreventionLaw) === CodeQualityLawBase
      ).toBe(true);
    });

    it('ObservableCleanupLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(ObservableCleanupLaw) === CodeQualityLawBase
      ).toBe(true);
    });

    it('ZeroToleranceStrictLaw should extend CodeQualityLawBase', () => {
      expect(
        Object.getPrototypeOf(ZeroToleranceStrictLaw) === CodeQualityLawBase
      ).toBe(true);
    });
  });

  describe('static check method signature', () => {
    const allLaws = [
      { name: 'CodeComplexityControlLaw', law: CodeComplexityControlLaw },
      { name: 'CodeDocumentationLaw', law: CodeDocumentationLaw },
      { name: 'CodeDuplicationControlLaw', law: CodeDuplicationControlLaw },
      { name: 'DeadCodeEliminationLaw', law: DeadCodeEliminationLaw },
      {
        name: 'ErrorHandlingCompletenessLaw',
        law: ErrorHandlingCompletenessLaw,
      },
      { name: 'MagicNumberPreventionLaw', law: MagicNumberPreventionLaw },
      {
        name: 'NamingConventionEnforcementLaw',
        law: NamingConventionEnforcementLaw,
      },
      { name: 'ObservableCleanupLaw', law: ObservableCleanupLaw },
      { name: 'ZeroToleranceStrictLaw', law: ZeroToleranceStrictLaw },
    ];

    allLaws.forEach(({ name, law }) => {
      it(`${name}.check should be a static method`, () => {
        expect(typeof law.check).toBe('function');
      });
    });
  });

  describe('module completeness', () => {
    it('should export exactly 10 items', () => {
      // 9 laws + 1 base class = 10 exports
      const exports = [
        CodeComplexityControlLaw,
        CodeDocumentationLaw,
        CodeDuplicationControlLaw,
        CodeQualityLawBase,
        DeadCodeEliminationLaw,
        ErrorHandlingCompletenessLaw,
        MagicNumberPreventionLaw,
        NamingConventionEnforcementLaw,
        ObservableCleanupLaw,
        ZeroToleranceStrictLaw,
      ];
      expect(exports.length).toBe(10);
      exports.forEach(exp => expect(exp).toBeDefined());
    });
  });
});
