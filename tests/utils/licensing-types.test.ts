/**
 * @fileoverview Tests for licensing-types.ts
 * @description Tests for licensing type interfaces
 */

import { PackageJsonLicense } from '../../src/utils/licensing/licensing-types';

describe('utils/licensing/licensing-types', () => {
  describe('PackageJsonLicense interface', () => {
    it('should support license string', () => {
      const pkg: PackageJsonLicense = {
        license: 'MIT',
      };

      expect(pkg.license).toBe('MIT');
    });

    it('should support licenses array', () => {
      const pkg: PackageJsonLicense = {
        licenses: [
          { type: 'MIT', url: 'https://opensource.org/licenses/MIT' },
          { type: 'Apache-2.0' },
        ],
      };

      expect(pkg.licenses).toHaveLength(2);
      expect(pkg.licenses?.[0]?.type).toBe('MIT');
    });

    it('should support dependencies', () => {
      const pkg: PackageJsonLicense = {
        dependencies: {
          lodash: '^4.17.21',
          express: '^4.18.0',
        },
      };

      expect(pkg.dependencies?.['lodash']).toBe('^4.17.21');
    });

    it('should support devDependencies', () => {
      const pkg: PackageJsonLicense = {
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0',
        },
      };

      expect(pkg.devDependencies?.['jest']).toBe('^29.0.0');
    });

    it('should support additional properties', () => {
      const pkg: PackageJsonLicense = {
        license: 'MIT',
        name: 'test-package',
        version: '1.0.0',
      };

      expect(pkg['name']).toBe('test-package');
      expect(pkg['version']).toBe('1.0.0');
    });

    it('should support empty package.json', () => {
      const pkg: PackageJsonLicense = {};

      expect(pkg.license).toBeUndefined();
      expect(pkg.licenses).toBeUndefined();
      expect(pkg.dependencies).toBeUndefined();
    });

    it('should support complex license array', () => {
      const pkg: PackageJsonLicense = {
        licenses: [{ type: 'ISC' }, { type: 'BSD-3-Clause' }],
      };

      const licenseTypes = pkg.licenses?.map(l => l.type);
      expect(licenseTypes).toContain('ISC');
      expect(licenseTypes).toContain('BSD-3-Clause');
    });

    it('should support all common licenses', () => {
      const commonLicenses = [
        'MIT',
        'Apache-2.0',
        'ISC',
        'BSD-3-Clause',
        'GPL-3.0',
      ];

      commonLicenses.forEach(license => {
        const pkg: PackageJsonLicense = { license };
        expect(pkg.license).toBe(license);
      });
    });

    it('should handle SPDX expressions', () => {
      const pkg: PackageJsonLicense = {
        license: '(MIT OR Apache-2.0)',
      };

      expect(pkg.license).toContain('MIT');
      expect(pkg.license).toContain('Apache-2.0');
    });

    it('should handle undefined values gracefully', () => {
      const pkg: PackageJsonLicense = {
        license: undefined,
        dependencies: undefined,
      };

      expect(pkg.license).toBeUndefined();
      expect(pkg.dependencies).toBeUndefined();
    });
  });
});
