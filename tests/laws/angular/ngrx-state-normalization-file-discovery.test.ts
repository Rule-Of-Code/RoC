/**
 * @fileoverview Tests for NgRxStateNormalizationFileDiscoveryConstants
 * @description NgRx state file discovery constants and utilities
 */
import { NgRxStateNormalizationFileDiscoveryConstants } from '../../../src/laws/angular/ngrx-state-normalization-mandate/constants/file-discovery';

describe('NgRxStateNormalizationFileDiscoveryConstants', () => {
  describe('SCAN_DIRECTORIES', () => {
    it('should include src directory', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('src');
    });

    it('should include apps directory', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('apps');
    });

    it('should have exactly 2 directories', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toHaveLength(2);
    });
  });

  describe('STATE_FILE_PATTERNS', () => {
    describe('REDUCER pattern', () => {
      it('should match reducer files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'user.reducer.ts'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'app.reducer.ts'
          )
        ).toBe(true);
      });

      it('should match state files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'user.state.ts'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'app.state.ts'
          )
        ).toBe(true);
      });

      it('should be case insensitive', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'User.Reducer.ts'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'App.STATE.ts'
          )
        ).toBe(true);
      });

      it('should not match non-reducer files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.REDUCER.test(
            'user.service.ts'
          )
        ).toBe(false);
      });
    });

    describe('SELECTOR pattern', () => {
      it('should match selector files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.SELECTOR.test(
            'user.selector.ts'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.SELECTOR.test(
            'user.selectors.ts'
          )
        ).toBe(true);
      });

      it('should be case insensitive', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.SELECTOR.test(
            'User.Selectors.ts'
          )
        ).toBe(true);
      });

      it('should not match non-selector files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.SELECTOR.test(
            'user.service.ts'
          )
        ).toBe(false);
      });
    });

    describe('ACTIONS pattern', () => {
      it('should match actions files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.ACTIONS.test(
            'user.actions.ts'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.ACTIONS.test(
            'auth.actions.ts'
          )
        ).toBe(true);
      });

      it('should not match non-actions files', () => {
        expect(
          NgRxStateNormalizationFileDiscoveryConstants.STATE_FILE_PATTERNS.ACTIONS.test(
            'user.reducer.ts'
          )
        ).toBe(false);
      });
    });
  });

  describe('TYPESCRIPT_EXTENSIONS', () => {
    it('should include ts extension', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.TYPESCRIPT_EXTENSIONS
      ).toContain('ts');
    });

    it('should include tsx extension', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.TYPESCRIPT_EXTENSIONS
      ).toContain('tsx');
    });

    it('should have exactly 2 extensions', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.TYPESCRIPT_EXTENSIONS
      ).toHaveLength(2);
    });
  });

  describe('EXCLUSION_PATTERNS', () => {
    it('should include node_modules', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('node_modules');
    });

    it('should include dist', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('dist');
    });

    it('should include build', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('build');
    });

    it('should include coverage', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('coverage');
    });

    it('should include .angular', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('.angular');
    });

    it('should include .cache', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('.cache');
    });

    it('should include tmp', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toContain('tmp');
    });

    it('should have exactly 7 exclusion patterns', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toHaveLength(7);
    });
  });

  describe('isTypeScriptFile', () => {
    it('should return true for .ts files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isTypeScriptFile('file.ts')
      ).toBe(true);
    });

    it('should return true for .tsx files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isTypeScriptFile(
          'file.tsx'
        )
      ).toBe(true);
    });

    it('should return false for .js files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isTypeScriptFile('file.js')
      ).toBe(false);
    });

    it('should return false for .json files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isTypeScriptFile(
          'file.json'
        )
      ).toBe(false);
    });

    it('should handle uppercase extensions', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isTypeScriptFile('file.TS')
      ).toBe(true);
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isTypeScriptFile(
          'file.TSX'
        )
      ).toBe(true);
    });
  });

  describe('isStateFile', () => {
    it('should return true for reducer files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isStateFile(
          'user.reducer.ts'
        )
      ).toBe(true);
    });

    it('should return true for state files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isStateFile('app.state.ts')
      ).toBe(true);
    });

    it('should return false for non-state files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isStateFile(
          'user.service.ts'
        )
      ).toBe(false);
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isStateFile(
          'user.actions.ts'
        )
      ).toBe(false);
    });
  });

  describe('isSelectorFile', () => {
    it('should return true for selector files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isSelectorFile(
          'user.selector.ts'
        )
      ).toBe(true);
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isSelectorFile(
          'user.selectors.ts'
        )
      ).toBe(true);
    });

    it('should return false for non-selector files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isSelectorFile(
          'user.reducer.ts'
        )
      ).toBe(false);
    });
  });

  describe('isActionsFile', () => {
    it('should return true for actions files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isActionsFile(
          'user.actions.ts'
        )
      ).toBe(true);
    });

    it('should return false for non-actions files', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.isActionsFile(
          'user.reducer.ts'
        )
      ).toBe(false);
    });
  });

  describe('shouldExcludeDirectory', () => {
    it('should return true for node_modules', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.shouldExcludeDirectory(
          '/path/to/node_modules'
        )
      ).toBe(true);
    });

    it('should return true for dist', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.shouldExcludeDirectory(
          '/project/dist'
        )
      ).toBe(true);
    });

    it('should return true for coverage', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.shouldExcludeDirectory(
          '/project/coverage'
        )
      ).toBe(true);
    });

    it('should return false for src directory', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.shouldExcludeDirectory(
          '/project/src'
        )
      ).toBe(false);
    });

    it('should return false for app directory', () => {
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.shouldExcludeDirectory(
          '/project/src/app'
        )
      ).toBe(false);
    });
  });

  describe('getScanDirectories', () => {
    it('should return array of directory paths', () => {
      const result =
        NgRxStateNormalizationFileDiscoveryConstants.getScanDirectories(
          '/project'
        );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter non-existent directories', () => {
      // Non-existent directories should be filtered out
      const result =
        NgRxStateNormalizationFileDiscoveryConstants.getScanDirectories(
          '/nonexistent-root-dir-xyz123'
        );
      expect(result).toEqual([]);
    });
  });

  describe('getPackageJsonPath', () => {
    it('should return path to package.json', () => {
      const result =
        NgRxStateNormalizationFileDiscoveryConstants.getPackageJsonPath(
          '/project'
        );
      expect(result).toContain('package.json');
    });

    it('should join project root with package.json', () => {
      const result =
        NgRxStateNormalizationFileDiscoveryConstants.getPackageJsonPath(
          '/my/project'
        );
      expect(result).toBe('/my/project/package.json');
    });
  });

  describe('immutability', () => {
    it('should have consistent SCAN_DIRECTORIES', () => {
      const original = [
        ...NgRxStateNormalizationFileDiscoveryConstants.SCAN_DIRECTORIES,
      ];
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toEqual(original);
    });

    it('should have consistent EXCLUSION_PATTERNS', () => {
      const original = [
        ...NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS,
      ];
      expect(
        NgRxStateNormalizationFileDiscoveryConstants.EXCLUSION_PATTERNS
      ).toEqual(original);
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
