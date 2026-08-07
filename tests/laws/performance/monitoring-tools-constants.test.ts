/**
 * Tests for MonitoringToolsConstants
 *
 * Tests the monitoring tools configuration and methods.
 */
import { MonitoringToolsConstants } from '../../../src/laws/performance/performance-monitoring/constants/monitoring-tools.constants';

describe('MonitoringToolsConstants', () => {
  describe('MONITORING_TOOL_PACKAGES', () => {
    it('should be an object', () => {
      expect(typeof MonitoringToolsConstants.MONITORING_TOOL_PACKAGES).toBe(
        'object'
      );
    });

    it('should have @sentry/browser package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['@sentry/browser']
      ).toBe('Sentry');
    });

    it('should have @sentry/angular package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['@sentry/angular']
      ).toBe('Sentry Angular');
    });

    it('should have @firebase/performance package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES[
          '@firebase/performance'
        ]
      ).toBe('Firebase Performance');
    });

    it('should have firebase package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['firebase']
      ).toBe('Firebase');
    });

    it('should have newrelic package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['newrelic']
      ).toBe('New Relic');
    });

    it('should have @newrelic/browser-agent package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES[
          '@newrelic/browser-agent'
        ]
      ).toBe('New Relic Browser');
    });

    it('should have web-vitals package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['web-vitals']
      ).toBe('Web Vitals');
    });

    it('should have perfume.js package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['perfume.js']
      ).toBe('Perfume.js');
    });

    it('should have cls package', () => {
      expect(MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['cls']).toBe(
        'Cumulative Layout Shift'
      );
    });

    it('should have @google-analytics/gtag package', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES[
          '@google-analytics/gtag'
        ]
      ).toBe('Google Analytics 4');
    });

    it('should have 10 packages', () => {
      expect(
        Object.keys(MonitoringToolsConstants.MONITORING_TOOL_PACKAGES).length
      ).toBe(10);
    });
  });

  describe('CUSTOM_MONITORING_FILE_PATTERNS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS)
      ).toBe(true);
    });

    it('should contain src/utils/performance.ts', () => {
      expect(
        MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS
      ).toContain('src/utils/performance.ts');
    });

    it('should contain src/services/performance.service.ts', () => {
      expect(
        MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS
      ).toContain('src/services/performance.service.ts');
    });

    it('should contain src/monitoring/performance.ts', () => {
      expect(
        MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS
      ).toContain('src/monitoring/performance.ts');
    });

    it('should have 3 patterns', () => {
      expect(
        MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS.length
      ).toBe(3);
    });
  });

  describe('getMonitoringToolName', () => {
    it('should return Sentry for @sentry/browser', () => {
      expect(
        MonitoringToolsConstants.getMonitoringToolName('@sentry/browser')
      ).toBe('Sentry');
    });

    it('should return Web Vitals for web-vitals', () => {
      expect(MonitoringToolsConstants.getMonitoringToolName('web-vitals')).toBe(
        'Web Vitals'
      );
    });

    it('should return Firebase for firebase', () => {
      expect(MonitoringToolsConstants.getMonitoringToolName('firebase')).toBe(
        'Firebase'
      );
    });

    it('should return New Relic for newrelic', () => {
      expect(MonitoringToolsConstants.getMonitoringToolName('newrelic')).toBe(
        'New Relic'
      );
    });

    it('should return undefined for unknown package', () => {
      expect(
        MonitoringToolsConstants.getMonitoringToolName('unknown-package')
      ).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(
        MonitoringToolsConstants.getMonitoringToolName('')
      ).toBeUndefined();
    });
  });

  describe('isMonitoringTool', () => {
    it('should return true for @sentry/browser', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('@sentry/browser')).toBe(
        true
      );
    });

    it('should return true for web-vitals', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('web-vitals')).toBe(
        true
      );
    });

    it('should return true for firebase', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('firebase')).toBe(true);
    });

    it('should return true for newrelic', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('newrelic')).toBe(true);
    });

    it('should return true for perfume.js', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('perfume.js')).toBe(
        true
      );
    });

    it('should return false for unknown package', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('unknown-package')).toBe(
        false
      );
    });

    it('should return false for empty string', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('')).toBe(false);
    });

    it('should return false for similar but wrong package name', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('web-vital')).toBe(
        false
      );
    });
  });
});
