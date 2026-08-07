/**
 * File Constants Tests
 * Tests for the file-constants utility module
 */
import {
  CONFIG_FILES,
  DIRECTORY_NAMES,
  DOC_FILES,
  FILE_EXTENSIONS,
  FILE_OPERATIONS,
  PATH_CONSTANTS,
  PATTERNS,
  SKIP_DIRECTORIES,
} from '../../src/utils/file-constants';

describe('file-constants', () => {
  describe('DIRECTORY_NAMES', () => {
    it('should have common directory names defined', () => {
      expect(DIRECTORY_NAMES.SRC).toBe('src');
      expect(DIRECTORY_NAMES.LIB).toBe('lib');
      expect(DIRECTORY_NAMES.DIST).toBe('dist');
      expect(DIRECTORY_NAMES.BUILD).toBe('build');
      expect(DIRECTORY_NAMES.NODE_MODULES).toBe('node_modules');
    });

    it('should have test-related directories', () => {
      expect(DIRECTORY_NAMES.TESTS).toBe('tests');
      expect(DIRECTORY_NAMES.TEST).toBe('test');
      expect(DIRECTORY_NAMES.SPEC).toBe('spec');
      expect(DIRECTORY_NAMES.COVERAGE).toBe('coverage');
    });

    it('should have Angular-specific directories', () => {
      expect(DIRECTORY_NAMES.COMPONENTS).toBe('components');
      expect(DIRECTORY_NAMES.SERVICES).toBe('services');
      expect(DIRECTORY_NAMES.MODULES).toBe('modules');
      expect(DIRECTORY_NAMES.PIPES).toBe('pipes');
      expect(DIRECTORY_NAMES.DIRECTIVES).toBe('directives');
      expect(DIRECTORY_NAMES.GUARDS).toBe('guards');
    });

    it('should have Git-related directories', () => {
      expect(DIRECTORY_NAMES.GIT).toBe('.git');
      expect(DIRECTORY_NAMES.GITHUB).toBe('.github');
      expect(DIRECTORY_NAMES.WORKFLOWS).toBe('workflows');
    });

    it('should be a readonly object', () => {
      expect(Object.keys(DIRECTORY_NAMES).length).toBeGreaterThan(30);
    });
  });

  describe('FILE_EXTENSIONS', () => {
    it('should have TypeScript extension', () => {
      expect(FILE_EXTENSIONS.TYPESCRIPT).toBe('.ts');
      expect(FILE_EXTENSIONS.TSX).toBe('.tsx');
    });

    it('should have JavaScript extensions', () => {
      expect(FILE_EXTENSIONS.JAVASCRIPT).toBe('.js');
      expect(FILE_EXTENSIONS.JSX).toBe('.jsx');
    });

    it('should have style extensions', () => {
      expect(FILE_EXTENSIONS.CSS).toBe('.css');
      expect(FILE_EXTENSIONS.SCSS).toBe('.scss');
      expect(FILE_EXTENSIONS.SASS).toBe('.sass');
      expect(FILE_EXTENSIONS.LESS).toBe('.less');
    });

    it('should have Angular component extensions', () => {
      expect(FILE_EXTENSIONS.SPEC_TS).toBe('.spec.ts');
      expect(FILE_EXTENSIONS.MODULE_TS).toBe('.module.ts');
      expect(FILE_EXTENSIONS.COMPONENT_TS).toBe('.component.ts');
      expect(FILE_EXTENSIONS.SERVICE_TS).toBe('.service.ts');
    });

    it('should have NgRx extensions', () => {
      expect(FILE_EXTENSIONS.SELECTORS_TS).toBe('.selectors.ts');
      expect(FILE_EXTENSIONS.EFFECTS_TS).toBe('.effects.ts');
      expect(FILE_EXTENSIONS.ACTIONS_TS).toBe('.actions.ts');
      expect(FILE_EXTENSIONS.REDUCER_TS).toBe('.reducer.ts');
      expect(FILE_EXTENSIONS.FACADE_TS).toBe('.facade.ts');
    });

    it('should have data/configuration extensions', () => {
      expect(FILE_EXTENSIONS.JSON).toBe('.json');
      expect(FILE_EXTENSIONS.YAML).toBe('.yaml');
      expect(FILE_EXTENSIONS.YML).toBe('.yml');
      expect(FILE_EXTENSIONS.XML).toBe('.xml');
    });
  });

  describe('PATH_CONSTANTS', () => {
    it('should have path separator', () => {
      expect(PATH_CONSTANTS.SEPARATOR).toBe('/');
    });

    it('should have dot constants', () => {
      expect(PATH_CONSTANTS.DOT).toBe('.');
      expect(PATH_CONSTANTS.DOT_DOT).toBe('..');
    });

    it('should have directory navigation constants', () => {
      expect(PATH_CONSTANTS.ROOT).toBe('/');
      expect(PATH_CONSTANTS.CURRENT_DIR).toBe('./');
      expect(PATH_CONSTANTS.PARENT_DIR).toBe('../');
    });
  });

  describe('PATTERNS', () => {
    it('should have TypeScript glob pattern', () => {
      expect(PATTERNS.TYPESCRIPT_FILES).toBe('**/*.ts');
    });

    it('should have JavaScript glob pattern', () => {
      expect(PATTERNS.JAVASCRIPT_FILES).toBe('**/*.js');
    });

    it('should have test file patterns', () => {
      expect(PATTERNS.SPEC_FILES).toBe('**/*.spec.ts');
      expect(PATTERNS.TEST_FILES).toBe('**/*.test.ts');
    });

    it('should have all files pattern', () => {
      expect(PATTERNS.ALL_FILES).toBe('**/*');
    });
  });

  describe('FILE_OPERATIONS', () => {
    it('should have patterns configuration', () => {
      expect(FILE_OPERATIONS.PATTERNS.ALL_FILES).toBe('**/*');
      expect(FILE_OPERATIONS.PATTERNS.NODE_MODULES_EXCLUDE).toBe(
        'node_modules/**'
      );
    });

    it('should have read options configuration', () => {
      expect(FILE_OPERATIONS.READ_OPTIONS.ENCODING).toBe('utf8');
      expect(FILE_OPERATIONS.READ_OPTIONS.FLAG_READ).toBe('r');
    });
  });

  describe('SKIP_DIRECTORIES', () => {
    it('should have common skip directories', () => {
      expect(SKIP_DIRECTORIES.NODE_MODULES).toBe('node_modules');
      expect(SKIP_DIRECTORIES.DIST).toBe('dist');
      expect(SKIP_DIRECTORIES.BUILD).toBe('build');
      expect(SKIP_DIRECTORIES.GIT).toBe('.git');
      expect(SKIP_DIRECTORIES.COVERAGE).toBe('coverage');
    });

    it('should have framework-specific skip directories', () => {
      expect(SKIP_DIRECTORIES.NX).toBe('.nx');
      expect(SKIP_DIRECTORIES.ANGULAR).toBe('.angular');
    });

    it('should have common code directories to skip', () => {
      expect(SKIP_DIRECTORIES.SHARED).toBe('shared');
      expect(SKIP_DIRECTORIES.CORE).toBe('core');
      expect(SKIP_DIRECTORIES.UTILS).toBe('utils');
    });
  });

  describe('DOC_FILES', () => {
    it('should have common documentation files', () => {
      expect(DOC_FILES.README).toBe('README.md');
      expect(DOC_FILES.SECURITY).toBe('SECURITY.md');
      expect(DOC_FILES.CONTRIBUTING).toBe('CONTRIBUTING.md');
      expect(DOC_FILES.CHANGELOG).toBe('CHANGELOG.md');
    });

    it('should have compliance-related files', () => {
      expect(DOC_FILES.PRIVACY).toBe('PRIVACY.md');
      expect(DOC_FILES.COMPLIANCE).toBe('COMPLIANCE.md');
    });

    it('should have CODEOWNERS file', () => {
      expect(DOC_FILES.CODEOWNERS).toBe('CODEOWNERS');
    });
  });

  describe('CONFIG_FILES', () => {
    it('should have Angular configuration files', () => {
      expect(CONFIG_FILES.ANGULAR_JSON).toBe('angular.json');
      expect(CONFIG_FILES.WORKSPACE_JSON).toBe('workspace.json');
    });

    it('should have TypeScript configuration file', () => {
      expect(CONFIG_FILES.TSCONFIG_JSON).toBe('tsconfig.json');
    });

    it('should have ESLint configuration files', () => {
      expect(CONFIG_FILES.ESLINTRC_JS).toBe('.eslintrc.js');
      expect(CONFIG_FILES.ESLINTRC_JSON).toBe('.eslintrc.json');
    });

    it('should have NPM configuration files', () => {
      expect(CONFIG_FILES.PACKAGE_JSON).toBe('package.json');
      expect(CONFIG_FILES.PACKAGE_LOCK_JSON).toBe('package-lock.json');
      expect(CONFIG_FILES.NPMRC).toBe('.npmrc');
    });

    it('should have Nx configuration file', () => {
      expect(CONFIG_FILES.NX_JSON).toBe('nx.json');
    });

    it('should have JavaScript config file list', () => {
      expect(CONFIG_FILES.JAVASCRIPT).toContain('webpack.config.js');
      expect(CONFIG_FILES.JAVASCRIPT).toContain('jest.config.js');
      expect(Array.isArray(CONFIG_FILES.JAVASCRIPT)).toBe(true);
    });

    it('should have TypeScript config file list', () => {
      expect(CONFIG_FILES.TYPESCRIPT).toContain('jest.config.ts');
      expect(Array.isArray(CONFIG_FILES.TYPESCRIPT)).toBe(true);
    });
  });
});
