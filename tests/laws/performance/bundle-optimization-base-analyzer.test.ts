/**
 * Tests for BundleOptimizationBaseAnalyzer
 *
 * Tests for base analyzer functionality including Angular configuration analysis
 * and dependency fallback checks.
 */
import { BundleOptimizationBaseAnalyzer } from '../../../src/laws/performance/bundle-optimization-strategy/services/base.analyzer';
import { ProjectTypeDetectorValidation } from '../../../src/utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('BundleOptimizationBaseAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('base-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyzeAngularConfiguration', () => {
    it('should return empty messages when angular.json does not exist', () => {
      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/optimization/],
        'Optimization enabled'
      );

      expect(result.messages).toHaveLength(0);
    });

    it('should return success message when pattern matches in angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {
                  optimization: true,
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/optimization/],
        'Optimization enabled'
      );

      expect(result.messages).toContain('Optimization enabled');
    });

    it('should return empty messages when pattern does not match', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {},
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/nonExistentPattern/],
        'Success message'
      );

      expect(result.messages).toHaveLength(0);
    });

    it('should match string patterns in angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {
                  extractCss: true,
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        ['extractCss'],
        'CSS extraction configured'
      );

      expect(result.messages).toContain('CSS extraction configured');
    });

    it('should handle multiple patterns and match any', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {
                  vendorChunk: true,
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/nonMatch/, 'vendorChunk', /anotherNonMatch/],
        'Vendor chunk found'
      );

      expect(result.messages).toContain('Vendor chunk found');
    });

    it('should handle file read errors gracefully', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, 'invalid json content {{{');

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/pattern/],
        'Success message'
      );

      // Should still return valid result even with parse errors
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('analyzeWithDependencyFallback', () => {
    it('should return angular.json message when pattern matches', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {
                  optimization: true,
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result =
        BundleOptimizationBaseAnalyzer.analyzeWithDependencyFallback(
          tempDir,
          [/optimization/],
          'Optimization from angular.json',
          ['critical'],
          'Dependency found'
        );

      expect(result.messages).toContain('Optimization from angular.json');
    });

    it('should check dependencies when angular.json pattern does not match', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          critical: '^1.0.0',
        });

      const result =
        BundleOptimizationBaseAnalyzer.analyzeWithDependencyFallback(
          tempDir,
          [/nonExistentPattern/],
          'Angular config message',
          ['critical'],
          'Critical CSS dependency found'
        );

      expect(result.messages).toContain('Critical CSS dependency found');
    });

    it('should return empty messages when neither angular.json nor dependencies match', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          lodash: '^4.0.0',
        });

      const result =
        BundleOptimizationBaseAnalyzer.analyzeWithDependencyFallback(
          tempDir,
          [/nonExistentPattern/],
          'Angular config message',
          ['critical'],
          'Critical dependency found'
        );

      expect(result.messages).toHaveLength(0);
    });

    it('should work without dependency fallback parameters', () => {
      const result =
        BundleOptimizationBaseAnalyzer.analyzeWithDependencyFallback(
          tempDir,
          [/pattern/],
          'Success message'
        );

      expect(result.messages).toHaveLength(0);
    });

    it('should match any of the provided dependencies', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          penthouse: '^2.0.0',
        });

      const result =
        BundleOptimizationBaseAnalyzer.analyzeWithDependencyFallback(
          tempDir,
          [/nonExistent/],
          'Angular config message',
          ['critical', 'penthouse', 'critters'],
          'CSS tool found'
        );

      expect(result.messages).toContain('CSS tool found');
    });
  });

  describe('hasPattern private method behavior', () => {
    it('should correctly match RegExp patterns in content', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        vendorChunk: true,
        splitChunks: {
          cacheGroups: {},
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/splitChunks/],
        'Split chunks configured'
      );

      expect(result.messages).toContain('Split chunks configured');
    });

    it('should correctly match string patterns in content', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        build: {
          options: {
            outputHashing: 'all',
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        ['outputHashing'],
        'Output hashing configured'
      );

      expect(result.messages).toContain('Output hashing configured');
    });

    it('should return empty when no patterns match', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        build: {},
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
        tempDir,
        [/xyz/, 'abc', /123/],
        'Should not match'
      );

      expect(result.messages).toHaveLength(0);
    });
  });
});
