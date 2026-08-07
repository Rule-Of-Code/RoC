/**
 * Sacred Laws Index - Tests
 * Comprehensive tests for all exports from sacred-laws index
 */
import * as SacredLaws from '../../../src/checkers/sacred-laws';
import {
  AutomationFirstLaw,
  ConstitutionalSupremacyLaw,
  ContinuousComplianceLaw,
  ProfessionalExcellenceLaw,
  SacredLawBase,
  SacredMetricsLaw,
  TypeScriptStrictLaw,
  ZeroToleranceLaw,
} from '../../../src/checkers/sacred-laws';

describe('Sacred Laws Index', () => {
  // ============================================
  // Namespace export
  // ============================================
  describe('Namespace export', () => {
    it('should export SacredLaws namespace', () => {
      expect(SacredLaws).toBeDefined();
    });

    it('should export AutomationFirstLaw', () => {
      expect(SacredLaws.AutomationFirstLaw).toBeDefined();
    });

    it('should export ConstitutionalSupremacyLaw', () => {
      expect(SacredLaws.ConstitutionalSupremacyLaw).toBeDefined();
    });

    it('should export ContinuousComplianceLaw', () => {
      expect(SacredLaws.ContinuousComplianceLaw).toBeDefined();
    });

    it('should export ProfessionalExcellenceLaw', () => {
      expect(SacredLaws.ProfessionalExcellenceLaw).toBeDefined();
    });

    it('should export SacredLawBase', () => {
      expect(SacredLaws.SacredLawBase).toBeDefined();
    });

    it('should export SacredMetricsLaw', () => {
      expect(SacredLaws.SacredMetricsLaw).toBeDefined();
    });

    it('should export TypeScriptStrictLaw', () => {
      expect(SacredLaws.TypeScriptStrictLaw).toBeDefined();
    });

    it('should export ZeroToleranceLaw', () => {
      expect(SacredLaws.ZeroToleranceLaw).toBeDefined();
    });
  });

  // ============================================
  // Named exports
  // ============================================
  describe('Named exports', () => {
    it('should export AutomationFirstLaw as named export', () => {
      expect(AutomationFirstLaw).toBeDefined();
      expect(typeof AutomationFirstLaw).toBe('function');
    });

    it('should export ConstitutionalSupremacyLaw as named export', () => {
      expect(ConstitutionalSupremacyLaw).toBeDefined();
      expect(typeof ConstitutionalSupremacyLaw).toBe('function');
    });

    it('should export ContinuousComplianceLaw as named export', () => {
      expect(ContinuousComplianceLaw).toBeDefined();
      expect(typeof ContinuousComplianceLaw).toBe('function');
    });

    it('should export ProfessionalExcellenceLaw as named export', () => {
      expect(ProfessionalExcellenceLaw).toBeDefined();
      expect(typeof ProfessionalExcellenceLaw).toBe('function');
    });

    it('should export SacredLawBase as named export', () => {
      expect(SacredLawBase).toBeDefined();
      expect(typeof SacredLawBase).toBe('function');
    });

    it('should export SacredMetricsLaw as named export', () => {
      expect(SacredMetricsLaw).toBeDefined();
      expect(typeof SacredMetricsLaw).toBe('function');
    });

    it('should export TypeScriptStrictLaw as named export', () => {
      expect(TypeScriptStrictLaw).toBeDefined();
      expect(typeof TypeScriptStrictLaw).toBe('function');
    });

    it('should export ZeroToleranceLaw as named export', () => {
      expect(ZeroToleranceLaw).toBeDefined();
      expect(typeof ZeroToleranceLaw).toBe('function');
    });
  });

  // ============================================
  // Class instantiation
  // ============================================
  describe('Class instantiation', () => {
    it('should instantiate AutomationFirstLaw', () => {
      const instance = new AutomationFirstLaw();
      expect(instance).toBeInstanceOf(AutomationFirstLaw);
    });

    it('should instantiate ConstitutionalSupremacyLaw', () => {
      const instance = new ConstitutionalSupremacyLaw();
      expect(instance).toBeInstanceOf(ConstitutionalSupremacyLaw);
    });

    it('should instantiate ContinuousComplianceLaw', () => {
      const instance = new ContinuousComplianceLaw();
      expect(instance).toBeInstanceOf(ContinuousComplianceLaw);
    });

    it('should instantiate ProfessionalExcellenceLaw', () => {
      const instance = new ProfessionalExcellenceLaw();
      expect(instance).toBeInstanceOf(ProfessionalExcellenceLaw);
    });

    it('should instantiate SacredMetricsLaw', () => {
      const instance = new SacredMetricsLaw();
      expect(instance).toBeInstanceOf(SacredMetricsLaw);
    });

    it('should instantiate TypeScriptStrictLaw', () => {
      const instance = new TypeScriptStrictLaw();
      expect(instance).toBeInstanceOf(TypeScriptStrictLaw);
    });

    it('should instantiate ZeroToleranceLaw', () => {
      const instance = new ZeroToleranceLaw();
      expect(instance).toBeInstanceOf(ZeroToleranceLaw);
    });
  });

  // ============================================
  // Class methods
  // ============================================
  describe('Class methods', () => {
    it('AutomationFirstLaw should have check method', () => {
      expect(typeof AutomationFirstLaw.check).toBe('function');
    });

    it('ConstitutionalSupremacyLaw should have check method', () => {
      expect(typeof ConstitutionalSupremacyLaw.check).toBe('function');
    });

    it('ContinuousComplianceLaw should have check method', () => {
      expect(typeof ContinuousComplianceLaw.check).toBe('function');
    });

    it('ProfessionalExcellenceLaw should have check method', () => {
      expect(typeof ProfessionalExcellenceLaw.check).toBe('function');
    });

    it('SacredMetricsLaw should have check method', () => {
      expect(typeof SacredMetricsLaw.check).toBe('function');
    });

    it('TypeScriptStrictLaw should have check method', () => {
      expect(typeof TypeScriptStrictLaw.check).toBe('function');
    });

    it('ZeroToleranceLaw should have check method', () => {
      expect(typeof ZeroToleranceLaw.check).toBe('function');
    });
  });

  // ============================================
  // Export consistency
  // ============================================
  describe('Export consistency', () => {
    it('namespace export should match named export for AutomationFirstLaw', () => {
      expect(SacredLaws.AutomationFirstLaw).toBe(AutomationFirstLaw);
    });

    it('namespace export should match named export for ConstitutionalSupremacyLaw', () => {
      expect(SacredLaws.ConstitutionalSupremacyLaw).toBe(
        ConstitutionalSupremacyLaw
      );
    });

    it('namespace export should match named export for ContinuousComplianceLaw', () => {
      expect(SacredLaws.ContinuousComplianceLaw).toBe(ContinuousComplianceLaw);
    });

    it('namespace export should match named export for ProfessionalExcellenceLaw', () => {
      expect(SacredLaws.ProfessionalExcellenceLaw).toBe(
        ProfessionalExcellenceLaw
      );
    });

    it('namespace export should match named export for SacredLawBase', () => {
      expect(SacredLaws.SacredLawBase).toBe(SacredLawBase);
    });

    it('namespace export should match named export for SacredMetricsLaw', () => {
      expect(SacredLaws.SacredMetricsLaw).toBe(SacredMetricsLaw);
    });

    it('namespace export should match named export for TypeScriptStrictLaw', () => {
      expect(SacredLaws.TypeScriptStrictLaw).toBe(TypeScriptStrictLaw);
    });

    it('namespace export should match named export for ZeroToleranceLaw', () => {
      expect(SacredLaws.ZeroToleranceLaw).toBe(ZeroToleranceLaw);
    });
  });

  // ============================================
  // SacredLawBase inheritance
  // ============================================
  describe('SacredLawBase inheritance', () => {
    it('SacredLawBase should have createResult method', () => {
      // Test static methods
      expect(typeof SacredLawBase.createResult).toBe('function');
    });

    it('SacredLawBase should have getPackageJson method', () => {
      expect(typeof SacredLawBase.getPackageJson).toBe('function');
    });

    it('SacredLawBase should have hasDependency method', () => {
      expect(typeof SacredLawBase.hasDependency).toBe('function');
    });
  });

  // ============================================
  // Type checks
  // ============================================
  describe('Type checks', () => {
    it('all exported laws should be constructors', () => {
      const lawClasses = [
        AutomationFirstLaw,
        ConstitutionalSupremacyLaw,
        ContinuousComplianceLaw,
        ProfessionalExcellenceLaw,
        SacredMetricsLaw,
        TypeScriptStrictLaw,
        ZeroToleranceLaw,
      ];

      for (const LawClass of lawClasses) {
        expect(typeof LawClass).toBe('function');
        expect(LawClass.prototype).toBeDefined();
        expect(LawClass.prototype.constructor).toBe(LawClass);
      }
    });

    it('SacredLawBase should be a class', () => {
      expect(typeof SacredLawBase).toBe('function');
      expect(SacredLawBase.prototype).toBeDefined();
    });

    it('namespace should be an object', () => {
      expect(typeof SacredLaws).toBe('object');
    });
  });

  // ============================================
  // Count exports
  // ============================================
  describe('Export count', () => {
    it('should export at least 8 items from namespace', () => {
      const exportCount = Object.keys(SacredLaws).length;
      expect(exportCount).toBeGreaterThanOrEqual(8);
    });

    it('should export all major law classes', () => {
      const majorLaws = [
        'AutomationFirstLaw',
        'ConstitutionalSupremacyLaw',
        'ContinuousComplianceLaw',
        'ProfessionalExcellenceLaw',
        'SacredLawBase',
        'SacredMetricsLaw',
        'TypeScriptStrictLaw',
        'ZeroToleranceLaw',
      ];

      for (const lawName of majorLaws) {
        expect(SacredLaws).toHaveProperty(lawName);
      }
    });
  });
});
