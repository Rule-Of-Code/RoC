/**
 * Tests for RealUserMonitoringPolicyConstants
 *
 * Tests RUM tool detection and configuration.
 */
import { RealUserMonitoringPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/real-user-monitoring-policy.constants';

describe('RealUserMonitoringPolicyConstants', () => {
  describe('RUM_TOOLS', () => {
    it('should be a record of package names to display names', () => {
      expect(typeof RealUserMonitoringPolicyConstants.RUM_TOOLS).toBe('object');
    });

    it('should contain web-vitals', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['web-vitals']).toBe(
        'Web Vitals'
      );
    });

    it('should contain Google Analytics packages', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@google-analytics/gtag']
      ).toBe('Google Analytics');
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['gtag']).toBe(
        'Google Analytics'
      );
    });

    it('should contain New Relic packages', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['newrelic']).toBe(
        'New Relic'
      );
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@newrelic/browser']
      ).toBe('New Relic Browser');
    });

    it('should contain DataDog packages', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['datadog-browser-rum']
      ).toBe('DataDog RUM');
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@datadog/browser-rum']
      ).toBe('DataDog RUM');
    });

    it('should contain other RUM tools', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['dynatrace']).toBe(
        'Dynatrace'
      );
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['pingdom']).toBe(
        'Pingdom'
      );
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['speedcurve']).toBe(
        'SpeedCurve'
      );
    });
  });

  describe('GOOGLE_ANALYTICS_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
        )
      ).toBe(true);
    });

    it('should contain gtag', () => {
      expect(
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
      ).toContain('gtag');
    });

    it('should contain google-analytics', () => {
      expect(
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
      ).toContain('google-analytics');
    });
  });

  describe('RUM_CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain newrelic.js', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'newrelic.js'
      );
    });

    it('should contain datadog.json', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'datadog.json'
      );
    });

    it('should contain dynatrace.config.js', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'dynatrace.config.js'
      );
    });
  });

  describe('INDEX_HTML_FILE', () => {
    it('should be src/index.html', () => {
      expect(RealUserMonitoringPolicyConstants.INDEX_HTML_FILE).toBe(
        'src/index.html'
      );
    });
  });

  describe('isRumTool', () => {
    it('should return true for web-vitals', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('web-vitals')).toBe(
        true
      );
    });

    it('should return true for gtag', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('gtag')).toBe(true);
    });

    it('should return true for newrelic', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('newrelic')).toBe(
        true
      );
    });

    it('should return true for @datadog/browser-rum', () => {
      expect(
        RealUserMonitoringPolicyConstants.isRumTool('@datadog/browser-rum')
      ).toBe(true);
    });

    it('should return true for dynatrace', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('dynatrace')).toBe(
        true
      );
    });

    it('should return true for pingdom', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('pingdom')).toBe(true);
    });

    it('should return true for speedcurve', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('speedcurve')).toBe(
        true
      );
    });

    it('should return false for non-RUM packages', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('lodash')).toBe(false);
      expect(RealUserMonitoringPolicyConstants.isRumTool('express')).toBe(
        false
      );
    });
  });

  describe('getRumToolName', () => {
    it('should return Web Vitals for web-vitals', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('web-vitals')
      ).toBe('Web Vitals');
    });

    it('should return Google Analytics for gtag', () => {
      expect(RealUserMonitoringPolicyConstants.getRumToolName('gtag')).toBe(
        'Google Analytics'
      );
    });

    it('should return New Relic for newrelic', () => {
      expect(RealUserMonitoringPolicyConstants.getRumToolName('newrelic')).toBe(
        'New Relic'
      );
    });

    it('should return DataDog RUM for @datadog/browser-rum', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('@datadog/browser-rum')
      ).toBe('DataDog RUM');
    });

    it('should return Dynatrace for dynatrace', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('dynatrace')
      ).toBe('Dynatrace');
    });

    it('should return Pingdom for pingdom', () => {
      expect(RealUserMonitoringPolicyConstants.getRumToolName('pingdom')).toBe(
        'Pingdom'
      );
    });

    it('should return SpeedCurve for speedcurve', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('speedcurve')
      ).toBe('SpeedCurve');
    });

    it('should return undefined for unknown packages', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('lodash')
      ).toBeUndefined();
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('unknown-package')
      ).toBeUndefined();
    });
  });
});
