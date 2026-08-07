import { CONFIG_FILES } from '../../constants';

/**
 * ProjectTypeDetectorConfiguration
 * Centralized configuration management for project type detection operations
 */
export class ProjectTypeDetectorConfiguration {
  private static readonly Config = ProjectTypeDetectorConfiguration;

  /**
   * Angular project detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly ANGULAR_PROJECT_PATTERNS = {
    files: [
      CONFIG_FILES.ANGULAR_JSON,
      CONFIG_FILES.NXCONFIG, // Nx workspace with Angular
      'src/main.ts',
      'src/app/app.module.ts',
    ] as readonly string[],
    dependencies: ['@angular/core', '@angular/cli'] as readonly string[],
  } as const;

  /**
   * React project detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly REACT_PROJECT_PATTERNS = {
    files: [
      'src/App.tsx',
      'src/App.jsx',
      'public/index.html',
    ] as readonly string[],
    dependencies: [
      'react',
      'react-dom',
      'create-react-app',
    ] as readonly string[],
  } as const;

  /**
   * Vue project detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly VUE_PROJECT_PATTERNS = {
    files: ['vue.config.js', 'src/main.js', 'src/App.vue'] as readonly string[],
    dependencies: ['vue', '@vue/cli', 'nuxt'] as readonly string[],
  } as const;

  /**
   * Node.js project detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly NODE_PROJECT_PATTERNS = {
    files: [
      'server.js',
      'app.js',
      'index.js',
      'src/server.ts',
      'src/app.ts',
    ] as readonly string[],
    dependencies: [
      'express',
      'fastify',
      'koa',
      '@nestjs/core',
    ] as readonly string[],
  } as const;

  /**
   * TypeScript project detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly TYPESCRIPT_PROJECT_PATTERNS = {
    files: [
      CONFIG_FILES.TSCONFIG_JSON,
      'tsconfig.base.json',
    ] as readonly string[],
    dependencies: ['typescript'] as readonly string[],
  } as const;

  /**
   * Python project detection patterns. Detected by canonical Python project
   * markers (PEP 518/621 pyproject, setuptools, requirements, lockfiles) — not by
   * package.json dependencies, which Python projects do not use.
   */
  static readonly PYTHON_PROJECT_PATTERNS = {
    files: [
      'pyproject.toml',
      'setup.py',
      'setup.cfg',
      'requirements.txt',
      'Pipfile',
      'uv.lock',
      'poetry.lock',
      'tox.ini',
    ] as readonly string[],
    dependencies: [] as readonly string[],
  } as const;

  /**
   * Testing framework patterns (RULE 1: 100% internal coverage)
   */
  static readonly TESTING_FRAMEWORK_PATTERNS = {
    dependencies: ['jest', 'jasmine', '@angular/testing'] as readonly string[],
  } as const;

  /**
   * Nx workspace detection patterns (RULE 1: 100% internal coverage)
   */
  static readonly NX_WORKSPACE_PATTERNS = {
    files: [CONFIG_FILES.NXCONFIG, 'workspace.json'] as readonly string[],
  } as const;

  /**
   * Build configuration file patterns (RULE 1: 100% internal coverage)
   */
  static readonly BUILD_CONFIG_PATTERNS = {
    files: [
      CONFIG_FILES.ANGULAR_JSON,
      'webpack.config.js',
      'vite.config.js',
      'rollup.config.js',
      'config/bundle-optimization.config.js',
    ] as readonly string[],
  } as const;

  /**
   * Heavy library patterns for optimization detection (RULE 1: 100% internal coverage)
   * Note: rxjs is heavy but required as core dependency for Angular apps
   */
  static readonly HEAVY_LIBRARY_PATTERNS = {
    libraries: [
      'lodash',
      'moment',
      '@angular/material',
      'bootstrap',
      'chart.js',
      'd3',
    ] as readonly string[],
  } as const;

  /**
   * Deployment configuration file patterns (RULE 1: 100% internal coverage)
   */
  static readonly DEPLOYMENT_CONFIG_PATTERNS = {
    files: [
      CONFIG_FILES.DOCKERFILE,
      CONFIG_FILES.DOCKER_COMPOSE,
      'docker-compose.yaml',
      'firebase.json',
      CONFIG_FILES.ANGULAR_JSON,
      CONFIG_FILES.PACKAGE_JSON,
      '.env',
      '.env.example',
    ] as readonly string[],
    patterns: [
      CONFIG_FILES.DOCKERFILE,
      '.yml',
      '.yaml',
      'firebase.json',
      CONFIG_FILES.ANGULAR_JSON,
      CONFIG_FILES.PACKAGE_JSON,
      '.env',
    ] as readonly string[],
  } as const;

  /**
   * Project type detection order (priority based) (RULE 1: 100% internal coverage)
   */
  static readonly PROJECT_TYPE_DETECTION_ORDER = {
    types: [
      'angular',
      'react',
      'vue',
      'node',
      'typescript',
      'python',
    ] as readonly string[],
  } as const;
  /**
   * Get Angular project detection patterns (RULE 2: Caching)
   */
  static getAngularProjectPatterns(_config?: unknown): {
    files: readonly string[];
    dependencies: readonly string[];
  } {
    return this.Config.ANGULAR_PROJECT_PATTERNS;
  }

  /**
   * Get React project detection patterns (RULE 2: Caching)
   */
  static getReactProjectPatterns(_config?: unknown): {
    files: readonly string[];
    dependencies: readonly string[];
  } {
    return this.Config.REACT_PROJECT_PATTERNS;
  }

  /**
   * Get Vue project detection patterns (RULE 2: Caching)
   */
  static getVueProjectPatterns(_config?: unknown): {
    files: readonly string[];
    dependencies: readonly string[];
  } {
    return this.Config.VUE_PROJECT_PATTERNS;
  }

  /**
   * Get Node.js project detection patterns (RULE 2: Caching)
   */
  static getNodeProjectPatterns(_config?: unknown): {
    files: readonly string[];
    dependencies: readonly string[];
  } {
    return this.Config.NODE_PROJECT_PATTERNS;
  }

  /**
   * Get TypeScript project detection patterns (RULE 2: Caching)
   */
  static getTypeScriptProjectPatterns(_config?: unknown): {
    files: readonly string[];
    dependencies: readonly string[];
  } {
    return this.Config.TYPESCRIPT_PROJECT_PATTERNS;
  }

  /**
   * Get Python project detection patterns (RULE 2: Caching)
   */
  static getPythonProjectPatterns(_config?: unknown): {
    files: readonly string[];
    dependencies: readonly string[];
  } {
    return this.Config.PYTHON_PROJECT_PATTERNS;
  }

  /**
   * Get testing framework dependencies (RULE 2: Caching)
   */
  static getTestingFrameworkPatterns(_config?: unknown): {
    dependencies: readonly string[];
  } {
    return this.Config.TESTING_FRAMEWORK_PATTERNS;
  }

  /**
   * Get Nx workspace detection patterns (RULE 2: Caching)
   */
  static getNxWorkspacePatterns(_config?: unknown): {
    files: readonly string[];
  } {
    return this.Config.NX_WORKSPACE_PATTERNS;
  }

  /**
   * Get build configuration file patterns (RULE 2: Caching)
   */
  static getBuildConfigPatterns(_config?: unknown): {
    files: readonly string[];
  } {
    return this.Config.BUILD_CONFIG_PATTERNS;
  }

  /**
   * Get heavy library patterns for optimization detection (RULE 2: Caching)
   */
  static getHeavyLibraryPatterns(_config?: unknown): {
    libraries: readonly string[];
  } {
    return this.Config.HEAVY_LIBRARY_PATTERNS;
  }

  /**
   * Get deployment configuration file patterns (RULE 2: Caching)
   */
  static getDeploymentConfigPatterns(_config?: unknown): {
    files: readonly string[];
    patterns: readonly string[];
  } {
    return this.Config.DEPLOYMENT_CONFIG_PATTERNS;
  }

  /**
   * Get project type detection order (priority based) (RULE 2: Caching)
   */
  static getProjectTypeDetectionOrder(_config?: unknown): {
    types: readonly string[];
  } {
    return this.Config.PROJECT_TYPE_DETECTION_ORDER;
  }
}
