/**
 * Laws Registry Tests
 * Tests for ConstitutionalLawsRegistry
 */

import { ConstitutionalLawsRegistry } from '../../src/registry/laws-registry';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

describe('registry/laws-registry', () => {
  describe('getAll', () => {
    it('should return array of laws', () => {
      const laws = ConstitutionalLawsRegistry.getAll();

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBeGreaterThan(0);
    });

    it('should return laws with required properties', () => {
      const laws = ConstitutionalLawsRegistry.getAll();

      expect(laws.length).toBeGreaterThan(0);
      const firstLaw = laws[0];
      if (firstLaw) {
        expect(firstLaw.id).toBeDefined();
        expect(firstLaw.name).toBeDefined();
      }
    });
  });

  describe('getEnabled', () => {
    it('should return enabled laws for config', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const laws = ConstitutionalLawsRegistry.getEnabled(config);

      expect(Array.isArray(laws)).toBe(true);
    });
  });

  describe('getParetoCore', () => {
    it('should return pareto core laws', () => {
      const laws = ConstitutionalLawsRegistry.getParetoCore();

      expect(Array.isArray(laws)).toBe(true);
    });
  });

  describe('get', () => {
    it('should return law by ID if exists', () => {
      const allLaws = ConstitutionalLawsRegistry.getAll();
      expect(allLaws.length).toBeGreaterThan(0);

      const firstLaw = allLaws[0];
      if (firstLaw) {
        const law = ConstitutionalLawsRegistry.get(firstLaw.id);

        expect(law).not.toBeNull();
        expect(law?.id).toBe(firstLaw.id);
      }
    });

    it('should return null for non-existent law', () => {
      const law = ConstitutionalLawsRegistry.get('non-existent-law-12345');

      expect(law).toBeNull();
    });
  });
});
