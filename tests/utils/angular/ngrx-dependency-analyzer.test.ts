/**
 * @fileoverview Tests for ngrx-dependency-analyzer.ts
 * @description Tests for NgRx Dependency Analyzer utility
 */

import { NgRxDependencyAnalyzer } from '../../../src/utils/angular/ngrx-dependency-analyzer';
import { ProjectTypeDetector } from '../../../src/utils/config/project-type-detector';
import { NGRX_KEYWORDS, NGRX_MESSAGES } from '../../../src/utils/constants';

describe('utils/angular/ngrx-dependency-analyzer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxDependencyAnalyzer', () => {
    describe('REQUIRED_NGRX_DEPENDENCIES', () => {
      it('should have core dependencies defined', () => {
        expect(
          NgRxDependencyAnalyzer.REQUIRED_NGRX_DEPENDENCIES.core
        ).toBeDefined();
        expect(
          NgRxDependencyAnalyzer.REQUIRED_NGRX_DEPENDENCIES.core
        ).toContain(NGRX_KEYWORDS.NGRX_STORE);
      });

      it('should have optional dependencies defined', () => {
        expect(
          NgRxDependencyAnalyzer.REQUIRED_NGRX_DEPENDENCIES.optional
        ).toBeDefined();
        expect(
          NgRxDependencyAnalyzer.REQUIRED_NGRX_DEPENDENCIES.optional
        ).toContain(NGRX_KEYWORDS.NGRX_EFFECTS);
      });

      it('should have devtools dependencies defined', () => {
        expect(
          NgRxDependencyAnalyzer.REQUIRED_NGRX_DEPENDENCIES.devtools
        ).toBeDefined();
        expect(
          NgRxDependencyAnalyzer.REQUIRED_NGRX_DEPENDENCIES.devtools
        ).toContain(NGRX_KEYWORDS.NGRX_STORE_DEVTOOLS);
      });
    });

    describe('getPackageJsonData', () => {
      it('should delegate to ProjectTypeDetector.getPackageJson', () => {
        expect(NgRxDependencyAnalyzer.getPackageJsonData).toBe(
          ProjectTypeDetector.getPackageJson
        );
      });
    });

    describe('getAllProjectDependencies', () => {
      it('should delegate to ProjectTypeDetector.getAllDependencies', () => {
        expect(NgRxDependencyAnalyzer.getAllProjectDependencies).toBe(
          ProjectTypeDetector.getAllDependencies
        );
      });
    });

    describe('checkDevToolsDependencyInstalled', () => {
      it('should return false when package.json is not found', () => {
        const getPackageJsonSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageJson'
        );
        getPackageJsonSpy.mockReturnValue(null);

        const result =
          NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled(
            '/test/project'
          );

        expect(result).toBe(false);
        expect(getPackageJsonSpy).toHaveBeenCalledWith('/test/project');
      });

      it('should return true when @ngrx/store-devtools is installed', () => {
        const getPackageJsonSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageJson'
        );
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );

        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store-devtools': '^15.0.0' },
        });
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store-devtools': '^15.0.0',
        });

        const result =
          NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled(
            '/test/project'
          );

        expect(result).toBe(true);
      });

      it('should return false when @ngrx/store-devtools is not installed', () => {
        const getPackageJsonSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageJson'
        );
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );

        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store': '^15.0.0' },
        });
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store': '^15.0.0',
        });

        const result =
          NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled(
            '/test/project'
          );

        expect(result).toBe(false);
      });

      it('should check devDependencies for devtools package', () => {
        const getPackageJsonSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageJson'
        );
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );

        getPackageJsonSpy.mockReturnValue({
          devDependencies: { '@ngrx/store-devtools': '^15.0.0' },
        });
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store-devtools': '^15.0.0',
        });

        const result =
          NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled(
            '/test/project'
          );

        expect(result).toBe(true);
      });
    });

    describe('analyzeDependencies', () => {
      it('should detect all NgRx dependencies when present', () => {
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store': '^15.0.0',
          '@ngrx/effects': '^15.0.0',
          '@ngrx/store-devtools': '^15.0.0',
        });

        const packageJson = {
          dependencies: {
            '@ngrx/store': '^15.0.0',
            '@ngrx/effects': '^15.0.0',
            '@ngrx/store-devtools': '^15.0.0',
          },
        };

        const result = NgRxDependencyAnalyzer.analyzeDependencies(packageJson);

        expect(result.dependencies.hasStore).toBe(true);
        expect(result.dependencies.hasEffects).toBe(true);
        expect(result.dependencies.hasDevTools).toBe(true);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return suggestions when @ngrx/store is missing', () => {
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );
        getAllDependenciesSpy.mockReturnValue({});

        const packageJson = { dependencies: {} };

        const result = NgRxDependencyAnalyzer.analyzeDependencies(packageJson);

        expect(result.dependencies.hasStore).toBe(false);
        expect(result.suggestions).toContain(
          NGRX_MESSAGES.INSTALL_FOR_STATE('@ngrx/store')
        );
      });

      it('should return suggestions when @ngrx/effects is missing', () => {
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store': '^15.0.0',
        });

        const packageJson = {
          dependencies: { '@ngrx/store': '^15.0.0' },
        };

        const result = NgRxDependencyAnalyzer.analyzeDependencies(packageJson);

        expect(result.dependencies.hasEffects).toBe(false);
        expect(result.suggestions).toContain(
          NGRX_MESSAGES.INSTALL_FOR_EFFECTS('@ngrx/effects')
        );
      });

      it('should return suggestions when @ngrx/store-devtools is missing', () => {
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store': '^15.0.0',
          '@ngrx/effects': '^15.0.0',
        });

        const packageJson = {
          dependencies: {
            '@ngrx/store': '^15.0.0',
            '@ngrx/effects': '^15.0.0',
          },
        };

        const result = NgRxDependencyAnalyzer.analyzeDependencies(packageJson);

        expect(result.dependencies.hasDevTools).toBe(false);
        expect(result.suggestions).toContain(
          NGRX_MESSAGES.INSTALL_FOR_DEBUGGING('@ngrx/store-devtools')
        );
      });

      it('should return all suggestions when no NgRx dependencies are present', () => {
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );
        getAllDependenciesSpy.mockReturnValue({});

        const packageJson = { dependencies: {} };

        const result = NgRxDependencyAnalyzer.analyzeDependencies(packageJson);

        expect(result.dependencies.hasStore).toBe(false);
        expect(result.dependencies.hasEffects).toBe(false);
        expect(result.dependencies.hasDevTools).toBe(false);
        expect(result.suggestions).toHaveLength(3);
      });

      it('should handle package.json with only devDependencies', () => {
        const getAllDependenciesSpy = jest.spyOn(
          ProjectTypeDetector,
          'getAllDependencies'
        );
        getAllDependenciesSpy.mockReturnValue({
          '@ngrx/store': '^15.0.0',
        });

        const packageJson = {
          devDependencies: { '@ngrx/store': '^15.0.0' },
        };

        const result = NgRxDependencyAnalyzer.analyzeDependencies(packageJson);

        expect(result.dependencies.hasStore).toBe(true);
      });
    });
  });
});
