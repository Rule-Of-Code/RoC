/**
 * Tests for Http2OptimizationAnalyzerService
 *
 * Tests for HTTP/2 optimization detection in Firebase, server configs, and bundle configs.
 */
import { Http2OptimizationAnalyzerService } from '../../../src/laws/performance/cdn-caching-strategy/services/http2-optimization.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('Http2OptimizationAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'http2-optimization-analyzer-test-'
    );
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return optimized: false when no config files exist', () => {
      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when firebase.json has Link header (HTTP/2 push)', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '/index.html',
              headers: {
                Link: '</main.js>; rel=preload; as=script',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: false when firebase.json has headers but no Link', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*',
              headers: {
                'Cache-Control': 'max-age=3600',
              },
            },
          ],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: false when firebase.json has empty headers array', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: false when firebase.json hosting has no headers property', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          // No headers property
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when nginx.conf has http2 keyword', () => {
      const nginxConfPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
        server {
          listen 443 ssl http2;
          server_name example.com;
        }
      `;
      FileSystemOperations.writeFile(nginxConfPath, nginxContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when nginx.conf has HTTP/2 keyword', () => {
      const nginxConfPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
        # Enable HTTP/2 for better performance
        server {
          listen 443 ssl;
        }
      `;
      FileSystemOperations.writeFile(nginxConfPath, nginxContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when server.js has push keyword', () => {
      const serverJsPath = PathOperations.join(tempDir, 'server.js');
      const serverContent = `
        const spdy = require('spdy');
        // Enable server push for critical resources
        stream.push('/main.css', { response: { 'content-type': 'text/css' } });
      `;
      FileSystemOperations.writeFile(serverJsPath, serverContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when server config has Link: header', () => {
      const nginxConfPath = PathOperations.join(tempDir, 'nginx.conf');
      const nginxContent = `
        server {
          location / {
            add_header Link: "</style.css>; rel=preload; as=style";
          }
        }
      `;
      FileSystemOperations.writeFile(nginxConfPath, nginxContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when angular.json has namedChunks enabled', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    namedChunks: true,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when angular.json has namedChunks undefined (defaults to true)', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    optimization: true,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: false when angular.json has namedChunks set to false', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    namedChunks: false,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when webpack config has splitChunks and maxSize', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          optimization: {
            splitChunks: {
              chunks: 'all',
              maxSize: 244000,
            },
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: false when webpack has splitChunks but no maxSize', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          optimization: {
            splitChunks: {
              chunks: 'all',
            },
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: false when webpack has maxSize but no splitChunks', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          optimization: {
            maxSize: 244000,
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should check webpack.prod.js for splitChunks config', () => {
      const webpackProdPath = PathOperations.join(tempDir, 'webpack.prod.js');
      const webpackContent = `
        module.exports = {
          optimization: {
            splitChunks: { chunks: 'all', maxSize: 200000 },
          },
        };
      `;
      FileSystemOperations.writeFile(webpackProdPath, webpackContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should check config/webpack.config.js path', () => {
      const configDir = PathOperations.join(tempDir, 'config');
      FileSystemOperations.createDirectory(configDir);
      const webpackConfigPath = PathOperations.join(
        configDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          optimization: {
            splitChunks: { chunks: 'all', maxSize: 150000 },
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true if any check passes', () => {
      // Only nginx config has HTTP/2
      const nginxConfPath = PathOperations.join(tempDir, 'nginx.conf');
      FileSystemOperations.writeFile(nginxConfPath, 'listen 443 http2;');

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
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

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should handle firebase.json with malformed header objects', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [null, { source: '**/*' }, 'invalid'],
        },
      };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, firebaseJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should check all server config paths', () => {
      // Only .htaccess has HTTP/2 config
      const htaccessPath = PathOperations.join(tempDir, '.htaccess');
      FileSystemOperations.writeFile(htaccessPath, 'Protocols h2 http/1.1');

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      // .htaccess doesn't have HTTP2_KEYWORDS, so it should be false
      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when apache.conf has http2 keyword', () => {
      const apacheConfPath = PathOperations.join(tempDir, 'apache.conf');
      const apacheContent = `
        LoadModule http2_module modules/mod_http2.so
        Protocols http2 http/1.1
      `;
      FileSystemOperations.writeFile(apacheConfPath, apacheContent);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
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
                configurations: {
                  production: {
                    optimization: true,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = Http2OptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });
  });
});
