/**
 * Build Environment Analyzer Configuration Tests
 * Tests for BuildEnvironmentAnalyzerConfiguration class
 */
import { BuildEnvironmentAnalyzerConfiguration } from '../../src/utils/deployment/build-environment-analyzer/build-environment-analyzer-configuration';
import { PathOperations } from '../../src/utils/path-operations';

describe('BuildEnvironmentAnalyzerConfiguration', () => {
  // ============================================
  // BUILD_KEYWORDS Tests
  // ============================================
  describe('BUILD_KEYWORDS', () => {
    it('should be defined as readonly array', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_KEYWORDS
      ).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.BUILD_KEYWORDS)
      ).toBe(true);
    });

    it('should contain build keyword', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.BUILD_KEYWORDS).toContain(
        'build'
      );
    });

    it('should contain compile keyword', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.BUILD_KEYWORDS).toContain(
        'compile'
      );
    });
  });

  // ============================================
  // ENV_BUILD_KEYWORDS Tests
  // ============================================
  describe('ENV_BUILD_KEYWORDS', () => {
    it('should be defined as readonly array', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_BUILD_KEYWORDS
      ).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.ENV_BUILD_KEYWORDS)
      ).toBe(true);
    });

    it('should contain prod keyword', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_BUILD_KEYWORDS
      ).toContain('prod');
    });

    it('should contain dev keyword', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_BUILD_KEYWORDS
      ).toContain('dev');
    });

    it('should contain staging keyword', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_BUILD_KEYWORDS
      ).toContain('staging');
    });
  });

  // ============================================
  // TEST_KEYWORDS Tests
  // ============================================
  describe('TEST_KEYWORDS', () => {
    it('should be defined as readonly array', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.TEST_KEYWORDS).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.TEST_KEYWORDS)
      ).toBe(true);
    });

    it('should contain test keyword', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.TEST_KEYWORDS).toContain(
        'test'
      );
    });
  });

  // ============================================
  // BUILD_CONSISTENCY_MESSAGES Tests
  // ============================================
  describe('BUILD_CONSISTENCY_MESSAGES', () => {
    it('should have noBuildMessage', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .noBuildMessage
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .noBuildMessage
      ).toBe('string');
    });

    it('should have noTestMessage', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .noTestMessage
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .noTestMessage
      ).toBe('string');
    });

    it('should have parseErrorMessage', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .parseErrorMessage
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .parseErrorMessage
      ).toBe('string');
    });

    it('should have addBuildScripts', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addBuildScripts
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addBuildScripts
      ).toBe('string');
    });

    it('should have addEnvBuilds', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addEnvBuilds
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addEnvBuilds
      ).toBe('string');
    });

    it('should have addEnvBuildExamples', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addEnvBuildExamples
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addEnvBuildExamples
      ).toBe('string');
    });

    it('should have addTestScripts', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addTestScripts
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES
          .addTestScripts
      ).toBe('string');
    });
  });

  // ============================================
  // BUILD_CONFIG_FILES Tests
  // ============================================
  describe('BUILD_CONFIG_FILES', () => {
    it('should be defined as readonly array', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES
      ).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain webpack.config.js', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES
      ).toContain('webpack.config.js');
    });

    it('should contain vite.config.ts', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES
      ).toContain('vite.config.ts');
    });

    it('should contain tsconfig.json', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES
      ).toContain('tsconfig.json');
    });

    it('should contain angular.json', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES
      ).toContain('angular.json');
    });
  });

  // ============================================
  // BUILD_CONFIG_MESSAGES Tests
  // ============================================
  describe('BUILD_CONFIG_MESSAGES', () => {
    it('should have violationMessage', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_MESSAGES
          .violationMessage
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_MESSAGES
          .violationMessage
      ).toBe('string');
    });

    it('should have suggestionMessage', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_MESSAGES
          .suggestionMessage
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_MESSAGES
          .suggestionMessage
      ).toBe('string');
    });
  });

  // ============================================
  // MAIN_FILE_PATHS Tests
  // ============================================
  describe('MAIN_FILE_PATHS', () => {
    it('should be defined as readonly array', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS
      ).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS)
      ).toBe(true);
    });

    it('should contain src/main.ts', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS).toContain(
        'src/main.ts'
      );
    });

    it('should contain src/index.ts', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS).toContain(
        'src/index.ts'
      );
    });

    it('should contain src/app.ts', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS).toContain(
        'src/app.ts'
      );
    });

    it('should contain server.ts', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS).toContain(
        'server.ts'
      );
    });
  });

  // ============================================
  // ENV_PATTERNS Tests
  // ============================================
  describe('ENV_PATTERNS', () => {
    it('should be defined as readonly array', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS)
      ).toBe(true);
    });

    it('should contain regex patterns', () => {
      for (const pattern of BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS) {
        expect(pattern instanceof RegExp).toBe(true);
      }
    });

    it('should match process.env.NODE_ENV', () => {
      const patterns = BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS;
      const testString = 'const env = process.env.NODE_ENV';
      const hasMatch = patterns.some(pattern => pattern.test(testString));
      expect(hasMatch).toBe(true);
    });

    it('should match isProduction', () => {
      const patterns = BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS;
      const testString = 'const isProduction = true';
      const hasMatch = patterns.some(pattern => pattern.test(testString));
      expect(hasMatch).toBe(true);
    });

    it('should match isDevelopment', () => {
      const patterns = BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS;
      const testString = 'const isDevelopment = true';
      const hasMatch = patterns.some(pattern => pattern.test(testString));
      expect(hasMatch).toBe(true);
    });
  });

  // ============================================
  // ENV_CONFIG_PATHS Tests
  // ============================================
  describe('ENV_CONFIG_PATHS', () => {
    it('should be defined as readonly array', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_CONFIG_PATHS
      ).toBeDefined();
      expect(
        Array.isArray(BuildEnvironmentAnalyzerConfiguration.ENV_CONFIG_PATHS)
      ).toBe(true);
    });

    it('should contain src/config/index.ts', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.ENV_CONFIG_PATHS).toContain(
        'src/config/index.ts'
      );
    });

    it('should contain src/environments', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.ENV_CONFIG_PATHS).toContain(
        'src/environments'
      );
    });
  });

  // ============================================
  // ENV_DETECTION_MESSAGES Tests
  // ============================================
  describe('ENV_DETECTION_MESSAGES', () => {
    it('should have noDetection message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES.noDetection
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES
          .noDetection
      ).toBe('string');
    });

    it('should have implementNodeEnv message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES
          .implementNodeEnv
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES
          .implementNodeEnv
      ).toBe('string');
    });

    it('should have useProcessEnv message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES
          .useProcessEnv
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES
          .useProcessEnv
      ).toBe('string');
    });
  });

  // ============================================
  // DOCKER_FILES Tests
  // ============================================
  describe('DOCKER_FILES', () => {
    it('should have dockerfile property', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_FILES.dockerfile
      ).toBe('Dockerfile');
    });

    it('should have dockerCompose property', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_FILES.dockerCompose
      ).toBe('docker-compose.yml');
    });
  });

  // ============================================
  // DOCKER_ENV_KEYWORDS Tests
  // ============================================
  describe('DOCKER_ENV_KEYWORDS', () => {
    it('should contain ENV', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_ENV_KEYWORDS
      ).toContain('ENV');
    });

    it('should contain ARG', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_ENV_KEYWORDS
      ).toContain('ARG');
    });
  });

  // ============================================
  // DOCKER_COMPOSE_ENV_KEYWORDS Tests
  // ============================================
  describe('DOCKER_COMPOSE_ENV_KEYWORDS', () => {
    it('should contain env_file', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_COMPOSE_ENV_KEYWORDS
      ).toContain('env_file');
    });

    it('should contain environment', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_COMPOSE_ENV_KEYWORDS
      ).toContain('environment');
    });
  });

  // ============================================
  // DOCKER_VIOLATION_MESSAGES Tests
  // ============================================
  describe('DOCKER_VIOLATION_MESSAGES', () => {
    it('should have noEnvVars message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES
          .noEnvVars
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES
          .noEnvVars
      ).toBe('string');
    });

    it('should have readDockerfile message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES
          .readDockerfile
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES
          .readDockerfile
      ).toBe('string');
    });

    it('should have noDockerComposeEnv message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES
          .noDockerComposeEnv
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES
          .noDockerComposeEnv
      ).toBe('string');
    });
  });

  // ============================================
  // DOCKER_SUGGESTION_MESSAGES Tests
  // ============================================
  describe('DOCKER_SUGGESTION_MESSAGES', () => {
    it('should have considerDocker message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES
          .considerDocker
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES
          .considerDocker
      ).toBe('string');
    });

    it('should have dockerParity message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES
          .dockerParity
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES
          .dockerParity
      ).toBe('string');
    });

    it('should have useEnvArgs message', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES
          .useEnvArgs
      ).toBeDefined();
      expect(
        typeof BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES
          .useEnvArgs
      ).toBe('string');
    });
  });

  // ============================================
  // FILE_READING_CONFIG Tests
  // ============================================
  describe('FILE_READING_CONFIG', () => {
    it('should have encoding set to utf8', () => {
      expect(
        BuildEnvironmentAnalyzerConfiguration.FILE_READING_CONFIG.encoding
      ).toBe('utf8');
    });
  });

  // ============================================
  // PACKAGE_JSON_FILE Tests
  // ============================================
  describe('PACKAGE_JSON_FILE', () => {
    it('should be package.json', () => {
      expect(BuildEnvironmentAnalyzerConfiguration.PACKAGE_JSON_FILE).toBe(
        'package.json'
      );
    });
  });

  // ============================================
  // getProjectFilePaths Tests
  // ============================================
  describe('getProjectFilePaths()', () => {
    it('should return correct paths for project root', () => {
      const projectRoot = '/test/project';
      const result =
        BuildEnvironmentAnalyzerConfiguration.getProjectFilePaths(projectRoot);

      expect(result.packageJsonPath).toBe(
        PathOperations.join(projectRoot, 'package.json')
      );
      expect(result.dockerfilePath).toBe(
        PathOperations.join(projectRoot, 'Dockerfile')
      );
      expect(result.dockerComposePath).toBe(
        PathOperations.join(projectRoot, 'docker-compose.yml')
      );
    });

    it('should handle nested project root', () => {
      const projectRoot = '/home/user/projects/my-app';
      const result =
        BuildEnvironmentAnalyzerConfiguration.getProjectFilePaths(projectRoot);

      expect(result.packageJsonPath).toContain('my-app');
      expect(result.packageJsonPath).toContain('package.json');
    });

    it('should return object with all required properties', () => {
      const result =
        BuildEnvironmentAnalyzerConfiguration.getProjectFilePaths('/test');

      expect(result).toHaveProperty('packageJsonPath');
      expect(result).toHaveProperty('dockerfilePath');
      expect(result).toHaveProperty('dockerComposePath');
    });
  });
});
