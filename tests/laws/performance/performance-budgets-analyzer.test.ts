/**
 * Tests for PerformanceBudgetsAnalyzerService
 *
 * Tests performance budgets detection in angular.json and webpack.config.js.
 */
import { PerformanceBudgetsAnalyzerService } from '../../../src/laws/performance/core-web-vitals-compliance/services/performance-budgets.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PerformanceBudgetsAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'performance-budgets-analyzer-test-'
    );
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return hasBudgets false when no budget configuration is found', () => {
      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(false);
      expect(result.budgetFiles).toHaveLength(0);
    });

    it('should detect budgets in angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    budgets: [
                      {
                        type: 'initial',
                        maximumWarning: '2mb',
                        maximumError: '5mb',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(true);
      expect(result.budgetFiles).toContain('angular.json');
    });

    it('should detect budgets in multiple projects within angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'app-one': {
            architect: {
              build: {
                configurations: {
                  production: {},
                },
              },
            },
          },
          'app-two': {
            architect: {
              build: {
                configurations: {
                  production: {
                    budgets: [{ type: 'initial', maximumWarning: '1mb' }],
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(true);
      expect(result.budgetFiles).toContain('angular.json');
    });

    it('should detect budgets in webpack.config.js with performance and maxAssetSize', () => {
      const webpackPath = PathOperations.join(tempDir, 'webpack.config.js');
      const webpackContent = `
module.exports = {
  performance: {
    maxAssetSize: 250000,
    maxEntrypointSize: 250000,
    hints: 'warning'
  }
};
`;
      FileUtils.writeFile(webpackPath, webpackContent);

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(true);
      expect(result.budgetFiles).toContain('webpack.config.js');
    });

    it('should detect budgets in both angular.json and webpack.config.js', () => {
      // Create angular.json with budgets
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          app: {
            architect: {
              build: {
                configurations: {
                  production: {
                    budgets: [{ type: 'initial' }],
                  },
                },
              },
            },
          },
        },
      });

      // Create webpack.config.js with performance budgets
      const webpackPath = PathOperations.join(tempDir, 'webpack.config.js');
      FileUtils.writeFile(
        webpackPath,
        'performance: { maxAssetSize: 100000 }'
      );

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(true);
      expect(result.budgetFiles).toHaveLength(2);
      expect(result.budgetFiles).toContain('angular.json');
      expect(result.budgetFiles).toContain('webpack.config.js');
    });

    it('should not detect budgets when angular.json has no budgets property', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
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
      });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.budgetFiles).not.toContain('angular.json');
    });

    it('should not detect budgets when angular.json has no projects', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        newProjectRoot: 'projects',
      });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(false);
      expect(result.budgetFiles).not.toContain('angular.json');
    });

    it('should not detect budgets when webpack.config.js has performance but no maxAssetSize', () => {
      const webpackPath = PathOperations.join(tempDir, 'webpack.config.js');
      const webpackContent = `
module.exports = {
  performance: {
    hints: 'warning'
  }
};
`;
      FileUtils.writeFile(webpackPath, webpackContent);

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.budgetFiles).not.toContain('webpack.config.js');
    });

    it('should not detect budgets when webpack.config.js has maxAssetSize but no performance', () => {
      const webpackPath = PathOperations.join(tempDir, 'webpack.config.js');
      const webpackContent = `
// maxAssetSize comment
module.exports = {
  output: {
    filename: 'bundle.js'
  }
};
`;
      FileUtils.writeFile(webpackPath, webpackContent);

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.budgetFiles).not.toContain('webpack.config.js');
    });

    it('should handle angular.json parse errors gracefully', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, 'not valid json');

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.budgetFiles).not.toContain('angular.json');
    });

    it('should handle webpack.config.js read errors gracefully', () => {
      const webpackPath = PathOperations.join(tempDir, 'webpack.config.js');
      FileUtils.writeFile(webpackPath, 'performance maxAssetSize');

      const readFileSpy = jest
        .spyOn(FileUtils, 'readFile')
        .mockImplementation(path => {
          if (path.includes('webpack.config.js')) {
            throw new Error('Permission denied');
          }
          return '';
        });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.budgetFiles).not.toContain('webpack.config.js');

      readFileSpy.mockRestore();
    });

    it('should handle missing architect in angular.json project', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          'my-app': {
            root: 'src',
          },
        },
      });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(false);
      expect(result.budgetFiles).not.toContain('angular.json');
    });

    it('should handle missing build in angular.json architect', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              serve: {},
            },
          },
        },
      });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(false);
      expect(result.budgetFiles).not.toContain('angular.json');
    });

    it('should handle missing configurations in angular.json build', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
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
      });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(false);
      expect(result.budgetFiles).not.toContain('angular.json');
    });

    it('should handle missing production in angular.json configurations', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  development: {},
                },
              },
            },
          },
        },
      });

      const result = PerformanceBudgetsAnalyzerService.analyze(tempDir);

      expect(result.hasBudgets).toBe(false);
      expect(result.budgetFiles).not.toContain('angular.json');
    });
  });
});
