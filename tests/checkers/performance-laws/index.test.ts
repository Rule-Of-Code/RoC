/**
 * Tests for Performance Laws Index
 *
 * Tests that all performance-related law implementations are properly exported
 */
import * as PerformanceLaws from '../../../src/checkers/performance-laws';

describe('Performance Laws Index', () => {
  // ============================================
  // Exports
  // ============================================
  describe('exports', () => {
    it('should export BundleSizeOptimizationLaw', () => {
      expect(PerformanceLaws.BundleSizeOptimizationLaw).toBeDefined();
    });

    // LazyLoadingImplementationLaw is intentionally NOT exported here — it was a
    // dead duplicate of the wired angular-laws law; removed to end the confusion.

    it('should export MemoryManagementLaw', () => {
      expect(PerformanceLaws.MemoryManagementLaw).toBeDefined();
    });

    it('should export PerformanceLawBase', () => {
      expect(PerformanceLaws.PerformanceLawBase).toBeDefined();
    });
  });

  // ============================================
  // Class Structure
  // ============================================
  describe('class structure', () => {
    describe('BundleSizeOptimizationLaw', () => {
      it('should have check method', () => {
        expect(typeof PerformanceLaws.BundleSizeOptimizationLaw.check).toBe(
          'function'
        );
      });
    });

    describe('MemoryManagementLaw', () => {
      it('should have check method', () => {
        expect(typeof PerformanceLaws.MemoryManagementLaw.check).toBe(
          'function'
        );
      });
    });

    describe('PerformanceLawBase', () => {
      it('should have createResult method', () => {
        expect(typeof PerformanceLaws.PerformanceLawBase.createResult).toBe(
          'function'
        );
      });
    });
  });

  // ============================================
  // No Extra Exports
  // ============================================
  describe('export count', () => {
    it('should export exactly 3 modules', () => {
      const exportedKeys = Object.keys(PerformanceLaws);

      expect(exportedKeys).toContain('BundleSizeOptimizationLaw');
      expect(exportedKeys).toContain('MemoryManagementLaw');
      expect(exportedKeys).toContain('PerformanceLawBase');
      expect(exportedKeys).not.toContain('LazyLoadingImplementationLaw');
      expect(exportedKeys).not.toContain('ChangeDetectionOptimizationLaw');
      expect(exportedKeys.length).toBe(3);
    });
  });
});
