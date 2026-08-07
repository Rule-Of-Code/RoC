/**
 * @fileoverview Tests for config-migration.ts
 * @description Tests for configuration migration utilities
 */

import {
  HASH_ID_TO_LEGACY_RULE_NAME_MAP,
  LEGACY_RULE_NAME_TO_HASH_ID_MAP,
  convertLegacyConfig,
  validateConfiguration,
} from '../../src/utils/config-migration';

describe('utils/config-migration', () => {
  describe('LEGACY_RULE_NAME_TO_HASH_ID_MAP', () => {
    it('should be a non-empty object', () => {
      expect(
        Object.keys(LEGACY_RULE_NAME_TO_HASH_ID_MAP).length
      ).toBeGreaterThan(0);
    });

    it('should have string keys', () => {
      Object.keys(LEGACY_RULE_NAME_TO_HASH_ID_MAP).forEach(key => {
        expect(typeof key).toBe('string');
      });
    });

    it('should have string values', () => {
      Object.values(LEGACY_RULE_NAME_TO_HASH_ID_MAP).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should contain constitutional-compliance-headers', () => {
      expect(LEGACY_RULE_NAME_TO_HASH_ID_MAP).toHaveProperty(
        'constitutional-compliance-headers'
      );
    });

    it('should contain angular-onpush-strategy', () => {
      expect(LEGACY_RULE_NAME_TO_HASH_ID_MAP).toHaveProperty(
        'angular-onpush-strategy'
      );
    });

    it('should contain ngrx-store-pattern', () => {
      expect(LEGACY_RULE_NAME_TO_HASH_ID_MAP).toHaveProperty(
        'ngrx-store-pattern'
      );
    });

    it('should have unique hash IDs', () => {
      const hashIds = Object.values(LEGACY_RULE_NAME_TO_HASH_ID_MAP);
      const uniqueHashIds = new Set(hashIds);
      expect(uniqueHashIds.size).toBe(hashIds.length);
    });
  });

  describe('HASH_ID_TO_LEGACY_RULE_NAME_MAP', () => {
    it('should be a non-empty object', () => {
      expect(
        Object.keys(HASH_ID_TO_LEGACY_RULE_NAME_MAP).length
      ).toBeGreaterThan(0);
    });

    it('should be the reverse of LEGACY_RULE_NAME_TO_HASH_ID_MAP', () => {
      Object.entries(LEGACY_RULE_NAME_TO_HASH_ID_MAP).forEach(
        ([legacy, hash]) => {
          expect(HASH_ID_TO_LEGACY_RULE_NAME_MAP[hash]).toBe(legacy);
        }
      );
    });

    it('should have same number of entries as LEGACY_RULE_NAME_TO_HASH_ID_MAP', () => {
      expect(Object.keys(HASH_ID_TO_LEGACY_RULE_NAME_MAP).length).toBe(
        Object.keys(LEGACY_RULE_NAME_TO_HASH_ID_MAP).length
      );
    });
  });

  describe('convertLegacyConfig', () => {
    it('should convert known legacy rule names to hash IDs', () => {
      const legacyConfig = {
        'constitutional-compliance-headers': { enabled: true },
      };

      const result = convertLegacyConfig(legacyConfig);

      const expectedHashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'constitutional-compliance-headers'
      ] as string;
      expect(result).toHaveProperty(expectedHashId);
      expect(result[expectedHashId]).toEqual({ enabled: true });
    });

    it('should convert multiple legacy rules', () => {
      const legacyConfig = {
        'angular-onpush-strategy': { severity: 'error' },
        'ngrx-store-pattern': { enabled: false },
      };

      const result = convertLegacyConfig(legacyConfig);

      const hashId1 = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'angular-onpush-strategy'
      ] as string;
      const hashId2 = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'ngrx-store-pattern'
      ] as string;

      expect(result).toHaveProperty(hashId1);
      expect(result).toHaveProperty(hashId2);
    });

    it('should preserve unknown rule names', () => {
      const legacyConfig = {
        'unknown-rule': { custom: 'value' },
      };

      const result = convertLegacyConfig(legacyConfig);

      expect(result).toHaveProperty('unknown-rule');
      expect(result['unknown-rule']).toEqual({ custom: 'value' });
    });

    it('should handle empty config', () => {
      const result = convertLegacyConfig({});

      expect(result).toEqual({});
    });

    it('should preserve primitive values', () => {
      const legacyConfig = {
        'angular-onpush-strategy': 'warn',
      };

      const result = convertLegacyConfig(legacyConfig);

      const hashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'angular-onpush-strategy'
      ] as string;
      expect(result[hashId]).toBe('warn');
    });

    it('should preserve boolean values', () => {
      const legacyConfig = {
        'angular-standalone-components': true,
      };

      const result = convertLegacyConfig(legacyConfig);

      const hashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'angular-standalone-components'
      ] as string;
      expect(result[hashId]).toBe(true);
    });

    it('should preserve array values', () => {
      const legacyConfig = {
        'angular-lazy-loading': ['option1', 'option2'],
      };

      const result = convertLegacyConfig(legacyConfig);

      const hashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'angular-lazy-loading'
      ] as string;
      expect(result[hashId]).toEqual(['option1', 'option2']);
    });

    it('should handle mixed known and unknown rules', () => {
      const legacyConfig = {
        'angular-onpush-strategy': { enabled: true },
        'custom-rule': { custom: true },
        'ngrx-actions-hygiene': { severity: 'error' },
      };

      const result = convertLegacyConfig(legacyConfig);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty('custom-rule');
    });
  });

  describe('validateConfiguration', () => {
    it('should return empty array for valid config', () => {
      const hashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'constitutional-compliance-headers'
      ] as string;
      const config = {
        [hashId]: { enabled: true },
      };

      const result = validateConfiguration(config);

      expect(result).toEqual([]);
    });

    it('should return invalid rule IDs', () => {
      const config = {
        'completely-invalid-rule': { enabled: true },
        'another-invalid-rule': { severity: 'warn' },
      };

      const result = validateConfiguration(config);

      expect(result).toContain('completely-invalid-rule');
      expect(result).toContain('another-invalid-rule');
    });

    it('should accept legacy rule names that have mappings', () => {
      const hashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'angular-onpush-strategy'
      ] as string;
      const config = {
        [hashId]: { enabled: true },
      };

      const result = validateConfiguration(config);

      expect(result).not.toContain(hashId);
    });

    it('should return empty array for empty config', () => {
      const result = validateConfiguration({});

      expect(result).toEqual([]);
    });

    it('should handle mixed valid and invalid rules', () => {
      const validHashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[
        'ngrx-store-pattern'
      ] as string;
      const config = {
        [validHashId]: { enabled: true },
        'invalid-rule-name': { severity: 'error' },
      };

      const result = validateConfiguration(config);

      expect(result).toEqual(['invalid-rule-name']);
    });
  });
});
