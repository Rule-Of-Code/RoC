/**
 * @fileoverview Tests for rxjs-file-discovery.ts
 * @description Tests for RxJS File Discovery utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { RxJSFileDiscovery } from '../../../src/utils/angular/rxjs-file-discovery';
import { RxJSOperatorUsageConfiguration } from '../../../src/utils/angular/rxjs-operator-usage';
import { DirectoryScanner } from '../../../src/utils/directory-scanner';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/rxjs-file-discovery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('RxJSFileDiscovery', () => {
    const mockConfig = {
      projectRoot: '/test/project',
      laws: {},
    } as unknown as RuleOfCodeConfig;

    describe('findNgRxFiles', () => {
      it('should return empty array when no TypeScript files found', () => {
        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue([]);

        const result = RxJSFileDiscovery.findNgRxFiles(
          '/test/project',
          mockConfig
        );

        expect(result).toEqual([]);
        expect(scanSpy).toHaveBeenCalledWith(
          '/test/project',
          mockConfig,
          false
        );
      });

      it('should filter to only NgRx effects files', () => {
        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue([
          '/test/project/src/app/user.effects.ts',
          '/test/project/src/app/user.service.ts',
          '/test/project/src/app/auth.effects.ts',
          '/test/project/src/app/app.component.ts',
        ]);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockImplementation(
          (path: string) => path.split('/').pop() || ''
        );

        const isNgRxSpy = jest.spyOn(
          RxJSOperatorUsageConfiguration,
          'isNgRxEffectsFile'
        );
        isNgRxSpy.mockImplementation(
          (fileName: string) =>
            fileName.includes('.effects.') || fileName.includes('.effect.')
        );

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(
          '@Injectable() export class Effects { constructor(private actions$: Actions) {} createEffect() {} }'
        );

        const result = RxJSFileDiscovery.findNgRxFiles(
          '/test/project',
          mockConfig
        );

        expect(result).toContain('/test/project/src/app/user.effects.ts');
        expect(result).toContain('/test/project/src/app/auth.effects.ts');
        expect(result).not.toContain('/test/project/src/app/user.service.ts');
        expect(result).not.toContain('/test/project/src/app/app.component.ts');
      });

      it('should validate file content for NgRx patterns', () => {
        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue([
          '/test/project/src/app/user.effects.ts',
          '/test/project/src/app/fake.effects.ts',
        ]);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockImplementation(
          (path: string) => path.split('/').pop() || ''
        );

        const isNgRxSpy = jest.spyOn(
          RxJSOperatorUsageConfiguration,
          'isNgRxEffectsFile'
        );
        isNgRxSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockImplementation((path: string) => {
          if (path.includes('user.effects.ts')) {
            return '@Injectable() export class UserEffects { constructor(private actions$: Actions) {} effect = createEffect(() => this.actions$.pipe());';
          }
          return 'export class FakeEffects {}'; // No NgRx patterns
        });

        const result = RxJSFileDiscovery.findNgRxFiles(
          '/test/project',
          mockConfig
        );

        expect(result).toContain('/test/project/src/app/user.effects.ts');
        expect(result).not.toContain('/test/project/src/app/fake.effects.ts');
      });

      it('should exclude files without required content', () => {
        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue(['/test/project/src/app/empty.effects.ts']);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('empty.effects.ts');

        const isNgRxSpy = jest.spyOn(
          RxJSOperatorUsageConfiguration,
          'isNgRxEffectsFile'
        );
        isNgRxSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result = RxJSFileDiscovery.findNgRxFiles(
          '/test/project',
          mockConfig
        );

        expect(result).toHaveLength(0);
      });

      it('should handle files that cannot be read', () => {
        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue(['/test/project/src/app/broken.effects.ts']);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('broken.effects.ts');

        const isNgRxSpy = jest.spyOn(
          RxJSOperatorUsageConfiguration,
          'isNgRxEffectsFile'
        );
        isNgRxSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result = RxJSFileDiscovery.findNgRxFiles(
          '/test/project',
          mockConfig
        );

        expect(result).toHaveLength(0);
      });

      it('should check for required NgRx content patterns', () => {
        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue(['/test/project/src/app/app.effects.ts']);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('app.effects.ts');

        const isNgRxSpy = jest.spyOn(
          RxJSOperatorUsageConfiguration,
          'isNgRxEffectsFile'
        );
        isNgRxSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          import { Injectable } from '@angular/core';
          import { Actions, createEffect, ofType } from '@ngrx/effects';

          @Injectable()
          export class AppEffects {
            constructor(private actions$: Actions) {}

            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType('[App] Load Data'),
                switchMap(() => this.dataService.load())
              )
            );
          }
        `);

        const result = RxJSFileDiscovery.findNgRxFiles(
          '/test/project',
          mockConfig
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toBe('/test/project/src/app/app.effects.ts');
      });

      it('should pass correct config to DirectoryScanner', () => {
        const customConfig = {
          projectRoot: '/custom/project',
          laws: {
            enabled: { 'custom-law': true },
          },
        } as unknown as RuleOfCodeConfig;

        const scanSpy = jest.spyOn(DirectoryScanner, 'scanForTypeScriptFiles');
        scanSpy.mockReturnValue([]);

        RxJSFileDiscovery.findNgRxFiles('/custom/project', customConfig);

        expect(scanSpy).toHaveBeenCalledWith(
          '/custom/project',
          customConfig,
          false
        );
      });
    });
  });
});
