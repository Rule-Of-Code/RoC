/**
 * @fileoverview Tests for performance-test-utils.ts
 * @description Tests for performance testing utilities
 */

import {
  PerformanceTestOptions,
  PerformanceTestResult,
  PerformanceTestUtils,
} from '../../src/utils/testing/performance-test-utils';

describe('utils/testing/performance-test-utils', () => {
  describe('PerformanceTestOptions interface', () => {
    it('should accept all optional properties', () => {
      const options: PerformanceTestOptions = {
        maxExecutionTime: 1000,
        testDescription: 'Test',
        logMetrics: true,
      };

      expect(options.maxExecutionTime).toBe(1000);
      expect(options.testDescription).toBe('Test');
      expect(options.logMetrics).toBe(true);
    });

    it('should accept empty object', () => {
      const options: PerformanceTestOptions = {};

      expect(options.maxExecutionTime).toBeUndefined();
      expect(options.testDescription).toBeUndefined();
      expect(options.logMetrics).toBeUndefined();
    });
  });

  describe('PerformanceTestResult interface', () => {
    it('should have required properties', () => {
      const result: PerformanceTestResult = {
        executionTime: 100,
        passed: true,
        message: 'Test passed',
      };

      expect(result.executionTime).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.message).toBe('Test passed');
    });
  });

  describe('testLawPerformance', () => {
    it('should return passed true when execution is within limit', async () => {
      const fastCheck = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      };

      const result = await PerformanceTestUtils.testLawPerformance(fastCheck, {
        maxExecutionTime: 1000,
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThan(1000);
      expect(result.result.success).toBe(true);
    });

    it('should return passed false when execution exceeds limit', async () => {
      const slowCheck = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      };

      const result = await PerformanceTestUtils.testLawPerformance(slowCheck, {
        maxExecutionTime: 50,
      });

      expect(result.passed).toBe(false);
      expect(result.executionTime).toBeGreaterThanOrEqual(50);
    });

    it('should use default maxExecutionTime of 5000', async () => {
      const fastCheck = async () => ({ success: true });

      const result = await PerformanceTestUtils.testLawPerformance(fastCheck);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('5000ms');
    });

    it('should include execution time in message', async () => {
      const fastCheck = async () => ({ success: true });

      const result = await PerformanceTestUtils.testLawPerformance(fastCheck);

      expect(result.message).toMatch(/\d+ms/);
    });

    it('should include test description in message', async () => {
      const fastCheck = async () => ({ success: true });

      const result = await PerformanceTestUtils.testLawPerformance(fastCheck, {
        testDescription: 'Custom Test',
      });

      expect(result.message).toContain('Custom Test');
    });

    it('should throw error when law check throws', async () => {
      const failingCheck = async () => {
        throw new Error('Test error');
      };

      await expect(
        PerformanceTestUtils.testLawPerformance(failingCheck)
      ).rejects.toThrow('Performance test failed');
    });

    it('should include execution time in error message', async () => {
      const failingCheck = async () => {
        throw new Error('Test error');
      };

      await expect(
        PerformanceTestUtils.testLawPerformance(failingCheck)
      ).rejects.toThrow(/\d+ms/);
    });
  });

  describe('testMultipleLawsPerformance', () => {
    it('should test multiple laws and return results', async () => {
      const lawChecks = [
        { name: 'Law 1', check: async () => ({ pass: true }) },
        { name: 'Law 2', check: async () => ({ pass: true }) },
      ];

      const results =
        await PerformanceTestUtils.testMultipleLawsPerformance(lawChecks);

      expect(results).toHaveLength(2);
      expect(results[0]?.passed).toBe(true);
      expect(results[1]?.passed).toBe(true);
    });

    it('should apply options to all law checks', async () => {
      const lawChecks = [
        { name: 'Fast Law', check: async () => ({ pass: true }) },
      ];

      const results = await PerformanceTestUtils.testMultipleLawsPerformance(
        lawChecks,
        { maxExecutionTime: 10000 }
      );

      expect(results[0]?.message).toContain('10000ms');
    });

    it('should include law name in results', async () => {
      const lawChecks = [
        { name: 'Constitutional Law', check: async () => ({ pass: true }) },
      ];

      const results =
        await PerformanceTestUtils.testMultipleLawsPerformance(lawChecks);

      expect(results[0]?.message).toContain('Constitutional Law');
    });

    it('should return empty array for empty input', async () => {
      const results = await PerformanceTestUtils.testMultipleLawsPerformance(
        []
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('expectPerformance', () => {
    it('should not throw for execution time within limit', () => {
      expect(() => {
        PerformanceTestUtils.expectPerformance(100, 1000);
      }).not.toThrow();
    });

    it('should throw for execution time exceeding limit', () => {
      expect(() => {
        PerformanceTestUtils.expectPerformance(2000, 1000);
      }).toThrow();
    });

    it('should use default maxTime of 5000', () => {
      expect(() => {
        PerformanceTestUtils.expectPerformance(4000);
      }).not.toThrow();
    });

    it('should warn when approaching limit (80% threshold)', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      PerformanceTestUtils.expectPerformance(850, 1000);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0]?.[0]).toContain('approaching');

      consoleSpy.mockRestore();
    });

    it('should include test name in warning if provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      PerformanceTestUtils.expectPerformance(850, 1000, 'My Test');

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0]?.[0]).toContain('My Test');

      consoleSpy.mockRestore();
    });

    it('should not warn when well below limit', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      PerformanceTestUtils.expectPerformance(100, 1000);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('createPerformanceTest', () => {
    it('should be a function', () => {
      expect(typeof PerformanceTestUtils.createPerformanceTest).toBe(
        'function'
      );
    });

    // Note: createPerformanceTest creates Jest it() blocks internally
    // We can't easily test it directly without running in a full Jest context
    // The function is tested indirectly through usage in actual test suites
  });
});
