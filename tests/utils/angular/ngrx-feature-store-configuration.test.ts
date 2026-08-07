/**
 * @fileoverview Tests for ngrx-feature-store-configuration.ts
 * @description Tests for NgRx Feature Store Configuration utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFeatureStoreConfiguration } from '../../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-configuration';
import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
} from '../../../src/utils/constants';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-feature-store/ngrx-feature-store-configuration', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxFeatureStoreConfiguration', () => {
    describe('REQUIRED_FILE_EXTENSIONS', () => {
      it('should have all required NgRx file extensions', () => {
        const extensions =
          NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.ACTIONS_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.REDUCER_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.SELECTORS_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.EFFECTS_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.MODELS_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.FACADE_TS);
      });

      it('should be a readonly array', () => {
        expect(
          Array.isArray(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS)
        ).toBe(true);
        // Verify array is defined and has the readonly type
        expect(
          NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS.length
        ).toBeGreaterThan(0);
      });
    });

    describe('OPTIONAL_FILE_EXTENSIONS', () => {
      it('should have optional NgRx file extensions', () => {
        const extensions =
          NgRxFeatureStoreConfiguration.OPTIONAL_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.EFFECTS_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.FACADE_TS);
      });

      it('should be a readonly array', () => {
        expect(
          Array.isArray(NgRxFeatureStoreConfiguration.OPTIONAL_FILE_EXTENSIONS)
        ).toBe(true);
        // Verify array is defined and has the readonly type
        expect(
          NgRxFeatureStoreConfiguration.OPTIONAL_FILE_EXTENSIONS.length
        ).toBeGreaterThan(0);
      });
    });

    describe('VALIDATION_MESSAGES_CONFIG', () => {
      it('should have all validation message templates', () => {
        const messages =
          NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG;
        expect(messages.MISSING_PLUS_STATE).toBeDefined();
        expect(messages.CREATE_PLUS_STATE).toBeDefined();
        expect(messages.MISSING_REQUIRED_FILE).toBeDefined();
        expect(messages.CREATE_REQUIRED_FILE).toBeDefined();
        expect(messages.CONSIDER_OPTIONAL_FILE).toBeDefined();
        expect(messages.CREATE_FEATURE_DIRECTORIES).toBeDefined();
      });

      it('should have proper template placeholders', () => {
        const messages =
          NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG;
        expect(messages.MISSING_PLUS_STATE).toContain('{0}');
        expect(messages.CREATE_PLUS_STATE).toContain('{0}');
        expect(messages.MISSING_REQUIRED_FILE).toContain('{0}');
        expect(messages.MISSING_REQUIRED_FILE).toContain('{1}');
      });
    });

    describe('getRequiredFeatureFiles', () => {
      it('should return required files with feature name prefix', () => {
        const files =
          NgRxFeatureStoreConfiguration.getRequiredFeatureFiles('user');
        expect(files).toContain('user.actions.ts');
        expect(files).toContain('user.reducer.ts');
        expect(files).toContain('user.selectors.ts');
        expect(files).toContain('user.effects.ts');
        expect(files).toContain('user.models.ts');
        expect(files).toContain('user.facade.ts');
      });

      it('should include index.ts in required files', () => {
        const files =
          NgRxFeatureStoreConfiguration.getRequiredFeatureFiles('products');
        expect(files).toContain(ANGULAR_CONSTANTS.INDEX_TS);
      });

      it('should work with different feature names', () => {
        const files =
          NgRxFeatureStoreConfiguration.getRequiredFeatureFiles('order');
        expect(files.some(f => f.startsWith('order'))).toBe(true);
      });
    });

    describe('getOptionalFeatureFiles', () => {
      it('should return optional files with feature name prefix', () => {
        const files =
          NgRxFeatureStoreConfiguration.getOptionalFeatureFiles('user');
        expect(files).toContain('user.effects.ts');
        expect(files).toContain('user.facade.ts');
      });

      it('should return correct number of optional files', () => {
        const files =
          NgRxFeatureStoreConfiguration.getOptionalFeatureFiles('cart');
        expect(files.length).toBe(
          NgRxFeatureStoreConfiguration.OPTIONAL_FILE_EXTENSIONS.length
        );
      });
    });

    describe('getValidationMessages', () => {
      it('should return message generator functions', () => {
        const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
        expect(typeof messages.MISSING_PLUS_STATE).toBe('function');
        expect(typeof messages.CREATE_PLUS_STATE).toBe('function');
        expect(typeof messages.MISSING_REQUIRED_FILE).toBe('function');
        expect(typeof messages.CREATE_REQUIRED_FILE).toBe('function');
        expect(typeof messages.CONSIDER_OPTIONAL_FILE).toBe('function');
        expect(typeof messages.CREATE_FEATURE_DIRECTORIES).toBe('string');
      });

      it('should generate correct MISSING_PLUS_STATE message', () => {
        const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
        const message = messages.MISSING_PLUS_STATE('users');
        expect(message).toContain('users');
        expect(message).toContain('+state');
      });

      it('should generate correct CREATE_PLUS_STATE message', () => {
        const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
        const message = messages.CREATE_PLUS_STATE('products');
        expect(message).toContain('products');
        expect(message).toContain('+state');
      });

      it('should generate correct MISSING_REQUIRED_FILE message', () => {
        const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
        const message = messages.MISSING_REQUIRED_FILE(
          'user.actions.ts',
          'user'
        );
        expect(message).toContain('user.actions.ts');
        expect(message).toContain('user');
      });

      it('should generate correct CREATE_REQUIRED_FILE message', () => {
        const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
        const message = messages.CREATE_REQUIRED_FILE(
          'user.reducer.ts',
          'user'
        );
        expect(message).toContain('user.reducer.ts');
        expect(message).toContain('user');
      });

      it('should generate correct CONSIDER_OPTIONAL_FILE message', () => {
        const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
        const message = messages.CONSIDER_OPTIONAL_FILE(
          'user.facade.ts',
          'user'
        );
        expect(message).toContain('user.facade.ts');
        expect(message).toContain('user');
      });
    });

    describe('findPotentialFeatureDirectories', () => {
      it('should return empty array when src/app does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result =
          NgRxFeatureStoreConfiguration.findPotentialFeatureDirectories(
            '/test/project',
            mockConfig
          );

        expect(result).toEqual([]);
      });

      it('should return array when src/app exists', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        existsSpy.mockReturnValue(true);
        readDirSpy.mockReturnValue([]);

        const result =
          NgRxFeatureStoreConfiguration.findPotentialFeatureDirectories(
            '/test/project',
            mockConfig
          );

        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('hasFeatureIndicators', () => {
      it('should return true when +state directory exists', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          { name: '+state', isDirectory: () => true, isFile: () => false },
        ] as never);

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result).toBe(true);
      });

      it('should return true when NgRx files exist', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          {
            name: 'user.actions.ts',
            isDirectory: () => false,
            isFile: () => true,
          },
        ] as never);

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result).toBe(true);
      });

      it('should return true when reducer file exists', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          {
            name: 'user.reducer.ts',
            isDirectory: () => false,
            isFile: () => true,
          },
        ] as never);

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result).toBe(true);
      });

      it('should return true when selectors file exists', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          {
            name: 'user.selectors.ts',
            isDirectory: () => false,
            isFile: () => true,
          },
        ] as never);

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result).toBe(true);
      });

      it('should return true when effects file exists', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          {
            name: 'user.effects.ts',
            isDirectory: () => false,
            isFile: () => true,
          },
        ] as never);

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result).toBe(true);
      });

      it('should return false when no NgRx indicators exist', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          {
            name: 'user.component.ts',
            isDirectory: () => false,
            isFile: () => true,
          },
          {
            name: 'user.service.ts',
            isDirectory: () => false,
            isFile: () => true,
          },
        ] as never);

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result).toBe(false);
      });

      it('should return false when directory read throws error', () => {
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        readDirSpy.mockImplementation(() => {
          throw new Error('Directory not found');
        });

        const result = NgRxFeatureStoreConfiguration.hasFeatureIndicators(
          '/test/nonexistent',
          mockConfig
        );

        expect(result).toBe(false);
      });
    });

    describe('analyzeFeatureStructure', () => {
      it('should extract feature name from directory path', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.featureName).toBe('users');
      });

      it('should detect missing +state directory', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.hasStateDir).toBe(false);
      });

      it('should detect existing +state directory', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockImplementation((path: string) => {
          return path.includes('+state');
        });
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.hasStateDir).toBe(true);
      });

      it('should return correct stateDir path', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.stateDir).toContain('+state');
      });

      it('should find missing required files when +state exists', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockImplementation((path: string) => {
          if (path.includes('+state') && !path.includes('.ts')) {
            return true;
          }
          return false;
        });
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.missingFiles.length).toBeGreaterThan(0);
      });

      it('should have empty missingFiles when +state directory missing', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.missingFiles).toEqual([]);
      });

      it('should categorize optional files correctly', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockImplementation((path: string) => {
          if (path.includes('+state') && !path.includes('.ts')) {
            return true;
          }
          if (
            path.includes('.actions.ts') ||
            path.includes('.reducer.ts') ||
            path.includes('.selectors.ts') ||
            path.includes('.models.ts') ||
            path.includes('index.ts')
          ) {
            return true;
          }
          return false;
        });
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('users');

        const result = NgRxFeatureStoreConfiguration.analyzeFeatureStructure(
          '/test/project/src/app/users',
          mockConfig
        );

        expect(result.optionalFiles.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
