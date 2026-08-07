/**
 * Build Environment Analyzer Validation Tests
 * Tests for BuildEnvironmentAnalyzerValidation class
 */
import { BuildEnvironmentAnalyzerValidation } from '../../src/utils/deployment/build-environment-analyzer/build-environment-analyzer-validation';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('BuildEnvironmentAnalyzerValidation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('build-env-validation-test-');
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // validateBuildConsistency Tests
  // ============================================
  describe('validateBuildConsistency()', () => {
    it('should return error when package.json cannot be parsed', () => {
      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(false);
      expect(result.hasEnvironmentSpecificBuilds).toBe(false);
      expect(result.hasTestScripts).toBe(false);
      expect(result.hasBuildConfig).toBe(false);
      expect(result.violations).toContain('Error parsing package.json');
    });

    it('should handle invalid JSON in package.json', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(packageJsonPath, 'invalid json content');

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(false);
      expect(result.violations).toContain('Error parsing package.json');
    });

    it('should detect build scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: { build: 'tsc' },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(true);
    });

    it('should detect compile scripts as build scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: { compile: 'tsc' },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(true);
    });

    it('should detect environment-specific builds', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: {
            build: 'tsc',
            'build:prod': 'tsc --prod',
            'build:dev': 'tsc --dev',
          },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasEnvironmentSpecificBuilds).toBe(true);
    });

    it('should detect staging build scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: {
            build: 'tsc',
            'build:staging': 'tsc --staging',
          },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasEnvironmentSpecificBuilds).toBe(true);
    });

    it('should detect test scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: { test: 'jest' },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasTestScripts).toBe(true);
    });

    it('should detect build config files', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const tsconfigPath = PathOperations.join(tempDir, 'tsconfig.json');

      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({ name: 'test', scripts: {} })
      );
      FileUtils.writeFile(tsconfigPath, JSON.stringify({}));

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasBuildConfig).toBe(true);
    });

    it('should detect webpack config', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const webpackPath = PathOperations.join(tempDir, 'webpack.config.js');

      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({ name: 'test', scripts: {} })
      );
      FileUtils.writeFile(webpackPath, 'module.exports = {};');

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.hasBuildConfig).toBe(true);
    });

    it('should add violation when no build scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({ name: 'test', scripts: {} })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.violations).toContain('No build scripts found');
    });

    it('should add suggestion when no env-specific builds', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: { build: 'tsc' },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.suggestions).toContain(
        'Consider adding environment-specific build scripts'
      );
    });

    it('should add violation when no test scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: { build: 'tsc' },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.violations).toContain('No test scripts found');
    });

    it('should add violation when no build config', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test',
          scripts: { build: 'tsc' },
        })
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateBuildConsistency(tempDir);

      expect(result.violations).toContain('No build configuration files found');
    });
  });

  // ============================================
  // validateEnvironmentDetection Tests
  // ============================================
  describe('validateEnvironmentDetection()', () => {
    it('should detect environment detection in src/main.ts', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const mainPath = PathOperations.join(srcDir, 'main.ts');
      FileUtils.writeFile(mainPath, 'const env = process.env.NODE_ENV;');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect environment detection in src/index.ts', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.ts');
      FileUtils.writeFile(indexPath, 'const isProduction = true;');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect environment detection in src/app.ts', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const appPath = PathOperations.join(srcDir, 'app.ts');
      FileUtils.writeFile(appPath, 'const isDevelopment = false;');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect environment detection in server.ts', () => {
      const serverPath = PathOperations.join(tempDir, 'server.ts');
      FileUtils.writeFile(serverPath, 'const mode = process.env.NODE_ENV;');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect config index file as environment detection', () => {
      const configDir = PathOperations.join(tempDir, 'src', 'config');
      FileUtils.createDirectory(configDir);
      const configIndexPath = PathOperations.join(configDir, 'index.ts');
      FileUtils.writeFile(configIndexPath, 'export const config = {};');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect environments directory as environment detection', () => {
      const envsDir = PathOperations.join(tempDir, 'src', 'environments');
      FileUtils.createDirectory(envsDir);

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should report violation when no environment detection', () => {
      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(false);
      expect(result.violations).toContain(
        'No proper environment detection found'
      );
    });

    it('should provide suggestions when no environment detection', () => {
      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain(
        'Implement NODE_ENV or similar environment detection'
      );
    });

    it('should detect environment.production pattern', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const mainPath = PathOperations.join(srcDir, 'main.ts');
      FileUtils.writeFile(mainPath, 'if (environment.production) {}');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect generic process.env pattern', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const mainPath = PathOperations.join(srcDir, 'main.ts');
      FileUtils.writeFile(mainPath, 'const apiUrl = process.env.API_URL;');

      const result =
        BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
          tempDir
        );

      expect(result.hasEnvironmentDetection).toBe(true);
    });
  });

  // ============================================
  // validateDockerEnvironments Tests
  // ============================================
  describe('validateDockerEnvironments()', () => {
    it('should suggest Docker when no Docker files exist', () => {
      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(false);
      expect(result.hasDockerCompose).toBe(false);
      expect(result.suggestions).toContain(
        'Consider using Docker for consistent environments'
      );
    });

    it('should detect Dockerfile with ENV', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(
        dockerfilePath,
        'FROM node:18\nENV NODE_ENV=production'
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(true);
    });

    it('should detect Dockerfile with ARG', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(dockerfilePath, 'FROM node:18\nARG NODE_ENV');

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(true);
    });

    it('should report violation when Dockerfile lacks env handling', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(dockerfilePath, 'FROM node:18\nCOPY . .');

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(false);
      expect(result.violations).toContain(
        'Dockerfile does not handle environment variables'
      );
    });

    it('should detect docker-compose with environment', () => {
      const composePath = PathOperations.join(tempDir, 'docker-compose.yml');
      FileUtils.writeFile(
        composePath,
        'services:\n  app:\n    environment:\n      - NODE_ENV'
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(true);
    });

    it('should detect docker-compose with env_file', () => {
      const composePath = PathOperations.join(tempDir, 'docker-compose.yml');
      FileUtils.writeFile(
        composePath,
        'services:\n  app:\n    env_file:\n      - .env'
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(true);
    });

    it('should report violation when docker-compose lacks env handling', () => {
      const composePath = PathOperations.join(tempDir, 'docker-compose.yml');
      FileUtils.writeFile(composePath, 'services:\n  app:\n    build: .');

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(false);
      expect(result.violations).toContain(
        'Docker Compose does not reference environment configuration'
      );
    });

    it('should provide suggestions for multi-stage builds', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(dockerfilePath, 'FROM node:18\nCOPY . .');

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.suggestions).toContain(
        'Consider multi-stage Docker builds for different environments'
      );
    });

    it('should handle both Dockerfile and docker-compose', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      const composePath = PathOperations.join(tempDir, 'docker-compose.yml');

      FileUtils.writeFile(
        dockerfilePath,
        'FROM node:18\nENV NODE_ENV=production'
      );
      FileUtils.writeFile(
        composePath,
        'services:\n  app:\n    environment:\n      - NODE_ENV'
      );

      const result =
        BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(true);
      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
