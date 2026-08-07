/**
 * @fileoverview Tests for NgRxDevToolsIntegrationMandateLaw
 * @description Comprehensive tests for the main NgRx DevTools Integration Mandate Law
 */
import { NgRxDevToolsIntegrationMandateLaw } from '../../../src/laws/angular/ngrx-devtools-integration-mandate';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxDevToolsIntegrationMandateLaw', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-devtools-law-test-');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const createContext = (projectRoot: string): LawCheckContext => ({
    projectRoot,
    config: FileUtils.getMinimalDefaultConfig(),
  });

  describe('check()', () => {
    describe('dependency check', () => {
      it('should fail when @ngrx/store-devtools is not installed', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@angular/core': '^17.0.0',
            '@ngrx/store': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.passed).toBe(false);
        expect(result.violations).toContain(
          '@ngrx/store-devtools package not installed'
        );
        expect(result.suggestions).toContain(
          'Install @ngrx/store-devtools: npm install --save-dev @ngrx/store-devtools'
        );
      });

      it('should detect @ngrx/store-devtools in dependencies', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            '@ngrx/store-devtools package not installed'
          )
        ).toBe(false);
      });

      it('should detect @ngrx/store-devtools in devDependencies', async () => {
        const packageJson = {
          name: 'test-project',
          devDependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            '@ngrx/store-devtools package not installed'
          )
        ).toBe(false);
      });

      it('should return early with failure when not installed', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.passed).toBe(false);
        expect(result.message).toContain('DevTools integration issues found');
      });
    });

    describe('configuration check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should fail when DevTools not configured', async () => {
        const appConfig = `
import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: []
};
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.violations).toContain(
          'StoreDevtools not configured in application'
        );
        expect(result.suggestions).toContain(
          'Add StoreDevtoolsModule.instrument() or provideStoreDevtools() to your app configuration'
        );
      });

      it('should pass when StoreDevtoolsModule is configured', async () => {
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

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'StoreDevtools not configured in application'
          )
        ).toBe(false);
      });

      it('should pass when provideStoreDevtools is configured', async () => {
        const appConfig = `
import { ApplicationConfig } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { isDevMode } from '@angular/core';

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

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'StoreDevtools not configured in application'
          )
        ).toBe(false);
      });
    });

    describe('environment check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should warn when no environment check is present', async () => {
        const appConfig = `
import { ApplicationConfig } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStoreDevtools({
      maxAge: 25
    })
  ]
};
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.violations).toContain(
          'DevTools not configured with environment-specific settings'
        );
        expect(result.suggestions).toContain(
          'Configure DevTools to only enable in development environment'
        );
      });

      it('should pass when environment.production is checked', async () => {
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

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'DevTools not configured with environment-specific settings'
          )
        ).toBe(false);
      });

      it('should pass when isDevMode is used', async () => {
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

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'DevTools not configured with environment-specific settings'
          )
        ).toBe(false);
      });
    });

    describe('config options check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);
      });

      it('should warn when config options are missing', async () => {
        const appConfig = `
import { ApplicationConfig, isDevMode } from '@angular/core';
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

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.violations).toContain(
          'DevTools configuration lacks proper options'
        );
        expect(result.suggestions).toContain(
          'Configure DevTools with maxAge, logOnly, name, and trace options'
        );
      });

      it('should pass when maxAge is configured', async () => {
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

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'DevTools configuration lacks proper options'
          )
        ).toBe(false);
      });

      it('should pass when logOnly is configured', async () => {
        const appConfig = `
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStoreDevtools({
      logOnly: !isDevMode()
    })
  ]
};
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'app.config.ts'),
          appConfig
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'DevTools configuration lacks proper options'
          )
        ).toBe(false);
      });
    });

    describe('score calculation', () => {
      it('should deduct 40 points when not installed', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.score).toBe(60);
      });

      it('should return 100 when fully configured', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);

        const appConfig = `
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      name: 'App DevTools',
      trace: true
    })
  ]
};
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, 'app.config.ts'),
          appConfig
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.score).toBe(100);
        expect(result.passed).toBe(true);
      });

      it('should never return negative score', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('result structure', () => {
      it('should return complete LawResult structure', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('fixable');
        expect(result).toHaveProperty('config');
      });

      it('should always be fixable', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.fixable).toBe(true);
      });

      it('should include violations and suggestions in details', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.details).toEqual(
          expect.arrayContaining([
            ...(result.violations ?? []),
            ...(result.suggestions ?? []),
          ])
        );
      });
    });

    describe('message generation', () => {
      it('should generate success message when fully configured', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const appDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(appDir);

        const appConfig = `
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { isDevMode } from '@angular/core';

export const appConfig = {
  providers: [
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
};
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, 'app.config.ts'),
          appConfig
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.message).toBe(
          'NgRx DevTools integration properly implemented'
        );
      });

      it('should list issues when violations exist', async () => {
        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result.message).toContain('DevTools integration issues found');
      });
    });

    describe('projectRoot handling', () => {
      it('should use context.projectRoot when provided', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            '@ngrx/store-devtools package not installed'
          )
        ).toBe(false);
      });

      it('should handle missing projectRoot gracefully', async () => {
        const context: LawCheckContext = {
          projectRoot: '',
          config: FileUtils.getMinimalDefaultConfig(),
        };

        const result = await NgRxDevToolsIntegrationMandateLaw.check(context);

        expect(result).toBeDefined();
        expect(result.passed).toBe(false);
      });
    });
  });
});
