/**
 * Tests for BrowserCachingAnalyzerService
 *
 * Tests browser caching strategy detection including service workers, PWA manifests,
 * and HTTP caching headers.
 */
import { BrowserCachingAnalyzerService } from '../../../src/laws/performance/core-web-vitals-compliance/services/browser-caching.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('BrowserCachingAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('browser-caching-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return hasStrategy false when no caching strategies are found', () => {
      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(false);
      expect(result.strategies).toHaveLength(0);
    });

    it('should detect service worker at src/sw.js', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const swPath = PathOperations.join(srcDir, 'sw.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("install", () => {});'
      );

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('Service Worker detected');
    });

    it('should detect service worker at src/service-worker.js', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const swPath = PathOperations.join(srcDir, 'service-worker.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("fetch", () => {});'
      );

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('Service Worker detected');
    });

    it('should detect service worker at public/sw.js', () => {
      const publicDir = PathOperations.join(tempDir, 'public');
      FileUtils.createDirectory(publicDir);
      const swPath = PathOperations.join(publicDir, 'sw.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("activate", () => {});'
      );

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('Service Worker detected');
    });

    it('should detect service worker at public/service-worker.js', () => {
      const publicDir = PathOperations.join(tempDir, 'public');
      FileUtils.createDirectory(publicDir);
      const swPath = PathOperations.join(publicDir, 'service-worker.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("install", () => {});'
      );

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('Service Worker detected');
    });

    it('should detect Angular service worker config (ngsw-config.json)', () => {
      const ngswPath = PathOperations.join(tempDir, 'ngsw-config.json');
      FileSystemOperations.writeJsonFile(ngswPath, {
        index: '/index.html',
        assetGroups: [],
      });

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('Service Worker detected');
    });

    it('should detect PWA manifest at src/manifest.json', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const manifestPath = PathOperations.join(srcDir, 'manifest.json');
      FileSystemOperations.writeJsonFile(manifestPath, {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
      });

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('PWA manifest found');
    });

    it('should detect HTTP caching headers with Cache-Control in nginx.conf', () => {
      const nginxPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
server {
  location ~* \\.(js|css|png|jpg)$ {
    add_header Cache-Control "public, max-age=31536000";
  }
}
`;
      FileSystemOperations.writeFile(nginxPath, nginxContent);

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('HTTP caching headers configured');
    });

    it('should detect HTTP caching headers with expires in nginx.conf', () => {
      const nginxPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
server {
  location ~* \\.(js|css|png|jpg)$ {
    expires 1y;
  }
}
`;
      FileSystemOperations.writeFile(nginxPath, nginxContent);

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toContain('HTTP caching headers configured');
    });

    it('should not detect caching headers when nginx.conf has no caching directives', () => {
      const nginxPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
server {
  location / {
    root /var/www/html;
  }
}
`;
      FileSystemOperations.writeFile(nginxPath, nginxContent);

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.strategies).not.toContain(
        'HTTP caching headers configured'
      );
    });

    it('should detect multiple caching strategies', () => {
      // Create service worker
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const swPath = PathOperations.join(srcDir, 'sw.js');
      FileSystemOperations.writeFile(
        swPath,
        'self.addEventListener("install", () => {});'
      );

      // Create manifest
      const manifestPath = PathOperations.join(srcDir, 'manifest.json');
      FileSystemOperations.writeJsonFile(manifestPath, { name: 'Test App' });

      // Create nginx config
      const nginxPath = PathOperations.join(tempDir, 'nginx.conf');
      FileSystemOperations.writeFile(
        nginxPath,
        'add_header Cache-Control "max-age=3600";'
      );

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.hasStrategy).toBe(true);
      expect(result.strategies).toHaveLength(3);
      expect(result.strategies).toContain('Service Worker detected');
      expect(result.strategies).toContain('PWA manifest found');
      expect(result.strategies).toContain('HTTP caching headers configured');
    });

    it('should handle file read errors gracefully for nginx.conf', () => {
      const nginxPath = PathOperations.join(tempDir, 'nginx.conf');
      FileSystemOperations.writeFile(nginxPath, 'some content');

      const readFileSpy = jest
        .spyOn(FileUtils, 'readFile')
        .mockImplementation(path => {
          if (path.includes('nginx.conf')) {
            throw new Error('Permission denied');
          }
          return '';
        });

      const result = BrowserCachingAnalyzerService.analyze(tempDir);

      expect(result.strategies).not.toContain(
        'HTTP caching headers configured'
      );

      readFileSpy.mockRestore();
    });
  });
});
