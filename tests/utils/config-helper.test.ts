/**
 * @fileoverview Tests for config-helper.ts
 * @description Tests for ConfigHelper class
 */

import type { LawCheckContext } from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { ConfigHelper } from '../../src/utils/config-helper';

const createConfig = () => ConfigFileUtils.getMinimalDefaultConfig();

describe('utils/config-helper', () => {
  describe('ConfigHelper.getConfigFromContext', () => {
    it('should return config from context', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/test/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result).toBe(mockConfig);
    });

    it('should return the same config object reference', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/another/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result).toBe(context.config);
    });

    it('should work with context containing lawId', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
        lawId: 'test-law-001',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result).toBe(mockConfig);
    });

    it('should return config with project property', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result.project).toBeDefined();
    });

    it('should return config with ignores property', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result.ignores).toBeDefined();
    });

    it('should return config with hooks property', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result.hooks).toBeDefined();
    });

    it('should return config with reporting property', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result.reporting).toBeDefined();
    });

    it('should return config with performance property', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);

      expect(result.performance).toBeDefined();
    });

    it('should return config that can be modified', () => {
      const mockConfig = createConfig();
      const context: LawCheckContext = {
        config: mockConfig,
        projectRoot: '/project',
      };

      const result = ConfigHelper.getConfigFromContext(context);
      result.reporting.verbose = true;

      expect(context.config.reporting.verbose).toBe(true);
    });
  });
});
