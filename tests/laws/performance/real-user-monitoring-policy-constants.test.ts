/**
 * Tests for RealUserMonitoringPolicyConstants
 */
import { RealUserMonitoringPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/real-user-monitoring-policy.constants';

describe('RealUserMonitoringPolicyConstants', () => {
  describe('RUM_TOOLS', () => {
    it('should be an object', () => {
      expect(typeof RealUserMonitoringPolicyConstants.RUM_TOOLS).toBe('object');
    });

    it('should have web-vitals tool', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['web-vitals']).toBe(
        'Web Vitals'
      );
    });

    it('should have @google-analytics/gtag tool', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@google-analytics/gtag']
      ).toBe('Google Analytics');
    });

    it('should have gtag tool', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['gtag']).toBe(
        'Google Analytics'
      );
    });

    it('should have newrelic tool', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['newrelic']).toBe(
        'New Relic'
      );
    });

    it('should have @newrelic/browser tool', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@newrelic/browser']
      ).toBe('New Relic Browser');
    });

    it('should have datadog-browser-rum tool', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['datadog-browser-rum']
      ).toBe('DataDog RUM');
    });

    it('should have @datadog/browser-rum tool', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@datadog/browser-rum']
      ).toBe('DataDog RUM');
    });

    it('should have dynatrace tool', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['dynatrace']).toBe(
        'Dynatrace'
      );
    });

    it('should have pingdom tool', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['pingdom']).toBe(
        'Pingdom'
      );
    });

    it('should have speedcurve tool', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['speedcurve']).toBe(
        'SpeedCurve'
      );
    });
  });

  describe('GOOGLE_ANALYTICS_PATTERNS', () => {
    it('should include gtag', () => {
      expect(
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
      ).toContain('gtag');
    });

    it('should include google-analytics', () => {
      expect(
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
      ).toContain('google-analytics');
    });
  });

  describe('RUM_CONFIG_FILES', () => {
    it('should include newrelic.js', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'newrelic.js'
      );
    });

    it('should include datadog.json', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'datadog.json'
      );
    });

    it('should include dynatrace.config.js', () => {
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

  describe('isRumTool()', () => {
    it('should return true for web-vitals', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('web-vitals')).toBe(
        true
      );
    });

    it('should return true for @google-analytics/gtag', () => {
      expect(
        RealUserMonitoringPolicyConstants.isRumTool('@google-analytics/gtag')
      ).toBe(true);
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

    it('should return false for unknown package', () => {
      expect(
        RealUserMonitoringPolicyConstants.isRumTool('unknown-package')
      ).toBe(false);
    });
  });

  describe('getRumToolName()', () => {
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

    it('should return undefined for unknown package', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('unknown')
      ).toBeUndefined();
    });
  });
});
