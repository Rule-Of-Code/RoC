/**
 * Tests for CdnAnalyzerService
 *
 * Tests for CDN configuration detection across Firebase, Angular, and environment files.
 */
import { CdnAnalyzerService } from '../../../src/laws/performance/cdn-caching-strategy/services/cdn.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CdnAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('cdn-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return configured: false when no config files exist', () => {
      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when firebase.json has hosting with headers', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*',
              headers: { 'Cache-Control': 'max-age=3600' },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: false when firebase.json has hosting without headers', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: false when firebase.json has no hosting', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        functions: {
          source: 'functions',
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when angular.json has deployUrl', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                options: {
                  deployUrl: 'https://cdn.example.com/',
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when angular.json has baseHref', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                options: {
                  baseHref: 'https://cdn.example.com/app/',
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: false when angular.json has no deployUrl or baseHref', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                options: {
                  outputPath: 'dist/my-app',
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when environment.prod.ts contains cloudflare', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          cdnUrl: 'https://cdn.cloudflare.com',
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when environment.prod.ts contains cloudfront', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          assetUrl: 'https://d123.cloudfront.net',
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when environment.prod.ts contains firebase', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          projectId: 'my-firebase-project',
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when environment.prod.ts contains cdn keyword', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          cdn: {
            enabled: true,
          },
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when environment.prod.ts contains assets keyword', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          assetsUrl: 'https://example.com/assets/',
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when environment.prod.ts contains CDN (uppercase)', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          CDN_URL: 'https://example.com/',
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: false when environment.prod.ts has no CDN keywords', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileSystemOperations.createDirectory(envDir);
      const envFilePath = PathOperations.join(envDir, 'environment.prod.ts');
      const envContent = `
        export const environment = {
          production: true,
          apiUrl: 'https://api.example.com',
        };
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when .env file contains CDN keyword', () => {
      const envFilePath = PathOperations.join(tempDir, '.env');
      const envContent = `
        API_URL=https://api.example.com
        CDN_URL=https://cdn.example.com
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when .env.production contains cloudflare', () => {
      const envFilePath = PathOperations.join(tempDir, '.env.production');
      const envContent = `
        CDN_PROVIDER=cloudflare
        ASSETS_URL=https://assets.example.com
      `;
      FileSystemOperations.writeFile(envFilePath, envContent);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should handle multiple projects in angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'lib-one': {
            architect: {},
          },
          'app-main': {
            architect: {
              build: {
                options: {
                  deployUrl: 'https://cdn.example.com/',
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: false when angular.json has empty projects', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {},
      });

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true if any config source has CDN', () => {
      // Only environment file has CDN config
      const envFilePath = PathOperations.join(tempDir, '.env');
      FileSystemOperations.writeFile(envFilePath, 'CLOUDFLARE_TOKEN=abc123');

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should handle malformed firebase.json gracefully', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      FileSystemOperations.writeFile(firebaseJsonPath, 'not valid json {');

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should handle malformed angular.json gracefully', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeFile(angularJsonPath, '{ invalid json');

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should check all environment file paths', () => {
      // .env.production exists with CDN keyword
      const envFilePath = PathOperations.join(tempDir, '.env.production');
      FileSystemOperations.writeFile(
        envFilePath,
        'ASSETS_URL=https://cdn.test.com'
      );

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true for case-insensitive CDN keyword matching', () => {
      const envFilePath = PathOperations.join(tempDir, '.env');
      FileSystemOperations.writeFile(
        envFilePath,
        'CLOUDFRONT_DISTRIBUTION=E12345'
      );

      const result = CdnAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });
  });
});
