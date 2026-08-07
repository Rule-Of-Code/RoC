import { PathOperations } from '../../path-operations';

/**
 * Build Environment Analyzer Configuration
 * Centralized configuration for build environment analysis patterns
 */
export class BuildEnvironmentAnalyzerConfiguration {
  private static readonly Config = BuildEnvironmentAnalyzerConfiguration;

  /**
   * Build keywords for detection (RULE 1: 100% internal coverage)
   */
  static readonly BUILD_KEYWORDS = ['build', 'compile'] as readonly string[];

  /**
   * Environment-specific build keywords (RULE 1: 100% internal coverage)
   */
  static readonly ENV_BUILD_KEYWORDS = [
    'prod',
    'dev',
    'staging',
  ] as readonly string[];

  /**
   * Test keywords for detection (RULE 1: 100% internal coverage)
   */
  static readonly TEST_KEYWORDS = ['test'] as readonly string[];

  /**
   * Build consistency messages (RULE 1: 100% internal coverage)
   */
  static readonly BUILD_CONSISTENCY_MESSAGES = {
    noBuildMessage: 'No build scripts found',
    noTestMessage: 'No test scripts found',
    parseErrorMessage: 'Error parsing package.json',
    addBuildScripts: 'Add build scripts for different environments',
    addEnvBuilds: 'Consider adding environment-specific build scripts',
    addEnvBuildExamples: 'Example: "build:prod", "build:staging", "build:dev"',
    addTestScripts:
      'Add test scripts for consistent testing across environments',
  } as const;

  /**
   * Build configuration file names (RULE 1: 100% internal coverage)
   */
  static readonly BUILD_CONFIG_FILES = [
    'webpack.config.js',
    'vite.config.ts',
    'rollup.config.js',
    'tsconfig.json',
    'angular.json',
    '.babelrc',
  ] as readonly string[];

  /**
   * Build configuration messages (RULE 1: 100% internal coverage)
   */
  static readonly BUILD_CONFIG_MESSAGES = {
    violationMessage: 'No build configuration files found',
    suggestionMessage: 'Add build configuration for consistent builds',
  } as const;

  /**
   * Main file paths for environment detection (RULE 1: 100% internal coverage)
   */
  static readonly MAIN_FILE_PATHS = [
    'src/main.ts',
    'src/index.ts',
    'src/app.ts',
    'server.ts',
    'index.js',
  ] as readonly string[];

  /**
   * Environment detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly ENV_PATTERNS = [
    /process\.env\.NODE_ENV/,
    /environment\.production/,
    /isProduction/,
    /isDevelopment/,
    /NODE_ENV/,
    /process\.env\.[A-Z_]+/,
  ] as readonly RegExp[];

  /**
   * Environment configuration paths (RULE 1: 100% internal coverage)
   */
  static readonly ENV_CONFIG_PATHS = [
    'src/config/index.ts',
    'config/index.js',
    'src/environments',
  ] as readonly string[];

  /**
   * Environment detection messages (RULE 1: 100% internal coverage)
   */
  static readonly ENV_DETECTION_MESSAGES = {
    noDetection: 'No proper environment detection found',
    implementNodeEnv: 'Implement NODE_ENV or similar environment detection',
    useProcessEnv: 'Use process.env.NODE_ENV to detect current environment',
    createConfigManagement: 'Create centralized configuration management',
    useEnvConfigs: 'Use environment-specific config files',
  } as const;

  /**
   * Docker file names (RULE 1: 100% internal coverage)
   */
  static readonly DOCKER_FILES = {
    dockerfile: 'Dockerfile',
    dockerCompose: 'docker-compose.yml',
  } as const;

  /**
   * Docker environment keywords (RULE 1: 100% internal coverage)
   */
  static readonly DOCKER_ENV_KEYWORDS = ['ENV', 'ARG'] as readonly string[];

  /**
   * Docker Compose environment keywords (RULE 1: 100% internal coverage)
   */
  static readonly DOCKER_COMPOSE_ENV_KEYWORDS = [
    'env_file',
    'environment',
  ] as readonly string[];

  /**
   * Docker patterns (RULE 1: 100% internal coverage)
   */
  static readonly DOCKER_PATTERNS = {
    fromKeyword: 'FROM',
    serviceRegex: /^\s*[a-zA-Z][a-zA-Z0-9_-]*:/gm,
  } as const;

  /**
   * Docker violation messages (RULE 1: 100% internal coverage)
   */
  static readonly DOCKER_VIOLATION_MESSAGES = {
    noEnvVars: 'Dockerfile does not handle environment variables',
    readDockerfile: 'Error reading Dockerfile',
    noDockerComposeEnv:
      'Docker Compose does not reference environment configuration',
    readDockerCompose: 'Error reading docker-compose.yml',
  } as const;

  /**
   * Docker suggestion messages (RULE 1: 100% internal coverage)
   */
  static readonly DOCKER_SUGGESTION_MESSAGES = {
    considerDocker: 'Consider using Docker for consistent environments',
    dockerParity: 'Docker ensures parity between development and production',
    useEnvArgs: 'Use ENV or ARG instructions in Dockerfile for configuration',
    multiStage: 'Consider multi-stage Docker builds for different environments',
    useEnvFile: 'Use env_file or environment sections in docker-compose.yml',
    separateServices:
      'Consider separating services in docker-compose for better environment parity',
  } as const;

  /**
   * File reading configuration (RULE 1: 100% internal coverage)
   */
  static readonly FILE_READING_CONFIG = {
    encoding: 'utf8' as const,
  } as const;

  /**
   * Package.json file name (RULE 1: 100% internal coverage)
   */
  static readonly PACKAGE_JSON_FILE = 'package.json' as const;

  /**
   * Get project file paths (RULE 2: Caching)
   */
  static getProjectFilePaths(projectRoot: string): {
    packageJsonPath: string;
    dockerfilePath: string;
    dockerComposePath: string;
  } {
    const dockerFiles = this.DOCKER_FILES;
    return {
      packageJsonPath: PathOperations.join(projectRoot, this.PACKAGE_JSON_FILE),
      dockerfilePath: PathOperations.join(projectRoot, dockerFiles.dockerfile),
      dockerComposePath: PathOperations.join(
        projectRoot,
        dockerFiles.dockerCompose
      ),
    };
  }
}
