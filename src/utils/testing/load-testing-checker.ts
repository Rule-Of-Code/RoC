import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { FileScannerBase } from './file-scanner-base';

/**
 * Load Testing Configuration Checker
 * Specialized utility for analyzing load testing setup and configuration
 */
export class LoadTestingChecker extends FileScannerBase {
  /**
   * Check for load testing setup in project
   */
  static checkLoadTestingSetup(projectRoot: string): {
    hasLoadTesting: boolean;
    tools: string[];
    configFiles: string[];
    scriptFiles: string[];
  } {
    const loadTestingTools: string[] = [];
    const configFiles: string[] = [];
    const scriptFiles: string[] = [];

    // Check package.json for load testing dependencies
    try {
      const allDependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      // Check for popular load testing tools
      const loadTestingDeps = [
        'artillery',
        'k6',
        'loadtest',
        'autocannon',
        'clinic',
        'apache-bench',
        'jmeter',
        'lighthouse',
      ];

      for (const dep of loadTestingDeps) {
        if (allDependencies[dep]) {
          loadTestingTools.push(dep);
        }
      }
    } catch (_error) {
      // Ignore dependency detection errors
    }

    // Check for load testing configuration files
    this.findLoadTestingConfigs(projectRoot, configFiles);

    // Check for load testing script files
    this.findLoadTestingScripts(projectRoot, scriptFiles);

    return {
      hasLoadTesting:
        loadTestingTools.length > 0 ||
        configFiles.length > 0 ||
        scriptFiles.length > 0,
      tools: loadTestingTools,
      configFiles,
      scriptFiles,
    };
  }

  /**
   * Find load testing configuration files
   */
  private static findLoadTestingConfigs(
    projectRoot: string,
    configFiles: string[]
  ): void {
    const configPatterns = [
      'artillery.yml',
      'artillery.yaml',
      'artillery.config.js',
      'k6.config.js',
      'loadtest.config.js',
      'performance.config.js',
    ];

    this.searchFilesRecursively(projectRoot, configPatterns, configFiles);
  }

  /**
   * Find load testing script files
   */
  private static findLoadTestingScripts(
    projectRoot: string,
    scriptFiles: string[]
  ): void {
    const scriptPatterns = [
      /load.*test.*\.(js|ts)$/i,
      /artillery.*\.(js|ts|yml|yaml)$/i,
      /k6.*\.(js|ts)$/i,
      /performance.*script.*\.(js|ts)$/i,
      /stress.*test.*\.(js|ts)$/i,
    ];

    this.searchScriptFilesRecursively(projectRoot, scriptPatterns, scriptFiles);
  }

  /**
   * Search for files matching patterns recursively (string-based)
   */
  private static searchFilesRecursively(
    directory: string,
    patterns: string[],
    results: string[]
  ): void {
    this.searchFilesRecursivelyByString(directory, patterns, results);
  }

  /**
   * Search for script files matching regex patterns
   */
  private static searchScriptFilesRecursively(
    directory: string,
    patterns: RegExp[],
    results: string[]
  ): void {
    this.searchFilesRecursivelyByRegex(directory, patterns, results);
  }
}
