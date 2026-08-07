/**
 * @fileoverview Tests for angular-service-organization-configuration.ts
 * @description Tests for Angular service organization configuration utilities
 */

import { AngularServiceOrganizationConfiguration } from '../../src/utils/angular/angular-service-organization/angular-service-organization-configuration';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-service-organization/angular-service-organization-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-service-org-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('ORGANIZATION_PATTERNS', () => {
    describe('DIRECTORY_NAMES', () => {
      it('should have SERVICES directory name', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .DIRECTORY_NAMES.SERVICES
        ).toBe('services');
      });

      it('should have CORE directory name', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .DIRECTORY_NAMES.CORE
        ).toBe('core');
      });

      it('should have SHARED directory name', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .DIRECTORY_NAMES.SHARED
        ).toBe('shared');
      });

      it('should have APP directory name', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .DIRECTORY_NAMES.APP
        ).toBe('app');
      });
    });

    describe('FILE_PATTERNS', () => {
      it('should have SERVICE_EXTENSION', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .FILE_PATTERNS.SERVICE_EXTENSION
        ).toBe('.service.ts');
      });

      it('should have TYPESCRIPT_EXTENSION', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .FILE_PATTERNS.TYPESCRIPT_EXTENSION
        ).toBe('.ts');
      });

      it('should have INDEX_FILE', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .FILE_PATTERNS.INDEX_FILE
        ).toBe('index.ts');
      });
    });

    describe('DEPENDENCY_INJECTION', () => {
      it('should have PROVIDED_IN_ROOT', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .DEPENDENCY_INJECTION.PROVIDED_IN_ROOT
        ).toBe("providedIn: 'root'");
      });

      it('should have PROVIDED_IN_ANY', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .DEPENDENCY_INJECTION.PROVIDED_IN_ANY
        ).toBe('providedIn');
      });
    });

    describe('SERVICE_CATEGORIES', () => {
      it('should have HTTP_PATTERNS', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.HTTP_PATTERNS
        ).toContain('http');
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.HTTP_PATTERNS
        ).toContain('api');
      });

      it('should have DATA_PATTERNS', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.DATA_PATTERNS
        ).toContain('data');
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.DATA_PATTERNS
        ).toContain('repository');
      });

      it('should have AUTH_PATTERNS', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.AUTH_PATTERNS
        ).toContain('auth');
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.AUTH_PATTERNS
        ).toContain('user');
      });

      it('should have UTILITY_PATTERNS', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.UTILITY_PATTERNS
        ).toContain('util');
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SERVICE_CATEGORIES.UTILITY_PATTERNS
        ).toContain('helper');
      });
    });

    describe('RESPONSIBILITY_PATTERNS', () => {
      it('should have HTTP_CLIENT', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .RESPONSIBILITY_PATTERNS.HTTP_CLIENT
        ).toBe('HttpClient');
      });

      it('should have LOCAL_STORAGE', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .RESPONSIBILITY_PATTERNS.LOCAL_STORAGE
        ).toBe('localStorage');
      });

      it('should have SESSION_STORAGE', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .RESPONSIBILITY_PATTERNS.SESSION_STORAGE
        ).toBe('sessionStorage');
      });
    });

    describe('SKIP_DIRECTORIES', () => {
      it('should include node_modules', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SKIP_DIRECTORIES
        ).toContain('node_modules');
      });

      it('should include dist', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SKIP_DIRECTORIES
        ).toContain('dist');
      });

      it('should include .git', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SKIP_DIRECTORIES
        ).toContain('.git');
      });

      it('should include coverage', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SKIP_DIRECTORIES
        ).toContain('coverage');
      });

      it('should include .nx', () => {
        expect(
          AngularServiceOrganizationConfiguration.ORGANIZATION_PATTERNS
            .SKIP_DIRECTORIES
        ).toContain('.nx');
      });
    });
  });

  describe('getThresholds', () => {
    it('should have MAX_SERVICES_IN_DIRECTORY', () => {
      expect(
        AngularServiceOrganizationConfiguration.getThresholds({})
          .MAX_SERVICES_IN_DIRECTORY
      ).toBe(10);
    });

    it('should have MIN_SERVICES_FOR_BARREL', () => {
      expect(
        AngularServiceOrganizationConfiguration.getThresholds({})
          .MIN_SERVICES_FOR_BARREL
      ).toBe(3);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have ORGANIZE_SERVICES_SUGGESTION', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .ORGANIZE_SERVICES_SUGGESTION
      ).toContain('services');
    });

    it('should have SUBDIRECTORY_SUGGESTION', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .SUBDIRECTORY_SUGGESTION
      ).toContain('subdirectories');
    });

    it('should have BARREL_EXPORT_SUGGESTION', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .BARREL_EXPORT_SUGGESTION
      ).toContain('index.ts');
    });

    it('should have CORE_PROVIDED_IN_ROOT_SUGGESTION with placeholder', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .CORE_PROVIDED_IN_ROOT_SUGGESTION
      ).toContain('{fileName}');
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .CORE_PROVIDED_IN_ROOT_SUGGESTION
      ).toContain('providedIn');
    });

    it('should have SHARED_PROVIDED_IN_SUGGESTION with placeholder', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .SHARED_PROVIDED_IN_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have SEPARATE_HTTP_LOGIC_SUGGESTION with placeholder', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .SEPARATE_HTTP_LOGIC_SUGGESTION
      ).toContain('{fileName}');
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .SEPARATE_HTTP_LOGIC_SUGGESTION
      ).toContain('HTTP');
    });

    it('should have SEPARATE_STORAGE_LOGIC_SUGGESTION with placeholder', () => {
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .SEPARATE_STORAGE_LOGIC_SUGGESTION
      ).toContain('{fileName}');
      expect(
        AngularServiceOrganizationConfiguration.VALIDATION_MESSAGES
          .SEPARATE_STORAGE_LOGIC_SUGGESTION
      ).toContain('storage');
    });
  });

  describe('categorizeServices', () => {
    it('should categorize HTTP services correctly', () => {
      const services = ['http.service.ts', 'api.service.ts', 'auth.service.ts'];
      const result =
        AngularServiceOrganizationConfiguration.categorizeServices(services);

      expect(result.http).toContain('http.service.ts');
      expect(result.http).toContain('api.service.ts');
    });

    it('should categorize data services correctly', () => {
      const services = ['data.service.ts', 'repository.service.ts'];
      const result =
        AngularServiceOrganizationConfiguration.categorizeServices(services);

      expect(result.data).toContain('data.service.ts');
      expect(result.data).toContain('repository.service.ts');
    });

    it('should categorize auth services correctly', () => {
      const services = ['auth.service.ts', 'user.service.ts'];
      const result =
        AngularServiceOrganizationConfiguration.categorizeServices(services);

      expect(result.auth).toContain('auth.service.ts');
      expect(result.auth).toContain('user.service.ts');
    });

    it('should categorize utility services correctly', () => {
      const services = ['util.service.ts', 'helper.service.ts'];
      const result =
        AngularServiceOrganizationConfiguration.categorizeServices(services);

      expect(result.utility).toContain('util.service.ts');
      expect(result.utility).toContain('helper.service.ts');
    });

    it('should categorize business services correctly', () => {
      const services = ['product.service.ts', 'order.service.ts'];
      const result =
        AngularServiceOrganizationConfiguration.categorizeServices(services);

      expect(result.business).toContain('product.service.ts');
      expect(result.business).toContain('order.service.ts');
    });

    it('should handle empty array', () => {
      const result = AngularServiceOrganizationConfiguration.categorizeServices(
        []
      );

      expect(result.http).toEqual([]);
      expect(result.data).toEqual([]);
      expect(result.auth).toEqual([]);
      expect(result.utility).toEqual([]);
      expect(result.business).toEqual([]);
    });
  });

  describe('isServiceFile', () => {
    it('should return true for service files', () => {
      const entry = {
        isFile: () => true,
        name: 'user.service.ts',
      };
      expect(AngularServiceOrganizationConfiguration.isServiceFile(entry)).toBe(
        true
      );
    });

    it('should return false for non-service files', () => {
      const entry = {
        isFile: () => true,
        name: 'user.component.ts',
      };
      expect(AngularServiceOrganizationConfiguration.isServiceFile(entry)).toBe(
        false
      );
    });

    it('should return false for directories', () => {
      const entry = {
        isFile: () => false,
        name: 'user.service.ts',
      };
      expect(AngularServiceOrganizationConfiguration.isServiceFile(entry)).toBe(
        false
      );
    });
  });

  describe('shouldSkipDirectory', () => {
    it('should return true for node_modules', () => {
      expect(
        AngularServiceOrganizationConfiguration.shouldSkipDirectory(
          'node_modules'
        )
      ).toBe(true);
    });

    it('should return true for dist', () => {
      expect(
        AngularServiceOrganizationConfiguration.shouldSkipDirectory('dist')
      ).toBe(true);
    });

    it('should return true for .git', () => {
      expect(
        AngularServiceOrganizationConfiguration.shouldSkipDirectory('.git')
      ).toBe(true);
    });

    it('should return false for src', () => {
      expect(
        AngularServiceOrganizationConfiguration.shouldSkipDirectory('src')
      ).toBe(false);
    });

    it('should return false for app', () => {
      expect(
        AngularServiceOrganizationConfiguration.shouldSkipDirectory('app')
      ).toBe(false);
    });
  });

  describe('analyzeOrganizationPatterns', () => {
    it('should return organization analysis results', () => {
      const mockConfig = { excludePatterns: [] } as any;
      const result =
        AngularServiceOrganizationConfiguration.analyzeOrganizationPatterns(
          tempDir,
          tempDir,
          mockConfig
        );

      expect(result).toHaveProperty('hasServicesDir');
      expect(result).toHaveProperty('hasCoreDir');
      expect(result).toHaveProperty('hasSharedDir');
      expect(result).toHaveProperty('appExists');
    });

    it('should return false for non-existent directories', () => {
      const mockConfig = { excludePatterns: [] } as any;
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');
      const result =
        AngularServiceOrganizationConfiguration.analyzeOrganizationPatterns(
          nonExistentPath,
          nonExistentPath,
          mockConfig
        );

      expect(result.hasServicesDir).toBe(false);
      expect(result.hasCoreDir).toBe(false);
      expect(result.hasSharedDir).toBe(false);
      expect(result.appExists).toBe(false);
    });
  });
});
