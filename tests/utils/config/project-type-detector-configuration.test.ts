/**
 * Project Type Detector Configuration - Tests
 * Tests for ProjectTypeDetectorConfiguration class
 */
import { ProjectTypeDetectorConfiguration } from '../../../src/utils/config/project-type-detector/project-type-detector-configuration';

describe('ProjectTypeDetectorConfiguration', () => {
  // ============================================
  // Static Constants
  // ============================================
  describe('Static Constants', () => {
    describe('ANGULAR_PROJECT_PATTERNS', () => {
      it('should have files array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.ANGULAR_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should have dependencies array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.ANGULAR_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.dependencies)).toBe(true);
        expect(patterns.dependencies.length).toBeGreaterThan(0);
      });

      it('should include angular.json in files', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.ANGULAR_PROJECT_PATTERNS;
        expect(patterns.files).toContain('angular.json');
      });

      it('should include @angular/core in dependencies', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.ANGULAR_PROJECT_PATTERNS;
        expect(patterns.dependencies).toContain('@angular/core');
      });
    });

    describe('REACT_PROJECT_PATTERNS', () => {
      it('should have files array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.REACT_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should have dependencies array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.REACT_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.dependencies)).toBe(true);
        expect(patterns.dependencies.length).toBeGreaterThan(0);
      });

      it('should include react in dependencies', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.REACT_PROJECT_PATTERNS;
        expect(patterns.dependencies).toContain('react');
      });
    });

    describe('VUE_PROJECT_PATTERNS', () => {
      it('should have files array', () => {
        const patterns = ProjectTypeDetectorConfiguration.VUE_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should have dependencies array', () => {
        const patterns = ProjectTypeDetectorConfiguration.VUE_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.dependencies)).toBe(true);
        expect(patterns.dependencies.length).toBeGreaterThan(0);
      });

      it('should include vue in dependencies', () => {
        const patterns = ProjectTypeDetectorConfiguration.VUE_PROJECT_PATTERNS;
        expect(patterns.dependencies).toContain('vue');
      });
    });

    describe('NODE_PROJECT_PATTERNS', () => {
      it('should have files array', () => {
        const patterns = ProjectTypeDetectorConfiguration.NODE_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should have dependencies array', () => {
        const patterns = ProjectTypeDetectorConfiguration.NODE_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.dependencies)).toBe(true);
        expect(patterns.dependencies.length).toBeGreaterThan(0);
      });

      it('should include express in dependencies', () => {
        const patterns = ProjectTypeDetectorConfiguration.NODE_PROJECT_PATTERNS;
        expect(patterns.dependencies).toContain('express');
      });
    });

    describe('TYPESCRIPT_PROJECT_PATTERNS', () => {
      it('should have files array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.TYPESCRIPT_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should have dependencies array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.TYPESCRIPT_PROJECT_PATTERNS;
        expect(Array.isArray(patterns.dependencies)).toBe(true);
      });

      it('should include tsconfig.json in files', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.TYPESCRIPT_PROJECT_PATTERNS;
        expect(patterns.files).toContain('tsconfig.json');
      });

      it('should include typescript in dependencies', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.TYPESCRIPT_PROJECT_PATTERNS;
        expect(patterns.dependencies).toContain('typescript');
      });
    });

    describe('TESTING_FRAMEWORK_PATTERNS', () => {
      it('should have dependencies array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.TESTING_FRAMEWORK_PATTERNS;
        expect(Array.isArray(patterns.dependencies)).toBe(true);
        expect(patterns.dependencies.length).toBeGreaterThan(0);
      });

      it('should include jest in dependencies', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.TESTING_FRAMEWORK_PATTERNS;
        expect(patterns.dependencies).toContain('jest');
      });
    });

    describe('NX_WORKSPACE_PATTERNS', () => {
      it('should have files array', () => {
        const patterns = ProjectTypeDetectorConfiguration.NX_WORKSPACE_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should include nx.json in files', () => {
        const patterns = ProjectTypeDetectorConfiguration.NX_WORKSPACE_PATTERNS;
        expect(patterns.files).toContain('nx.json');
      });
    });

    describe('BUILD_CONFIG_PATTERNS', () => {
      it('should have files array', () => {
        const patterns = ProjectTypeDetectorConfiguration.BUILD_CONFIG_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should include webpack.config.js in files', () => {
        const patterns = ProjectTypeDetectorConfiguration.BUILD_CONFIG_PATTERNS;
        expect(patterns.files).toContain('webpack.config.js');
      });
    });

    describe('HEAVY_LIBRARY_PATTERNS', () => {
      it('should have libraries array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.HEAVY_LIBRARY_PATTERNS;
        expect(Array.isArray(patterns.libraries)).toBe(true);
        expect(patterns.libraries.length).toBeGreaterThan(0);
      });

      it('should include lodash in libraries', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.HEAVY_LIBRARY_PATTERNS;
        expect(patterns.libraries).toContain('lodash');
      });
    });

    describe('DEPLOYMENT_CONFIG_PATTERNS', () => {
      it('should have files array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.DEPLOYMENT_CONFIG_PATTERNS;
        expect(Array.isArray(patterns.files)).toBe(true);
        expect(patterns.files.length).toBeGreaterThan(0);
      });

      it('should have patterns array', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.DEPLOYMENT_CONFIG_PATTERNS;
        expect(Array.isArray(patterns.patterns)).toBe(true);
        expect(patterns.patterns.length).toBeGreaterThan(0);
      });

      it('should include Dockerfile in files', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.DEPLOYMENT_CONFIG_PATTERNS;
        expect(patterns.files).toContain('Dockerfile');
      });
    });

    describe('PROJECT_TYPE_DETECTION_ORDER', () => {
      it('should have types array', () => {
        const order =
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER;
        expect(Array.isArray(order.types)).toBe(true);
        expect(order.types.length).toBeGreaterThan(0);
      });

      it('should include angular in types', () => {
        const order =
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER;
        expect(order.types).toContain('angular');
      });

      it('should include react in types', () => {
        const order =
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER;
        expect(order.types).toContain('react');
      });

      it('should include vue in types', () => {
        const order =
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER;
        expect(order.types).toContain('vue');
      });

      it('should include node in types', () => {
        const order =
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER;
        expect(order.types).toContain('node');
      });

      it('should include typescript in types', () => {
        const order =
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER;
        expect(order.types).toContain('typescript');
      });
    });
  });

  // ============================================
  // Getter Methods
  // ============================================
  describe('Getter Methods', () => {
    describe('getAngularProjectPatterns()', () => {
      it('should return Angular patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getAngularProjectPatterns();
        expect(patterns.files).toBeDefined();
        expect(patterns.dependencies).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getAngularProjectPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.ANGULAR_PROJECT_PATTERNS
        );
      });
    });

    describe('getReactProjectPatterns()', () => {
      it('should return React patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getReactProjectPatterns();
        expect(patterns.files).toBeDefined();
        expect(patterns.dependencies).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getReactProjectPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.REACT_PROJECT_PATTERNS
        );
      });
    });

    describe('getVueProjectPatterns()', () => {
      it('should return Vue patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getVueProjectPatterns();
        expect(patterns.files).toBeDefined();
        expect(patterns.dependencies).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getVueProjectPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.VUE_PROJECT_PATTERNS
        );
      });
    });

    describe('getNodeProjectPatterns()', () => {
      it('should return Node patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getNodeProjectPatterns();
        expect(patterns.files).toBeDefined();
        expect(patterns.dependencies).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getNodeProjectPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.NODE_PROJECT_PATTERNS
        );
      });
    });

    describe('getTypeScriptProjectPatterns()', () => {
      it('should return TypeScript patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getTypeScriptProjectPatterns();
        expect(patterns.files).toBeDefined();
        expect(patterns.dependencies).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getTypeScriptProjectPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.TYPESCRIPT_PROJECT_PATTERNS
        );
      });
    });

    describe('getTestingFrameworkPatterns()', () => {
      it('should return testing framework patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getTestingFrameworkPatterns();
        expect(patterns.dependencies).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getTestingFrameworkPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.TESTING_FRAMEWORK_PATTERNS
        );
      });
    });

    describe('getNxWorkspacePatterns()', () => {
      it('should return Nx workspace patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getNxWorkspacePatterns();
        expect(patterns.files).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getNxWorkspacePatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.NX_WORKSPACE_PATTERNS
        );
      });
    });

    describe('getBuildConfigPatterns()', () => {
      it('should return build config patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getBuildConfigPatterns();
        expect(patterns.files).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getBuildConfigPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.BUILD_CONFIG_PATTERNS
        );
      });
    });

    describe('getHeavyLibraryPatterns()', () => {
      it('should return heavy library patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getHeavyLibraryPatterns();
        expect(patterns.libraries).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getHeavyLibraryPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.HEAVY_LIBRARY_PATTERNS
        );
      });
    });

    describe('getDeploymentConfigPatterns()', () => {
      it('should return deployment config patterns', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getDeploymentConfigPatterns();
        expect(patterns.files).toBeDefined();
        expect(patterns.patterns).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const patterns =
          ProjectTypeDetectorConfiguration.getDeploymentConfigPatterns();
        expect(patterns).toBe(
          ProjectTypeDetectorConfiguration.DEPLOYMENT_CONFIG_PATTERNS
        );
      });
    });

    describe('getProjectTypeDetectionOrder()', () => {
      it('should return project type detection order', () => {
        const order =
          ProjectTypeDetectorConfiguration.getProjectTypeDetectionOrder();
        expect(order.types).toBeDefined();
      });

      it('should return same value as static constant', () => {
        const order =
          ProjectTypeDetectorConfiguration.getProjectTypeDetectionOrder();
        expect(order).toBe(
          ProjectTypeDetectorConfiguration.PROJECT_TYPE_DETECTION_ORDER
        );
      });
    });
  });
});
