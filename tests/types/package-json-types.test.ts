/**
 * Package JSON Types Tests
 * Tests for the package-json-types type definitions
 */
import type { PackageJson } from '../../src/types/package-json-types';

describe('PackageJson type', () => {
  describe('basic properties', () => {
    it('should accept minimal package.json', () => {
      const pkg: PackageJson = {};
      expect(pkg).toBeDefined();
    });

    it('should accept name and version', () => {
      const pkg: PackageJson = {
        name: 'my-package',
        version: '1.0.0',
      };
      expect(pkg.name).toBe('my-package');
      expect(pkg.version).toBe('1.0.0');
    });

    it('should accept description and main', () => {
      const pkg: PackageJson = {
        description: 'A package description',
        main: 'dist/index.js',
      };
      expect(pkg.description).toBe('A package description');
      expect(pkg.main).toBe('dist/index.js');
    });
  });

  describe('scripts', () => {
    it('should accept scripts object', () => {
      const pkg: PackageJson = {
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint .',
        },
      };
      expect(pkg.scripts?.build).toBe('tsc');
      expect(pkg.scripts?.test).toBe('jest');
    });
  });

  describe('dependencies', () => {
    it('should accept dependencies', () => {
      const pkg: PackageJson = {
        dependencies: {
          lodash: '^4.17.21',
          express: '~4.18.0',
        },
      };
      expect(pkg.dependencies?.lodash).toBe('^4.17.21');
    });

    it('should accept devDependencies', () => {
      const pkg: PackageJson = {
        devDependencies: {
          typescript: '^5.0.0',
          jest: '29.7.0',
        },
      };
      expect(pkg.devDependencies?.typescript).toBe('^5.0.0');
    });

    it('should accept peerDependencies', () => {
      const pkg: PackageJson = {
        peerDependencies: {
          react: '>=17.0.0',
          angular: '>=15.0.0',
        },
      };
      expect(pkg.peerDependencies?.react).toBe('>=17.0.0');
    });
  });

  describe('metadata', () => {
    it('should accept keywords array', () => {
      const pkg: PackageJson = {
        keywords: ['typescript', 'node', 'tools'],
      };
      expect(pkg.keywords).toContain('typescript');
      expect(pkg.keywords).toHaveLength(3);
    });

    it('should accept string author', () => {
      const pkg: PackageJson = {
        author: 'John Doe <john@example.com>',
      };
      expect(pkg.author).toBe('John Doe <john@example.com>');
    });

    it('should accept object author', () => {
      const pkg: PackageJson = {
        author: {
          name: 'John Doe',
          email: 'john@example.com',
          url: 'https://johndoe.com',
        },
      };
      expect(typeof pkg.author).toBe('object');
      if (typeof pkg.author === 'object' && pkg.author !== null) {
        expect(pkg.author.name).toBe('John Doe');
        expect(pkg.author.email).toBe('john@example.com');
      }
    });

    it('should accept license', () => {
      const pkg: PackageJson = {
        license: 'MIT',
      };
      expect(pkg.license).toBe('MIT');
    });
  });

  describe('repository', () => {
    it('should accept string repository', () => {
      const pkg: PackageJson = {
        repository: 'github:user/repo',
      };
      expect(pkg.repository).toBe('github:user/repo');
    });

    it('should accept object repository', () => {
      const pkg: PackageJson = {
        repository: {
          type: 'git',
          url: 'https://github.com/user/repo.git',
        },
      };
      expect(typeof pkg.repository).toBe('object');
    });
  });

  describe('bugs', () => {
    it('should accept string bugs', () => {
      const pkg: PackageJson = {
        bugs: 'https://github.com/user/repo/issues',
      };
      expect(pkg.bugs).toBe('https://github.com/user/repo/issues');
    });

    it('should accept object bugs', () => {
      const pkg: PackageJson = {
        bugs: {
          url: 'https://github.com/user/repo/issues',
          email: 'support@example.com',
        },
      };
      expect(typeof pkg.bugs).toBe('object');
    });
  });

  describe('other properties', () => {
    it('should accept homepage', () => {
      const pkg: PackageJson = {
        homepage: 'https://example.com',
      };
      expect(pkg.homepage).toBe('https://example.com');
    });

    it('should accept engines', () => {
      const pkg: PackageJson = {
        engines: {
          node: '>=18.0.0',
          npm: '>=9.0.0',
        },
      };
      expect(pkg.engines?.node).toBe('>=18.0.0');
    });

    it('should accept files array', () => {
      const pkg: PackageJson = {
        files: ['dist', 'lib', 'README.md'],
      };
      expect(pkg.files).toContain('dist');
    });

    it('should accept private flag', () => {
      const pkg: PackageJson = {
        private: true,
      };
      expect(pkg.private).toBe(true);
    });

    it('should accept workspaces', () => {
      const pkg: PackageJson = {
        workspaces: ['packages/*', 'apps/*'],
      };
      expect(pkg.workspaces).toContain('packages/*');
    });

    it('should accept arbitrary additional properties', () => {
      const pkg: PackageJson = {
        name: 'test',
        customProperty: 'custom-value',
        anotherProperty: { nested: true },
      };
      expect(pkg.customProperty).toBe('custom-value');
      expect(pkg.anotherProperty).toEqual({ nested: true });
    });
  });

  describe('complete package.json', () => {
    it('should accept fully featured package.json', () => {
      const pkg: PackageJson = {
        name: '@org/package',
        version: '1.0.0',
        description: 'A complete package',
        main: 'dist/index.js',
        scripts: {
          build: 'tsc',
          test: 'jest',
        },
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
        peerDependencies: {
          react: '>=17.0.0',
        },
        keywords: ['typescript', 'tools'],
        author: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        license: 'MIT',
        repository: {
          type: 'git',
          url: 'https://github.com/user/repo.git',
        },
        bugs: {
          url: 'https://github.com/user/repo/issues',
        },
        homepage: 'https://example.com',
        engines: {
          node: '>=18.0.0',
        },
        files: ['dist'],
        private: false,
        workspaces: ['packages/*'],
      };

      expect(pkg.name).toBe('@org/package');
      expect(pkg.scripts?.build).toBe('tsc');
      expect(pkg.keywords).toContain('typescript');
    });
  });
});
