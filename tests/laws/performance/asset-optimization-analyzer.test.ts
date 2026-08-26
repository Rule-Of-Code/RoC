/**
 * Tests for AssetOptimizationAnalyzerService
 *
 * Tests for static asset optimization detection across Angular and Webpack configs.
 */
import { AssetOptimizationAnalyzerService } from '../../../src/laws/performance/cdn-caching-strategy/services/asset-optimization.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('AssetOptimizationAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'asset-optimization-analyzer-test-'
    );
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return optimized: false when no config files exist', () => {
      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when Angular production config has optimization and outputHashing', () => {
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
                    outputHashing: 'all',
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    /**
     * `outputHashing` alone is enough, and that is a deliberate change.
     *
     * This asserted `optimized: false` for a config declaring `outputHashing`
     * without `optimization`. The esbuild builder optimises production by
     * default, so correct modern projects do not write the second key — and
     * requiring both made a workspace that content-hashes every asset it ships
     * answer false on a key it never needed.
     */
    it('should return optimized: true when Angular declares outputHashing alone', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    outputHashing: 'all',
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    /** The red control: no hashing declared anywhere is still reported. */
    it('should return optimized: false when no hashing is declared', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          'my-app': {
            architect: { build: { configurations: { production: {} } } },
          },
        },
      });

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: false when Angular production config lacks outputHashing', () => {
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

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when Angular config has optimization as object', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    optimization: { scripts: true, styles: true },
                    outputHashing: 'bundles',
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when webpack config has contenthash keyword', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          output: {
            filename: '[name].[contenthash].js',
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when webpack config has chunkhash keyword', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          output: {
            filename: '[name].[chunkhash].js',
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when webpack config has splitChunks keyword', () => {
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

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: false when webpack config has no optimization keywords', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const webpackContent = `
        module.exports = {
          entry: './src/index.js',
          output: {
            filename: 'bundle.js',
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should check webpack.prod.js if webpack.config.js not found', () => {
      const webpackProdPath = PathOperations.join(tempDir, 'webpack.prod.js');
      const webpackContent = `
        module.exports = {
          output: {
            filename: '[name].[contenthash].js',
          },
        };
      `;
      FileSystemOperations.writeFile(webpackProdPath, webpackContent);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

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
            splitChunks: { chunks: 'all' },
          },
        };
      `;
      FileSystemOperations.writeFile(webpackConfigPath, webpackContent);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: true when any project in angular.json has valid config', () => {
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
                    outputHashing: 'all',
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });

    it('should return optimized: false when angular.json has no build architect', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-lib': {
            architect: {
              test: {
                builder: '@angular-devkit/build-angular:karma',
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should handle angular.json with empty projects object', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {},
      });

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: false });
    });

    it('should return optimized: true when either Angular or Webpack has optimization', () => {
      // No Angular config but valid Webpack config
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      FileSystemOperations.writeFile(webpackConfigPath, 'splitChunks: {}');

      const result = AssetOptimizationAnalyzerService.analyze(tempDir);

      expect(result).toEqual({ optimized: true });
    });
  });
});
