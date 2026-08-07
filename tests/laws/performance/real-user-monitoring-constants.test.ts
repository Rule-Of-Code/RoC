/**
 * Tests for RealUserMonitoringConstants
 *
 * Tests the RUM configuration patterns and methods.
 */
import { RealUserMonitoringConstants } from '../../../src/laws/performance/performance-monitoring/constants/real-user-monitoring.constants';

describe('RealUserMonitoringConstants', () => {
  describe('RUM_DEPENDENCY_PATTERNS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS)
      ).toBe(true);
    });

    it('should contain web-vitals', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'web-vitals'
      );
    });

    it('should contain getCLS', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'getCLS'
      );
    });

    it('should contain getFID', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'getFID'
      );
    });

    it('should contain getLCP', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'getLCP'
      );
    });

    it('should have 4 patterns', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS.length).toBe(
        4
      );
    });
  });

  describe('RUM_CONFIG_FILE_PATTERNS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(RealUserMonitoringConstants.RUM_CONFIG_FILE_PATTERNS)
      ).toBe(true);
    });

    it('should contain src/utils/rum.ts', () => {
      expect(RealUserMonitoringConstants.RUM_CONFIG_FILE_PATTERNS).toContain(
        'src/utils/rum.ts'
      );
    });

    it('should contain src/monitoring/rum.ts', () => {
      expect(RealUserMonitoringConstants.RUM_CONFIG_FILE_PATTERNS).toContain(
        'src/monitoring/rum.ts'
      );
    });

    it('should contain rum.config.js', () => {
      expect(RealUserMonitoringConstants.RUM_CONFIG_FILE_PATTERNS).toContain(
        'rum.config.js'
      );
    });

    it('should have 3 patterns', () => {
      expect(RealUserMonitoringConstants.RUM_CONFIG_FILE_PATTERNS.length).toBe(
        3
      );
    });
  });

  describe('PERFORMANCE_MONITORING_PATTERNS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
        )
      ).toBe(true);
    });

    it('should contain web-vitals', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('web-vitals');
    });

    it('should contain getCLS', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('getCLS');
    });

    it('should contain performance.mark', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('performance.mark');
    });

    it('should contain PerformanceObserver', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('PerformanceObserver');
    });

    it('should have 6 patterns', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS.length
      ).toBe(6);
    });
  });

  describe('getRumConfigLocations', () => {
    const projectRoot = '/test/project';

    it('should be an array', async () => {
      expect(
        Array.isArray(
          await RealUserMonitoringConstants.getRumConfigLocations(projectRoot)
        )
      ).toBe(true);
    });

    it('should contain src/main.ts', async () => {
      expect(
        await RealUserMonitoringConstants.getRumConfigLocations(projectRoot)
      ).toContain(`${projectRoot}/src/main.ts`);
    });

    it('should contain src/app/app.component.ts', async () => {
      expect(
        await RealUserMonitoringConstants.getRumConfigLocations(projectRoot)
      ).toContain(`${projectRoot}/src/app/app.component.ts`);
    });

    it('should contain src/index.ts', async () => {
      expect(
        await RealUserMonitoringConstants.getRumConfigLocations(projectRoot)
      ).toContain(`${projectRoot}/src/index.ts`);
    });

    it('should have 3 locations', async () => {
      expect(
        (await RealUserMonitoringConstants.getRumConfigLocations(projectRoot))
          .length
      ).toBe(3);
    });
  });

  describe('hasRumIndicators', () => {
    it('should return true for web-vitals', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators(
          'import { getCLS } from "web-vitals"'
        )
      ).toBe(true);
    });

    it('should return true for getCLS', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators('getCLS(onPerfEntry)')
      ).toBe(true);
    });

    it('should return true for getFID', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators('getFID(callback)')
      ).toBe(true);
    });

    it('should return true for getLCP', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators('getLCP(callback)')
      ).toBe(true);
    });

    it('should return true for performance.mark', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators(
          'performance.mark("start")'
        )
      ).toBe(true);
    });

    it('should return true for PerformanceObserver', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators(
          'new PerformanceObserver()'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(RealUserMonitoringConstants.hasRumIndicators('const x = 1;')).toBe(
        false
      );
    });

    it('should return false for empty content', () => {
      expect(RealUserMonitoringConstants.hasRumIndicators('')).toBe(false);
    });

    it('should handle multiline content', () => {
      const content = `
        import { getCLS } from 'web-vitals';
        getCLS(callback);
      `;
      expect(RealUserMonitoringConstants.hasRumIndicators(content)).toBe(true);
    });
  });
});
