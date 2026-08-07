/**
 * @fileoverview Tests for angular-module-utils.ts
 * @description Tests for Angular module utilities
 */

import { AngularModuleUtils } from '../../src/utils/angular/angular-module-utils';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-module-utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-module-utils-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('hasBarrelExport', () => {
    it('should return true when index.ts exists in module directory', () => {
      // Create a module file and its index.ts
      const moduleDir = PathOperations.join(tempDir, 'feature-module');
      FileUtils.createDirectory(moduleDir);
      const moduleFile = PathOperations.join(moduleDir, 'feature.module.ts');
      const indexFile = PathOperations.join(moduleDir, 'index.ts');

      FileUtils.writeFile(moduleFile, 'export class FeatureModule {}');
      FileUtils.writeFile(indexFile, 'export * from "./feature.module";');

      const result = AngularModuleUtils.hasBarrelExport(moduleFile);

      expect(result).toBe(true);
    });

    it('should return false when index.ts does not exist', () => {
      // Create a module file without index.ts
      const moduleDir = PathOperations.join(tempDir, 'feature-module');
      FileUtils.createDirectory(moduleDir);
      const moduleFile = PathOperations.join(moduleDir, 'feature.module.ts');

      FileUtils.writeFile(moduleFile, 'export class FeatureModule {}');

      const result = AngularModuleUtils.hasBarrelExport(moduleFile);

      expect(result).toBe(false);
    });

    it('should handle nested module directories', () => {
      // Create nested directory structure
      const nestedDir = PathOperations.join(
        tempDir,
        'features',
        'user',
        'profile'
      );
      FileUtils.createDirectory(nestedDir);
      const moduleFile = PathOperations.join(nestedDir, 'profile.module.ts');
      const indexFile = PathOperations.join(nestedDir, 'index.ts');

      FileUtils.writeFile(moduleFile, 'export class ProfileModule {}');
      FileUtils.writeFile(indexFile, 'export * from "./profile.module";');

      const result = AngularModuleUtils.hasBarrelExport(moduleFile);

      expect(result).toBe(true);
    });
  });

  describe('getModuleClassName', () => {
    it('should convert hyphenated module name to PascalCase with Module suffix', () => {
      const result = AngularModuleUtils.getModuleClassName('user-profile');

      expect(result).toBe('UserProfileModule');
    });

    it('should handle single word module name', () => {
      const result = AngularModuleUtils.getModuleClassName('auth');

      expect(result).toBe('AuthModule');
    });

    it('should handle multiple hyphens in module name', () => {
      const result = AngularModuleUtils.getModuleClassName(
        'user-profile-settings'
      );

      expect(result).toBe('UserProfileSettingsModule');
    });

    it('should not add Module suffix if name already contains .module', () => {
      const result = AngularModuleUtils.getModuleClassName('user.module');

      expect(result).toBe('User.module');
    });

    it('should handle empty parts correctly', () => {
      const result = AngularModuleUtils.getModuleClassName('feature');

      expect(result).toBe('FeatureModule');
    });

    it('should handle all lowercase single characters', () => {
      const result = AngularModuleUtils.getModuleClassName('a-b-c');

      expect(result).toBe('ABCModule');
    });

    it('should preserve case sensitivity in conversion', () => {
      const result = AngularModuleUtils.getModuleClassName('Admin-Dashboard');

      expect(result).toBe('AdminDashboardModule');
    });
  });

  describe('getModuleCategory', () => {
    it('should return infrastructure category for shared directory', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/app/shared/shared.module.ts'
      );

      expect(result.type).toBe('infrastructure');
      expect(result.shouldCheckLazyLoading).toBe(false);
    });

    it('should return infrastructure category for core directory', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/app/core/core.module.ts'
      );

      expect(result.type).toBe('infrastructure');
      expect(result.shouldCheckLazyLoading).toBe(false);
    });

    it('should return feature category for feature module', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/app/features/user/user.module.ts'
      );

      expect(result.type).toBe('feature');
      expect(result.shouldCheckLazyLoading).toBe(true);
    });

    it('should return feature category for non-infrastructure module', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/app/dashboard/dashboard.module.ts'
      );

      expect(result.type).toBe('feature');
      expect(result.shouldCheckLazyLoading).toBe(true);
    });

    it('should handle nested shared modules as infrastructure', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/app/modules/shared/components/button.module.ts'
      );

      expect(result.type).toBe('infrastructure');
      expect(result.shouldCheckLazyLoading).toBe(false);
    });

    it('should handle nested core modules as infrastructure', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'libs/core/auth/auth.module.ts'
      );

      expect(result.type).toBe('infrastructure');
      expect(result.shouldCheckLazyLoading).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      // PathOperations normalizes paths, but let's test input
      const result = AngularModuleUtils.getModuleCategory(
        'src\\app\\shared\\shared.module.ts'
      );

      expect(result.type).toBe('infrastructure');
    });

    it('should categorize app.module as feature', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/app/app.module.ts'
      );

      expect(result.type).toBe('feature');
      expect(result.shouldCheckLazyLoading).toBe(true);
    });
  });

  describe('MODULE_CATEGORIES constant', () => {
    it('should have INFRASTRUCTURE category defined', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/shared/test.module.ts'
      );

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('shouldCheckLazyLoading');
    });

    it('should have FEATURE category defined', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'src/features/test.module.ts'
      );

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('shouldCheckLazyLoading');
    });
  });

  describe('edge cases', () => {
    it('should handle empty module name in getModuleClassName', () => {
      const result = AngularModuleUtils.getModuleClassName('');

      // Empty string split by '-' gives ['']
      expect(result).toBe('Module');
    });

    it('should handle module name with only hyphens', () => {
      const result = AngularModuleUtils.getModuleClassName('---');

      // Split gives ['', '', '', '']
      expect(result).toBe('Module');
    });

    it('should handle file path with no recognizable directories', () => {
      const result = AngularModuleUtils.getModuleCategory('random.module.ts');

      expect(result.type).toBe('feature');
    });

    it('should handle deeply nested path', () => {
      const result = AngularModuleUtils.getModuleCategory(
        'a/b/c/d/e/f/g/h/i/j/feature.module.ts'
      );

      expect(result.type).toBe('feature');
      expect(result.shouldCheckLazyLoading).toBe(true);
    });
  });
});
