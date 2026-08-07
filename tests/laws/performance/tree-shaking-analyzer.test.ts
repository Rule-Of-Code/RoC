/**
 * Tests for TreeShakingAnalyzerService
 *
 * Tests for tree shaking configuration detection including
 * Angular optimization and ES6 modules.
 */
import { TreeShakingAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/tree-shaking.analyzer';
import { ProjectTypeDetectorValidation } from '../../../src/utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('TreeShakingAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('tree-shaking-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return isEnabled false when no tree shaking configuration is found', () => {
      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(false);
      expect(result.configurations).toHaveLength(0);
    });

    it('should detect Angular optimization: true in angular.json', () => {
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

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain(
        'Angular build optimization enabled'
      );
    });

    it('should detect Angular optimization object with scripts not false', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {
                  optimization: {
                    scripts: true,
                    styles: true,
                  },
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain(
        'Angular build optimization enabled'
      );
    });

    it('should not detect optimization when scripts is explicitly false', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {
                  optimization: {
                    scripts: false,
                    styles: true,
                  },
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.configurations).not.toContain(
        'Angular build optimization enabled'
      );
    });

    it('should detect optimization in configurations', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {
              build: {
                options: {},
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
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain(
        'Angular build optimization enabled'
      );
    });

    it('should detect ES6 modules when type is module in package.json', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        type: 'module',
      });
      FileUtils.writeFile(packageJsonPath, packageJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain('ES6 modules configured');
    });

    it('should detect ES6 modules from Angular dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        dependencies: {
          '@angular/core': '^15.0.0',
        },
      });
      FileUtils.writeFile(packageJsonPath, packageJsonContent);

      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          '@angular/core': '^15.0.0',
        });

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain('ES6 modules configured');
    });

    it('should detect ES6 modules from ngx dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        dependencies: {
          'ngx-translate': '^10.0.0',
        },
      });
      FileUtils.writeFile(packageJsonPath, packageJsonContent);

      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'ngx-translate': '^10.0.0',
        });

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain('ES6 modules configured');
    });

    it('should detect ES6 modules from ng- dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        dependencies: {
          'ng-bootstrap': '^12.0.0',
        },
      });
      FileUtils.writeFile(packageJsonPath, packageJsonContent);

      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'ng-bootstrap': '^12.0.0',
        });

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain('ES6 modules configured');
    });

    it('should detect both Angular optimization and ES6 modules', () => {
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

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        type: 'module',
      });
      FileUtils.writeFile(packageJsonPath, packageJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain(
        'Angular build optimization enabled'
      );
      expect(result.configurations).toContain('ES6 modules configured');
    });

    it('should handle invalid angular.json gracefully', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, 'invalid json {{{');

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(false);
    });

    it('should handle invalid package.json gracefully', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(packageJsonPath, 'invalid json {{{');

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(false);
    });

    it('should handle empty projects in angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {},
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(false);
    });

    it('should handle missing architect in project', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {},
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(false);
    });

    it('should handle missing build in architect', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          myApp: {
            architect: {},
          },
        },
      });
      FileUtils.writeFile(angularJsonPath, angularJsonContent);

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(false);
    });

    it('should handle multiple projects and detect optimization in any', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJsonContent = JSON.stringify({
        projects: {
          app1: {
            architect: {
              build: {
                options: {},
              },
            },
          },
          app2: {
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

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.isEnabled).toBe(true);
      expect(result.configurations).toContain(
        'Angular build optimization enabled'
      );
    });

    it('should not detect ES6 modules for non-Angular dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        dependencies: {
          lodash: '^4.0.0',
          rxjs: '^7.0.0',
        },
      });
      FileUtils.writeFile(packageJsonPath, packageJsonContent);

      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          lodash: '^4.0.0',
          rxjs: '^7.0.0',
        });

      const result = TreeShakingAnalyzerService.analyze(tempDir);

      expect(result.configurations).not.toContain('ES6 modules configured');
    });
  });
});
