/**
 * Tests for CachingHeadersAnalyzerService
 *
 * Tests for browser caching headers configuration detection.
 */
import { CachingHeadersAnalyzerService } from '../../../src/laws/performance/cdn-caching-strategy/services/caching-headers.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CachingHeadersAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('caching-headers-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return configured: false when no config files exist', () => {
      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when firebase.json has Cache-Control header', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*.@(js|css)',
              headers: {
                'Cache-Control': 'max-age=31536000',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when firebase.json has ETag header', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*',
              headers: {
                ETag: 'W/"abc123"',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when firebase.json has Expires header', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*',
              headers: {
                Expires: 'Thu, 01 Jan 2030 00:00:00 GMT',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: false when firebase.json has no caching headers', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*',
              headers: {
                'X-Custom-Header': 'value',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: false when firebase.json has empty headers array', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: false when firebase.json has no headers property', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when nginx.conf has Cache-Control', () => {
      const nginxConfPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
        server {
          listen 80;
          location / {
            add_header Cache-Control "public, max-age=31536000";
          }
        }
      `;
      FileSystemOperations.writeFile(nginxConfPath, nginxContent);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when .htaccess has Expires', () => {
      const htaccessPath = PathOperations.join(tempDir, '.htaccess');
      const htaccessContent = `
        <IfModule mod_expires.c>
          ExpiresActive On
          ExpiresByType image/jpg "access plus 1 year"
          Expires "access plus 1 year"
        </IfModule>
      `;
      FileSystemOperations.writeFile(htaccessPath, htaccessContent);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when .htaccess has ETag', () => {
      const htaccessPath = PathOperations.join(tempDir, '.htaccess');
      const htaccessContent = `
        FileETag MTime Size
        ETag on
      `;
      FileSystemOperations.writeFile(htaccessPath, htaccessContent);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when server.js has Cache-Control', () => {
      const serverJsPath = PathOperations.join(tempDir, 'server.js');
      const serverContent = `
        const express = require('express');
        const app = express();

        app.use(express.static('public', {
          setHeaders: (res) => {
            res.setHeader('Cache-Control', 'max-age=31536000');
          }
        }));
      `;
      FileSystemOperations.writeFile(serverJsPath, serverContent);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: false when server config has no caching keywords', () => {
      const serverJsPath = PathOperations.join(tempDir, 'server.js');
      const serverContent = `
        const express = require('express');
        const app = express();
        app.listen(3000);
      `;
      FileSystemOperations.writeFile(serverJsPath, serverContent);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should return configured: true when apache.conf has Cache-Control', () => {
      const apacheConfPath = PathOperations.join(tempDir, 'apache.conf');
      const apacheContent = `
        <Directory /var/www/html>
          Header set Cache-Control "max-age=2592000, public"
        </Directory>
      `;
      FileSystemOperations.writeFile(apacheConfPath, apacheContent);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true when either Firebase or server config has caching', () => {
      // Only nginx config exists with caching
      const nginxConfPath = PathOperations.join(tempDir, 'nginx.conf');
      FileSystemOperations.writeFile(
        nginxConfPath,
        'Cache-Control: max-age=3600'
      );

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should handle firebase.json with headers as non-array', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: 'invalid',
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should handle firebase.json with malformed header config', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            { source: '**/*' }, // Missing headers property
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: false });
    });

    it('should check all server config paths', () => {
      // Only apache.conf has caching
      const apacheConfPath = PathOperations.join(tempDir, 'apache.conf');
      FileSystemOperations.writeFile(
        apacheConfPath,
        'Expires "access plus 1 year"'
      );

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });

    it('should return configured: true with multiple caching headers', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*.@(js|css)',
              headers: {
                'Cache-Control': 'max-age=31536000',
                ETag: 'W/"abc"',
                Expires: 'Thu, 01 Jan 2030 00:00:00 GMT',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = CachingHeadersAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ configured: true });
    });
  });
});
