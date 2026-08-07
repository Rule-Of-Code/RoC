/**
 * Build Environment Analyzer Tests
 * Tests for BuildEnvironmentAnalyzer class
 */
import { DEFAULT_CONFIG } from '../../src/config/types';
import { BuildEnvironmentAnalyzer } from '../../src/utils/deployment/build-environment-analyzer/build-environment-analyzer';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('BuildEnvironmentAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('build-env-analyzer-test-');
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // checkBuildConsistency Tests
  // ============================================
  describe('checkBuildConsistency()', () => {
    it('should return parse error when no package.json exists', () => {
      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(false);
      expect(result.hasEnvironmentSpecificBuilds).toBe(false);
      expect(result.hasTestScripts).toBe(false);
      expect(result.hasBuildConfig).toBe(false);
      expect(result.violations).toContain('Error parsing package.json');
    });

    it('should detect build scripts in package.json', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
            test: 'jest',
          },
        })
      );

      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(true);
      expect(result.hasTestScripts).toBe(true);
    });

    it('should detect environment-specific build scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
            'build:prod': 'tsc --prod',
            'build:staging': 'tsc --staging',
            test: 'jest',
          },
        })
      );

      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(true);
      expect(result.hasEnvironmentSpecificBuilds).toBe(true);
      expect(result.hasTestScripts).toBe(true);
    });

    it('should detect build configuration files', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const tsconfigPath = PathOperations.join(tempDir, 'tsconfig.json');

      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
          },
        })
      );
      FileUtils.writeFile(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {},
        })
      );

      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.hasBuildConfig).toBe(true);
    });

    it('should add suggestions when no environment-specific builds', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
            test: 'jest',
          },
        })
      );

      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.suggestions).toContain(
        'Consider adding environment-specific build scripts'
      );
    });

    it('should add violations when no test scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
          },
        })
      );

      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.violations).toContain('No test scripts found');
    });

    it('should handle package.json without scripts', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify({
          name: 'test-project',
        })
      );

      const result = BuildEnvironmentAnalyzer.checkBuildConsistency(tempDir);

      expect(result.hasBuildScripts).toBe(false);
      expect(result.violations).toContain('No build scripts found');
    });
  });

  // ============================================
  // checkEnvironmentDetection Tests
  // ============================================
  describe('checkEnvironmentDetection()', () => {
    it('should detect environment detection in main files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const mainTsPath = PathOperations.join(srcDir, 'main.ts');
      FileUtils.writeFile(
        mainTsPath,
        `
const isProduction = process.env.NODE_ENV === 'production';
console.log(isProduction);
`
      );

      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.hasEnvironmentDetection).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect environment detection via config index file', () => {
      const configDir = PathOperations.join(tempDir, 'src', 'config');
      FileUtils.createDirectory(configDir);
      const configIndexPath = PathOperations.join(configDir, 'index.ts');
      FileUtils.writeFile(configIndexPath, 'export const config = {};');

      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect environment detection via environments directory', () => {
      const envDir = PathOperations.join(tempDir, 'src', 'environments');
      FileUtils.createDirectory(envDir);

      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should report violations when no environment detection found', () => {
      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.hasEnvironmentDetection).toBe(false);
      expect(result.violations).toContain(
        'No proper environment detection found'
      );
    });

    it('should provide suggestions when no environment detection', () => {
      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.suggestions).toContain(
        'Implement NODE_ENV or similar environment detection'
      );
      expect(result.suggestions).toContain(
        'Use process.env.NODE_ENV to detect current environment'
      );
    });

    it('should detect isProduction pattern', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const appTsPath = PathOperations.join(srcDir, 'app.ts');
      FileUtils.writeFile(
        appTsPath,
        `
const isProduction = true;
`
      );

      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.hasEnvironmentDetection).toBe(true);
    });

    it('should detect isDevelopment pattern', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexTsPath = PathOperations.join(srcDir, 'index.ts');
      FileUtils.writeFile(
        indexTsPath,
        `
const isDevelopment = process.env.NODE_ENV !== 'production';
`
      );

      const result = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.hasEnvironmentDetection).toBe(true);
    });
  });

  // ============================================
  // analyzeDockerEnvironments Tests
  // ============================================
  describe('analyzeDockerEnvironments()', () => {
    it('should return suggestions when no Docker files exist', () => {
      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(false);
      expect(result.hasDockerCompose).toBe(false);
      expect(result.suggestions).toContain(
        'Consider using Docker for consistent environments'
      );
    });

    it('should detect Dockerfile with ENV handling', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(
        dockerfilePath,
        `
FROM node:18
ENV NODE_ENV=production
COPY . .
RUN npm install
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(true);
    });

    it('should detect Dockerfile with ARG handling', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(
        dockerfilePath,
        `
FROM node:18
ARG BUILD_ENV=development
COPY . .
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(true);
    });

    it('should report violation when Dockerfile has no env handling', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      FileUtils.writeFile(
        dockerfilePath,
        `
FROM node:18
COPY . .
RUN npm install
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(false);
      expect(result.violations).toContain(
        'Dockerfile does not handle environment variables'
      );
    });

    it('should detect docker-compose with environment handling', () => {
      const dockerComposePath = PathOperations.join(
        tempDir,
        'docker-compose.yml'
      );
      FileUtils.writeFile(
        dockerComposePath,
        `
version: '3'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(true);
    });

    it('should detect docker-compose with env_file handling', () => {
      const dockerComposePath = PathOperations.join(
        tempDir,
        'docker-compose.yml'
      );
      FileUtils.writeFile(
        dockerComposePath,
        `
version: '3'
services:
  app:
    build: .
    env_file:
      - .env
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(true);
    });

    it('should report violation when docker-compose has no env handling', () => {
      const dockerComposePath = PathOperations.join(
        tempDir,
        'docker-compose.yml'
      );
      FileUtils.writeFile(
        dockerComposePath,
        `
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(false);
      expect(result.violations).toContain(
        'Docker Compose does not reference environment configuration'
      );
    });

    it('should handle both Dockerfile and docker-compose', () => {
      const dockerfilePath = PathOperations.join(tempDir, 'Dockerfile');
      const dockerComposePath = PathOperations.join(
        tempDir,
        'docker-compose.yml'
      );

      FileUtils.writeFile(
        dockerfilePath,
        `
FROM node:18
ENV NODE_ENV=production
`
      );

      FileUtils.writeFile(
        dockerComposePath,
        `
version: '3'
services:
  app:
    environment:
      - NODE_ENV=production
`
      );

      const result =
        BuildEnvironmentAnalyzer.analyzeDockerEnvironments(tempDir);

      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfileHandlesEnv).toBe(true);
      expect(result.hasDockerCompose).toBe(true);
      expect(result.dockerComposeHandlesEnv).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
