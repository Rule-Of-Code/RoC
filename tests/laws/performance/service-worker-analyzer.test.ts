/**
 * Tests for ServiceWorkerAnalyzerService
 *
 * Tests for service worker caching implementation detection.
 */
import { ServiceWorkerAnalyzerService } from '../../../src/laws/performance/cdn-caching-strategy/services/service-worker.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ServiceWorkerAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('service-worker-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return implemented: false when no config files exist', async () => {
      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: false });
    });

    it('should return implemented: true when angular.json has serviceWorker keyword', async () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    serviceWorker: true,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when angular.json has @angular/service-worker', async () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const content = `{
        "version": 1,
        "projects": {
          "my-app": {
            "architect": {
              "build": {
                "builder": "@angular-devkit/build-angular:browser"
              }
            }
          }
        },
        "cli": {
          "schematicCollections": ["@angular/service-worker"]
        }
      }`;
      FileSystemOperations.writeFile(angularJsonPath, content);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when angular.json has SwUpdate reference', async () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const content = `{
        "version": 1,
        "cli": {
          "schematics": {
            "SwUpdate": {}
          }
        }
      }`;
      FileSystemOperations.writeFile(angularJsonPath, content);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when angular.json has registerSW', async () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const content = `{
        "version": 1,
        "notes": "Uses registerSW from vite-plugin-pwa"
      }`;
      FileSystemOperations.writeFile(angularJsonPath, content);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: false when angular.json has no service worker keywords', async () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                builder: '@angular-devkit/build-angular:browser',
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: false });
    });

    it('should return implemented: true when src/sw.js exists', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const swPath = PathOperations.join(srcDir, 'sw.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("install", () => {});'
      );

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when src/service-worker.js exists', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const swPath = PathOperations.join(srcDir, 'service-worker.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("fetch", () => {});'
      );

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when public/sw.js exists', async () => {
      const publicDir = PathOperations.join(tempDir, 'public');
      FileSystemOperations.createDirectory(publicDir);
      const swPath = PathOperations.join(publicDir, 'sw.js');
      FileSystemOperations.writeFile(swPath, 'self.skipWaiting();');

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when public/service-worker.js exists', async () => {
      const publicDir = PathOperations.join(tempDir, 'public');
      FileSystemOperations.createDirectory(publicDir);
      const swPath = PathOperations.join(publicDir, 'service-worker.js');
      FileSystemOperations.writeFile(swPath, 'self.clients.claim();');

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when ngsw-config.json exists in root', async () => {
      const ngswConfigPath = PathOperations.join(tempDir, 'ngsw-config.json');
      const ngswConfig = {
        index: '/index.html',
        assetGroups: [],
      };
      FileSystemOperations.writeJsonFile(ngswConfigPath, ngswConfig);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when ngsw-config.json exists in src', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const ngswConfigPath = PathOperations.join(srcDir, 'ngsw-config.json');
      const ngswConfig = {
        index: '/index.html',
        assetGroups: [],
      };
      FileSystemOperations.writeJsonFile(ngswConfigPath, ngswConfig);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when main.ts has serviceWorker keyword', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const mainTsPath = PathOperations.join(srcDir, 'main.ts');
      const mainContent = `
        import { enableProdMode } from '@angular/core';

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js');
        }
      `;
      FileSystemOperations.writeFile(mainTsPath, mainContent);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when main.ts has @angular/service-worker import', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const mainTsPath = PathOperations.join(srcDir, 'main.ts');
      const mainContent = `
        import { ServiceWorkerModule } from '@angular/service-worker';

        bootstrapApplication(AppComponent);
      `;
      FileSystemOperations.writeFile(mainTsPath, mainContent);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when main.ts has SwUpdate import', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const mainTsPath = PathOperations.join(srcDir, 'main.ts');
      const mainContent = `
        import { SwUpdate } from '@angular/service-worker';

        export class AppComponent {
          constructor(private swUpdate: SwUpdate) {}
        }
      `;
      FileSystemOperations.writeFile(mainTsPath, mainContent);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when app.component.ts has service worker registration', async () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileSystemOperations.createDirectory(appDir);
      const appComponentPath = PathOperations.join(appDir, 'app.component.ts');
      const appContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          template: '<router-outlet></router-outlet>'
        })
        export class AppComponent {
          ngOnInit() {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js');
            }
          }
        }
      `;
      FileSystemOperations.writeFile(appComponentPath, appContent);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true when app.config.ts has registerSW', async () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileSystemOperations.createDirectory(appDir);
      const appConfigPath = PathOperations.join(appDir, 'app.config.ts');
      const appConfigContent = `
        import { ApplicationConfig } from '@angular/core';
        import { registerSW } from 'virtual:pwa-register';

        const updateSW = registerSW({
          onNeedRefresh() {},
          onOfflineReady() {},
        });

        export const appConfig: ApplicationConfig = {
          providers: [],
        };
      `;
      FileSystemOperations.writeFile(appConfigPath, appConfigContent);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: false when main.ts has no service worker keywords', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const mainTsPath = PathOperations.join(srcDir, 'main.ts');
      const mainContent = `
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;
      FileSystemOperations.writeFile(mainTsPath, mainContent);

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: false });
    });

    it('should return implemented: true if any check passes (angular config)', async () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeFile(
        angularJsonPath,
        '{"serviceWorker": true}'
      );

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true if any check passes (service worker file)', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const swPath = PathOperations.join(srcDir, 'sw.js');
      FileSystemOperations.writeFile(swPath, '// Service worker');

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should return implemented: true if any check passes (ngsw config)', async () => {
      const ngswConfigPath = PathOperations.join(tempDir, 'ngsw-config.json');
      FileSystemOperations.writeFile(ngswConfigPath, '{}');

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should handle file read errors gracefully', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileSystemOperations.createDirectory(srcDir);
      const mainTsPath = PathOperations.join(srcDir, 'main.ts');
      FileSystemOperations.writeFile(mainTsPath, 'normal content');

      jest.spyOn(FileUtils, 'readFile').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      // Should still check other methods
      expect(result).toEqual({ implemented: false });
    });

    it('should check all service worker file paths', async () => {
      // Only public/service-worker.js exists
      const publicDir = PathOperations.join(tempDir, 'public');
      FileSystemOperations.createDirectory(publicDir);
      const swPath = PathOperations.join(publicDir, 'service-worker.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("install", () => {});'
      );

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });

    it('should check all app file paths', async () => {
      // Only app.config.ts has service worker registration
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileSystemOperations.createDirectory(appDir);
      const appConfigPath = PathOperations.join(appDir, 'app.config.ts');
      FileSystemOperations.writeFile(
        appConfigPath,
        "import { SwUpdate } from '@angular/service-worker';"
      );

      const result = await ServiceWorkerAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ implemented: true });
    });
  });
});
