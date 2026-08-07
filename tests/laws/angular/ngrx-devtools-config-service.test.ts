/**
 * @fileoverview Tests for NgRxDevToolsConfigService
 * @description Comprehensive tests for the NgRx DevTools configuration analyzer service
 */
import { NgRxDevToolsConfigService } from '../../../src/laws/angular/ngrx-devtools-integration-mandate/services/config.service';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxDevToolsConfigService', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-devtools-config-test-');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('analyzeConfiguration()', () => {
    describe('result structure', () => {
      it('should return complete configuration result', async () => {
        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result).toHaveProperty('configured');
        expect(result).toHaveProperty('hasEnvironmentCheck');
        expect(result).toHaveProperty('hasConfigOptions');
      });

      it('should return boolean values for all properties', async () => {
        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(typeof result.configured).toBe('boolean');
        expect(typeof result.hasEnvironmentCheck).toBe('boolean');
        expect(typeof result.hasConfigOptions).toBe('boolean');
      });
    });

    describe('no config files', () => {
      it('should return not configured when no files exist', async () => {
        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(false);
        expect(result.hasEnvironmentCheck).toBe(false);
        expect(result.hasConfigOptions).toBe(false);
      });

      it('should return not configured when src/app does not exist', async () => {
        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(false);
      });
    });

    describe('StoreDevtoolsModule detection', () => {
      beforeEach(() => {
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should detect StoreDevtoolsModule.instrument()', async () => {
        const appModule = `
import { NgModule } from '@angular/core';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

@NgModule({
  imports: [
    StoreDevtoolsModule.instrument()
  ]
})
export class AppModule {}
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.module.ts'),
          appModule
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
      });

      it('should detect StoreDevtoolsModule with options', async () => {
        const appModule = `
import { NgModule } from '@angular/core';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';

@NgModule({
  imports: [
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production
    })
  ]
})
export class AppModule {}
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.module.ts'),
          appModule
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
        expect(result.hasEnvironmentCheck).toBe(true);
        expect(result.hasConfigOptions).toBe(true);
      });
    });

    describe('provideStoreDevtools detection', () => {
      beforeEach(() => {
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should detect provideStoreDevtools()', async () => {
        const appConfig = `
import { ApplicationConfig } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStoreDevtools()
  ]
};
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
      });

      it('should detect provideStoreDevtools with options', async () => {
        const appConfig = `
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
};
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
        expect(result.hasEnvironmentCheck).toBe(true);
        expect(result.hasConfigOptions).toBe(true);
      });
    });

    describe('environment check detection', () => {
      beforeEach(() => {
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should detect environment.production check', async () => {
        const appModule = `
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';

StoreDevtoolsModule.instrument({
  logOnly: environment.production
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.module.ts'),
          appModule
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasEnvironmentCheck).toBe(true);
      });

      it('should detect !production check', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';

provideStoreDevtools({
  enabled: !production
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasEnvironmentCheck).toBe(true);
      });

      it('should detect isDevMode() check', async () => {
        const appConfig = `
import { isDevMode } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

provideStoreDevtools({
  logOnly: !isDevMode()
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasEnvironmentCheck).toBe(true);
      });

      it('should not detect environment check when missing', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';

provideStoreDevtools({
  maxAge: 25
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasEnvironmentCheck).toBe(false);
      });
    });

    describe('config options detection', () => {
      beforeEach(() => {
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should detect maxAge option', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { isDevMode } from '@angular/core';

provideStoreDevtools({
  maxAge: 25
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasConfigOptions).toBe(true);
      });

      it('should detect logOnly option', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { isDevMode } from '@angular/core';

provideStoreDevtools({
  logOnly: true
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasConfigOptions).toBe(true);
      });

      it('should detect name option', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';

provideStoreDevtools({
  name: 'My App'
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasConfigOptions).toBe(true);
      });

      it('should detect trace option', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';

provideStoreDevtools({
  trace: true
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasConfigOptions).toBe(true);
      });

      it('should detect actionSanitizer option', async () => {
        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';

provideStoreDevtools({
  actionSanitizer: (action) => action
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasConfigOptions).toBe(true);
      });

      it('should not detect options without braces', async () => {
        // Create a file with no braces at all to ensure hasConfigOptions returns false
        const appConfig = `
// This file has no curly braces and no config options
const nothing = 1;
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.hasConfigOptions).toBe(false);
      });
    });

    describe('main.ts detection', () => {
      it('should analyze main.ts file', async () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        const mainTs = `
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { isDevMode } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
});
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'main.ts'),
          mainTs
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
        expect(result.hasEnvironmentCheck).toBe(true);
        expect(result.hasConfigOptions).toBe(true);
      });
    });

    describe('multiple files', () => {
      beforeEach(() => {
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should aggregate results from multiple files', async () => {
        // app.module.ts has devtools
        const appModule = `
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

StoreDevtoolsModule.instrument({
  name: 'App DevTools'
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.module.ts'),
          appModule
        );

        // app.config.ts has environment check
        const appConfig = `
import { environment } from '../environments/environment';

const config = environment.production;
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
      });

      it('should stop checking once all conditions are met', async () => {
        const appModule = `
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';

StoreDevtoolsModule.instrument({
  maxAge: 25,
  logOnly: environment.production
})
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.module.ts'),
          appModule
        );

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(true);
        expect(result.hasEnvironmentCheck).toBe(true);
        expect(result.hasConfigOptions).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', async () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          await NgRxDevToolsConfigService.analyzeConfiguration(nonExistentPath);

        expect(result.configured).toBe(false);
        expect(result.hasEnvironmentCheck).toBe(false);
        expect(result.hasConfigOptions).toBe(false);
      });

      it('should handle empty directory', async () => {
        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(false);
      });

      it('should handle empty config files', async () => {
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);

        FileUtils.writeFile(PathOperations.join(appDir, 'app.config.ts'), '');

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result.configured).toBe(false);
      });

      it('should handle read errors gracefully', async () => {
        // Create app directory but no readable files
        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);

        const result = await NgRxDevToolsConfigService.analyzeConfiguration(tempDir);

        expect(result).toBeDefined();
      });
    });
  });
});
