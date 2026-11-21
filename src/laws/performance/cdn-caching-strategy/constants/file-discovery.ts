import type { RuleOfCodeConfig } from '../../../../config/types';
import { PathOperations } from '../../../../utils/path-operations';
import { PathResolver } from '../../../../utils/path-resolver';

/**
 * Where the CDN and Caching Strategy analyzers look: the config file names
 * (firebase.json, angular.json, nginx.conf, .htaccess, server.js, apache.conf,
 * webpack configs), env files, service-worker files and ngsw configs, and
 * helpers that resolve them against the project root. The app entry files
 * come from `pathMappings` when the config has them, otherwise from the
 * Angular defaults (src/main.ts, app.component.ts, app.config.ts).
 */
export class CdnCachingStrategyFileDiscoveryConstants {
  static readonly CONFIG_FILES = {
    FIREBASE_JSON: 'firebase.json',
    ANGULAR_JSON: 'angular.json',
    NGINX_CONF: 'nginx.conf',
    HTACCESS: '.htaccess',
    SERVER_JS: 'server.js',
    APACHE_CONF: 'apache.conf',
    WEBPACK_CONFIG: 'webpack.config.js',
    WEBPACK_PROD: 'webpack.prod.js',
  };

  static readonly ENV_FILES = [
    'src/environments/environment.prod.ts',
    '.env',
    '.env.production',
  ];

  static readonly SERVICE_WORKER_FILES = [
    'src/sw.js',
    'src/service-worker.js',
    'public/sw.js',
    'public/service-worker.js',
  ];

  static readonly SERVICE_WORKER_CONFIGS = [
    'ngsw-config.json',
    'src/ngsw-config.json',
  ];

  static readonly WEBPACK_CONFIGS = [
    'webpack.config.js',
    'webpack.prod.js',
    'config/webpack.config.js',
  ];

  static getEnvFilePaths(projectRoot: string): string[] {
    return this.ENV_FILES.map(file => PathOperations.join(projectRoot, file));
  }

  static getServiceWorkerFilePaths(projectRoot: string): string[] {
    return this.SERVICE_WORKER_FILES.map(file =>
      PathOperations.join(projectRoot, file)
    );
  }

  static async getAppFilePaths(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [mainTsPaths, appComponentPaths, appConfigPaths] =
        await Promise.all([
          resolver.getMainTsPaths(),
          resolver.getAppComponentPaths(),
          resolver.getAppConfigPaths(),
        ]);
      return [...mainTsPaths, ...appComponentPaths, ...appConfigPaths];
    }

    // Fallback
    return [
      PathOperations.join(projectRoot, 'src/main.ts'),
      PathOperations.join(projectRoot, 'src/app/app.component.ts'),
      PathOperations.join(projectRoot, 'src/app/app.config.ts'),
    ];
  }

  static getWebpackConfigPaths(projectRoot: string): string[] {
    return this.WEBPACK_CONFIGS.map(file =>
      PathOperations.join(projectRoot, file)
    );
  }

  static getServerConfigPaths(projectRoot: string): string[] {
    return [
      PathOperations.join(projectRoot, this.CONFIG_FILES.HTACCESS),
      PathOperations.join(projectRoot, this.CONFIG_FILES.NGINX_CONF),
      PathOperations.join(projectRoot, this.CONFIG_FILES.SERVER_JS),
      PathOperations.join(projectRoot, this.CONFIG_FILES.APACHE_CONF),
    ];
  }
}
