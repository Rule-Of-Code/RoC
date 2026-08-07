/**
 * Tests for PackageJson interface from dependency-scanning shared-types
 *
 * Tests the shared package.json type definition.
 */
import { PackageJson } from '../../../src/laws/security/dependency-scanning/shared-types';

describe('PackageJson interface', () => {
  describe('optional dependencies property', () => {
    it('should allow undefined dependencies', () => {
      const pkg: PackageJson = {};
      expect(pkg.dependencies).toBeUndefined();
    });

    it('should allow dependencies object', () => {
      const pkg: PackageJson = {
        dependencies: {
          react: '^18.0.0',
          lodash: '^4.17.0',
        },
      };
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies?.react).toBe('^18.0.0');
    });

    it('should allow empty dependencies object', () => {
      const pkg: PackageJson = {
        dependencies: {},
      };
      expect(Object.keys(pkg.dependencies!).length).toBe(0);
    });
  });

  describe('optional devDependencies property', () => {
    it('should allow undefined devDependencies', () => {
      const pkg: PackageJson = {};
      expect(pkg.devDependencies).toBeUndefined();
    });

    it('should allow devDependencies object', () => {
      const pkg: PackageJson = {
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0',
        },
      };
      expect(pkg.devDependencies).toBeDefined();
      expect(pkg.devDependencies?.jest).toBe('^29.0.0');
    });

    it('should allow empty devDependencies object', () => {
      const pkg: PackageJson = {
        devDependencies: {},
      };
      expect(Object.keys(pkg.devDependencies!).length).toBe(0);
    });
  });

  describe('optional license property', () => {
    it('should allow undefined license', () => {
      const pkg: PackageJson = {};
      expect(pkg.license).toBeUndefined();
    });

    it('should allow MIT license', () => {
      const pkg: PackageJson = {
        license: 'MIT',
      };
      expect(pkg.license).toBe('MIT');
    });

    it('should allow Apache-2.0 license', () => {
      const pkg: PackageJson = {
        license: 'Apache-2.0',
      };
      expect(pkg.license).toBe('Apache-2.0');
    });

    it('should allow ISC license', () => {
      const pkg: PackageJson = {
        license: 'ISC',
      };
      expect(pkg.license).toBe('ISC');
    });
  });

  describe('optional scripts property', () => {
    it('should allow undefined scripts', () => {
      const pkg: PackageJson = {};
      expect(pkg.scripts).toBeUndefined();
    });

    it('should allow scripts object', () => {
      const pkg: PackageJson = {
        scripts: {
          build: 'tsc',
          test: 'jest',
          start: 'node dist/index.js',
        },
      };
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts?.build).toBe('tsc');
    });

    it('should allow empty scripts object', () => {
      const pkg: PackageJson = {
        scripts: {},
      };
      expect(Object.keys(pkg.scripts!).length).toBe(0);
    });
  });

  describe('additional properties', () => {
    it('should allow name property', () => {
      const pkg: PackageJson = {
        name: 'my-package',
      };
      expect(pkg.name).toBe('my-package');
    });

    it('should allow version property', () => {
      const pkg: PackageJson = {
        version: '1.0.0',
      };
      expect(pkg.version).toBe('1.0.0');
    });

    it('should allow description property', () => {
      const pkg: PackageJson = {
        description: 'A test package',
      };
      expect(pkg.description).toBe('A test package');
    });

    it('should allow main property', () => {
      const pkg: PackageJson = {
        main: 'dist/index.js',
      };
      expect(pkg.main).toBe('dist/index.js');
    });

    it('should allow keywords array', () => {
      const pkg: PackageJson = {
        keywords: ['typescript', 'testing'],
      };
      expect(Array.isArray(pkg.keywords)).toBe(true);
    });

    it('should allow author property', () => {
      const pkg: PackageJson = {
        author: 'Test Author',
      };
      expect(pkg.author).toBe('Test Author');
    });

    it('should allow repository object', () => {
      const pkg: PackageJson = {
        repository: {
          type: 'git',
          url: 'https://github.com/test/repo',
        },
      };
      expect(pkg.repository).toBeDefined();
    });
  });

  describe('combined properties', () => {
    it('should allow full package.json structure', () => {
      const pkg: PackageJson = {
        name: 'my-app',
        version: '2.0.0',
        license: 'MIT',
        dependencies: {
          express: '^4.18.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js',
        },
      };
      expect(pkg.name).toBe('my-app');
      expect(pkg.dependencies?.express).toBe('^4.18.0');
      expect(pkg.devDependencies?.typescript).toBe('^5.0.0');
      expect(pkg.scripts?.build).toBe('tsc');
    });
  });
});
