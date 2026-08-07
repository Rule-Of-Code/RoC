import { ProjectTypeDetector } from '../config/project-type-detector';
import { CONFIG_FILES, JEST_CONSTANTS } from '../constants';
import { FileUtils } from '../file-utils';
import { NxWorkspace } from '../nx-workspace';
import { PathOperations } from '../path-operations';

/**
 * Regular expression patterns for coverage configuration parsing
 */
const COVERAGE_PATTERNS = {
  THRESHOLD_GLOBAL: /coverageThreshold[^}]*global[^}]*{([^}]*)}/,
  COLLECTION_PATTERNS: /collectCoverageFrom[^[]*\[([^\]]*)\]/,
} as const;

/**
 * Coverage Configuration Inspector
 * Specialized utility for analyzing test coverage configuration setup
 */
export class CoverageConfigurationInspector {
  /**
   * Check coverage configuration in project
   */
  static checkCoverageConfiguration(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for coverage configuration
    const coverageConfig = this.checkCoverageConfig(projectRoot);
    if (!coverageConfig.hasCoverageConfig) {
      violations.push('No test coverage configuration found');
      suggestions.push(
        'Configure test coverage thresholds in Jest or other testing framework'
      );
    }

    // Check coverage thresholds
    const thresholds = this.checkCoverageThresholds(projectRoot);
    if (!thresholds.hasThresholds) {
      suggestions.push('Set coverage thresholds (e.g., 80% for all metrics)');
    } else if (thresholds.lowThresholds.length > 0) {
      suggestions.push(
        `Consider raising coverage thresholds for: ${thresholds.lowThresholds.join(', ')}`
      );
    }

    // Check for coverage reporting
    const reporting = this.checkCoverageReporting(projectRoot);
    if (!reporting.hasReporting) {
      suggestions.push('Configure coverage reporting (HTML, LCOV, text)');
    }

    // Check for coverage collection configuration
    const collection = this.checkCoverageCollection(projectRoot);
    if (!collection.hasCollection) {
      suggestions.push('Configure coverage collection from source files');
    }

    return { violations, suggestions };
  }

  /**
   * Check coverage configuration
   */
  private static checkCoverageConfig(projectRoot: string): {
    hasCoverageConfig: boolean;
    configSources: string[];
  } {
    const configSources: string[] = [];

    // Check Jest configuration files for coverage — across the workspace, root
    // AND apps/<name>/. In an Nx monorepo coverageThreshold lives in
    // apps/<name>/jest.config.ts; a root-only look reported "No test coverage
    // configuration found" against a project that had configured exactly that.
    // (The sibling TestConfigurationInspector already resolves this way — this
    // check was the lone Nx-blind one.)
    const jestConfigs = this.getAllJestConfigFiles();
    for (const configFile of jestConfigs) {
      const matches = NxWorkspace.resolveSourceFiles(projectRoot, configFile);
      const configured = matches.some(configPath => {
        const content = this.readJestConfigFile(configPath);
        return (
          !!content &&
          (content.includes(JEST_CONSTANTS.COLLECT_COVERAGE) ||
            content.includes(JEST_CONSTANTS.COVERAGE_THRESHOLD))
        );
      });
      if (configured) {
        configSources.push(configFile);
      }
    }

    // Check package.json Jest config
    const jestConfig = this.getJestConfigFromPackageJson(projectRoot);
    if (
      jestConfig &&
      (JEST_CONSTANTS.COLLECT_COVERAGE in jestConfig ||
        JEST_CONSTANTS.COVERAGE_THRESHOLD in jestConfig)
    ) {
      configSources.push(CONFIG_FILES.PACKAGE_JSON);
    }

    return {
      hasCoverageConfig: configSources.length > 0,
      configSources,
    };
  }

  /**
   * Check coverage thresholds
   */
  private static checkCoverageThresholds(projectRoot: string): {
    hasThresholds: boolean;
    thresholds: Record<string, number>;
    lowThresholds: string[];
  } {
    let thresholds = this.extractThresholdsFromPackageJson(projectRoot);

    if (Object.keys(thresholds).length === 0) {
      thresholds = this.extractThresholdsFromJestConfig(projectRoot);
    }

    const lowThresholds = this.identifyLowThresholds(thresholds);

    return {
      hasThresholds: Object.keys(thresholds).length > 0,
      thresholds,
      lowThresholds,
    };
  }

  private static extractThresholdsFromPackageJson(
    projectRoot: string
  ): Record<string, number> {
    const coverageThreshold = this.extractJestPropertyFromPackageJson<{
      global?: Record<string, number>;
    }>(projectRoot, JEST_CONSTANTS.COVERAGE_THRESHOLD);

    return coverageThreshold?.global ?? {};
  }

  private static extractThresholdsFromJestConfig(
    projectRoot: string
  ): Record<string, number> {
    let result: Record<string, number> = {};

    this.forEachJestConfig(projectRoot, (configPath, content) => {
      if (Object.keys(result).length === 0) {
        result = this.extractThresholdsFromContent(content);
      }
    });

    return result;
  }

  private static extractThresholdsFromContent(
    content: string
  ): Record<string, number> {
    const thresholds: Record<string, number> = {};

    // Extract threshold values using centralized pattern
    const thresholdMatch = content.match(COVERAGE_PATTERNS.THRESHOLD_GLOBAL);

    if (!thresholdMatch?.[1]) {
      return thresholds;
    }

    this.parseThresholdMetrics(thresholdMatch[1], thresholds);
    return thresholds;
  }

  private static parseThresholdMetrics(
    thresholdContent: string,
    thresholds: Record<string, number>
  ): void {
    const metrics = JEST_CONSTANTS.COVERAGE_METRICS;

    for (const metric of metrics) {
      const match = thresholdContent.match(new RegExp(`${metric}:\\s*(\\d+)`));
      if (match?.[1]) {
        thresholds[metric] = parseInt(match[1], 10);
      }
    }
  }

  private static identifyLowThresholds(
    thresholds: Record<string, number>
  ): string[] {
    const lowThresholds: string[] = [];

    for (const [metric, threshold] of Object.entries(thresholds)) {
      if (threshold < JEST_CONSTANTS.DEFAULT_COVERAGE_THRESHOLD) {
        lowThresholds.push(`${metric} (${threshold}%)`);
      }
    }

    return lowThresholds;
  }

  /**
   * Get Jest configuration files for iteration
   */
  private static getJestConfigFiles(): string[] {
    return [CONFIG_FILES.JEST_CONFIG, CONFIG_FILES.JEST_CONFIG_TS];
  }

  /**
   * Get Jest configuration files for coverage check (includes JSON)
   */
  private static getAllJestConfigFiles(): string[] {
    return [
      CONFIG_FILES.JEST_CONFIG,
      CONFIG_FILES.JEST_CONFIG_TS,
      CONFIG_FILES.JEST_CONFIG_JSON,
    ];
  }

  /**
   * Read Jest config file with error handling
   */
  private static readJestConfigFile(configPath: string): string | null {
    try {
      return FileUtils.readFile(configPath);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Extract Jest property from package.json with type safety
   */
  private static getJestConfigFromPackageJson(
    projectRoot: string
  ): Record<string, unknown> | null {
    const packageJson = ProjectTypeDetector.getPackageJson(projectRoot);
    if (
      packageJson &&
      typeof packageJson === 'object' &&
      'jest' in packageJson
    ) {
      const pkg = packageJson as Record<string, unknown>;
      return (pkg.jest as Record<string, unknown> | undefined) ?? null;
    }
    return null;
  }

  private static extractJestPropertyFromPackageJson<T>(
    projectRoot: string,
    property: string
  ): T | null {
    const jestConfig = this.getJestConfigFromPackageJson(projectRoot);
    if (jestConfig && property in jestConfig) {
      return jestConfig[property] as T;
    }
    return null;
  }

  /**
   * Remove quotes from string array elements
   */
  private static removeQuotesFromStringArray(strings: string[]): string[] {
    return strings.map(str => str.replace(/['"]/g, ''));
  }

  /**
   * Iterate through Jest config files and execute handler
   */
  private static forEachJestConfig(
    projectRoot: string,
    handler: (configPath: string, content: string) => void
  ): void {
    const jestConfigs = this.getJestConfigFiles();

    for (const configFile of jestConfigs) {
      const configPath = PathOperations.join(projectRoot, configFile);
      if (FileUtils.exists(configPath)) {
        const content = this.readJestConfigFile(configPath);
        if (content) {
          handler(configPath, content);
        }
      }
    }
  }

  /**
   * Check coverage reporting configuration
   */
  private static checkCoverageReporting(projectRoot: string): {
    hasReporting: boolean;
    reporters: string[];
  } {
    const reporters: string[] = [];

    this.extractReportersFromPackageJson(projectRoot, reporters);
    this.extractFromJestConfigs(
      projectRoot,
      JEST_CONSTANTS.COVERAGE_REPORTERS,
      (content, results) => {
        this.extractCommonReporters(content, results);
      }
    );

    return {
      hasReporting: reporters.length > 0,
      reporters: this.deduplicateArray(reporters),
    };
  }

  private static extractReportersFromPackageJson(
    projectRoot: string,
    reporters: string[]
  ): void {
    const coverageReporters = this.extractJestPropertyFromPackageJson<string[]>(
      projectRoot,
      JEST_CONSTANTS.COVERAGE_REPORTERS
    );

    if (coverageReporters) {
      reporters.push(...coverageReporters);
    }
  }

  private static extractCommonReporters(
    content: string,
    reporters: string[]
  ): void {
    const commonReporters = JEST_CONSTANTS.COMMON_REPORTERS;

    for (const reporter of commonReporters) {
      if (content.includes(reporter)) {
        reporters.push(reporter);
      }
    }
  }

  /**
   * Check coverage collection configuration
   */
  private static checkCoverageCollection(projectRoot: string): {
    hasCollection: boolean;
    collectFrom: string[];
  } {
    const collectFrom: string[] = [];

    this.extractCollectionFromPackageJson(projectRoot, collectFrom);
    this.extractFromJestConfigs(
      projectRoot,
      JEST_CONSTANTS.COLLECT_COVERAGE_FROM,
      (content, results) => {
        this.extractCollectionPatterns(content, results);
      }
    );

    return {
      hasCollection: collectFrom.length > 0,
      collectFrom: this.deduplicateArray(collectFrom),
    };
  }

  private static extractCollectionFromPackageJson(
    projectRoot: string,
    collectFrom: string[]
  ): void {
    const collectCoverageFrom = this.extractJestPropertyFromPackageJson<
      string[]
    >(projectRoot, JEST_CONSTANTS.COLLECT_COVERAGE_FROM);

    if (collectCoverageFrom) {
      collectFrom.push(...collectCoverageFrom);
    }
  }

  private static extractCollectionPatterns(
    content: string,
    collectFrom: string[]
  ): void {
    const patterns = content.match(COVERAGE_PATTERNS.COLLECTION_PATTERNS);
    if (!patterns?.[1]) {
      return;
    }

    const patternList = patterns[1].match(/'([^']*)'|"([^']*)"/g);
    if (patternList) {
      const cleanedPatterns = this.removeQuotesFromStringArray(patternList);
      collectFrom.push(...cleanedPatterns);
    }
  }

  /**
   * Extract property from Jest config files with property check and handler
   */
  private static extractFromJestConfigs(
    projectRoot: string,
    propertyName: string,
    handler: (content: string, results: string[]) => void
  ): void {
    const results: string[] = [];

    this.forEachJestConfig(projectRoot, (configPath, content) => {
      if (content.includes(propertyName)) {
        handler(content, results);
      }
    });
  }

  /**
   * Remove duplicates from array while preserving order
   */
  private static deduplicateArray(items: string[]): string[] {
    return Array.from(new Set(items));
  }
}
