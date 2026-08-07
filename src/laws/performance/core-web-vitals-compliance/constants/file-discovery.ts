import { PathOperations } from '../../../../utils/path-operations';
import { NxWorkspace } from '../../../../utils/nx-workspace';

export class CoreWebVitalsFileDiscoveryConstants {
  static readonly CONFIG_FILES = {
    LIGHTHOUSE_CONFIG: 'lighthouse.config.js',
    LIGHTHOUSE_RC_JS: '.lighthouserc.js',
    LIGHTHOUSE_RC_JSON: '.lighthouserc.json',
    ANGULAR_JSON: 'angular.json',
    WEBPACK_CONFIG: 'webpack.config.js',
    NGINX_CONF: 'nginx.conf',
    INDEX_HTML: 'src/index.html',
    MANIFEST_JSON: 'src/manifest.json',
  };

  static readonly CONFIG_PATHS = [
    'lighthouse.config.js',
    'config/lighthouse.config.js',
    '.lighthouserc.js',
    '.lighthouserc.json',
  ];

  static readonly ROUTING_FILE_PATTERNS = [
    '**/*app-routing.module.ts',
    '**/*routing.ts',
  ];
  static readonly COMPONENT_FILE_PATTERNS = ['**/*.component.ts'];
  static readonly IMAGE_EXTENSIONS = ['*.webp', '*.avif'];
  static readonly SERVICE_WORKER_PATTERNS = [
    '**/sw.js',
    '**/service-worker.js',
  ];

  static getLighthouseConfigPaths(projectRoot: string): string[] {
    return this.CONFIG_PATHS.map(path =>
      PathOperations.join(projectRoot, path)
    );
  }

  static getIndexHtmlPath(projectRoot: string): string {
    return NxWorkspace.resolveSourceFile(projectRoot, 'src/index.html');
  }

  static getManifestPath(projectRoot: string): string {
    return NxWorkspace.resolveSourceFile(projectRoot, 'src/manifest.json');
  }

  static getNginxConfigPath(projectRoot: string): string {
    return PathOperations.join(projectRoot, 'nginx.conf');
  }

  static getAngularJsonPath(projectRoot: string): string {
    return PathOperations.join(projectRoot, this.CONFIG_FILES.ANGULAR_JSON);
  }

  static getWebpackConfigPath(projectRoot: string): string {
    return PathOperations.join(projectRoot, this.CONFIG_FILES.WEBPACK_CONFIG);
  }
}
