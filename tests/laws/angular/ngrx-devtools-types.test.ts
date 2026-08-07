/**
 * Tests for NgRx DevTools Integration Types
 *
 * Tests TypeScript interface compliance and type structures.
 */
import {
  DependencyCheckResult,
  DevToolsAnalysisResult,
  DevToolsConfigResult,
} from '../../../src/laws/angular/ngrx-devtools-integration-mandate/constants/types';

describe('NgRx DevTools Integration Types', () => {
  describe('DependencyCheckResult', () => {
    it('should accept valid result with installed only', () => {
      const result: DependencyCheckResult = {
        installed: true,
      };
      expect(result.installed).toBe(true);
    });

    it('should accept result with version', () => {
      const result: DependencyCheckResult = {
        installed: true,
        version: '13.0.0',
      };
      expect(result.installed).toBe(true);
      expect(result.version).toBe('13.0.0');
    });

    it('should accept result with installed false', () => {
      const result: DependencyCheckResult = {
        installed: false,
      };
      expect(result.installed).toBe(false);
      expect(result.version).toBeUndefined();
    });
  });

  describe('DevToolsConfigResult', () => {
    it('should accept valid result with all fields', () => {
      const result: DevToolsConfigResult = {
        configured: true,
        hasEnvironmentCheck: true,
        hasConfigOptions: true,
      };
      expect(result.configured).toBe(true);
      expect(result.hasEnvironmentCheck).toBe(true);
      expect(result.hasConfigOptions).toBe(true);
    });

    it('should accept result with all false', () => {
      const result: DevToolsConfigResult = {
        configured: false,
        hasEnvironmentCheck: false,
        hasConfigOptions: false,
      };
      expect(result.configured).toBe(false);
      expect(result.hasEnvironmentCheck).toBe(false);
      expect(result.hasConfigOptions).toBe(false);
    });

    it('should accept result with mixed values', () => {
      const result: DevToolsConfigResult = {
        configured: true,
        hasEnvironmentCheck: false,
        hasConfigOptions: true,
      };
      expect(result.configured).toBe(true);
      expect(result.hasEnvironmentCheck).toBe(false);
      expect(result.hasConfigOptions).toBe(true);
    });
  });

  describe('DevToolsAnalysisResult', () => {
    it('should accept valid composite result', () => {
      const result: DevToolsAnalysisResult = {
        dependency: {
          installed: true,
          version: '13.0.0',
        },
        config: {
          configured: true,
          hasEnvironmentCheck: true,
          hasConfigOptions: true,
        },
      };
      expect(result.dependency.installed).toBe(true);
      expect(result.dependency.version).toBe('13.0.0');
      expect(result.config.configured).toBe(true);
    });

    it('should accept result with not installed dependency', () => {
      const result: DevToolsAnalysisResult = {
        dependency: {
          installed: false,
        },
        config: {
          configured: false,
          hasEnvironmentCheck: false,
          hasConfigOptions: false,
        },
      };
      expect(result.dependency.installed).toBe(false);
      expect(result.config.configured).toBe(false);
    });
  });
});
