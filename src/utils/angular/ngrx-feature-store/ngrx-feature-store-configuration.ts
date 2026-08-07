import type { RuleOfCodeConfig } from '../../../config/types';
import {
  ANGULAR_CONSTANTS,
  DIRECTORY_NAMES,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
} from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { StringTemplateUtils } from '../../string-template-utils';
import { findDirectoriesRecursively as findDirsRecursively } from '../recursive-directory-finder';

/**
 * Configuration utility for NgRx Feature Store Structure Analysis
 * Centralizes feature store patterns, file requirements, and analysis logic
 */
export class NgRxFeatureStoreConfiguration {
  private static readonly Config = NgRxFeatureStoreConfiguration;

  /**
   * Required file extension patterns for NgRx feature store (RULE 1: 100% internal coverage)
   */
  static readonly REQUIRED_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.ACTIONS_TS,
    FILE_EXTENSIONS.REDUCER_TS,
    FILE_EXTENSIONS.SELECTORS_TS,
    FILE_EXTENSIONS.EFFECTS_TS,
    FILE_EXTENSIONS.MODELS_TS,
    FILE_EXTENSIONS.FACADE_TS,
  ] as readonly string[];

  /**
   * Optional file extension patterns for NgRx feature store (RULE 1: 100% internal coverage)
   */
  static readonly OPTIONAL_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.EFFECTS_TS,
    FILE_EXTENSIONS.FACADE_TS,
  ] as readonly string[];

  /**
   * Validation messages for NgRx feature store structure (RULE 1: 100% internal coverage)
   */
  static readonly VALIDATION_MESSAGES_CONFIG = {
    MISSING_PLUS_STATE: 'Missing +state directory in {0} feature',
    CREATE_PLUS_STATE: 'Create +state directory in {0} feature directory',
    MISSING_REQUIRED_FILE: 'Missing required file {0} in {1}/+state/',
    CREATE_REQUIRED_FILE: 'Create {0} in {1}/+state/ directory',
    CONSIDER_OPTIONAL_FILE:
      'Consider creating {0} in {1}/+state/ for better architecture',
    CREATE_FEATURE_DIRECTORIES:
      'Create feature directories for organized NgRx state management',
  } as const;

  /**
   * Get required files for a complete NgRx feature store (RULE 2: Caching)
   */
  static getRequiredFeatureFiles(featureName: string): string[] {
    const extensions = this.Config.REQUIRED_FILE_EXTENSIONS;
    return [
      ...extensions.map(ext => `${featureName}${ext}`),
      ANGULAR_CONSTANTS.INDEX_TS,
    ];
  }

  /**
   * Get optional files that are recommended but not required (RULE 2: Caching)
   */
  static getOptionalFeatureFiles(featureName: string): string[] {
    const extensions = this.Config.OPTIONAL_FILE_EXTENSIONS;
    return extensions.map(ext => `${featureName}${ext}`);
  }

  /**
   * Get validation messages for NgRx feature store structure (RULE 2: Caching)
   */
  static getValidationMessages(): {
    MISSING_PLUS_STATE: (featureName: string) => string;
    CREATE_PLUS_STATE: (featureName: string) => string;
    MISSING_REQUIRED_FILE: (fileName: string, featureName: string) => string;
    CREATE_REQUIRED_FILE: (fileName: string, featureName: string) => string;
    CONSIDER_OPTIONAL_FILE: (fileName: string, featureName: string) => string;
    CREATE_FEATURE_DIRECTORIES: string;
  } {
    const messages = this.Config.VALIDATION_MESSAGES_CONFIG;
    return {
      MISSING_PLUS_STATE: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MISSING_PLUS_STATE,
          featureName
        ),
      CREATE_PLUS_STATE: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.CREATE_PLUS_STATE,
          featureName
        ),
      MISSING_REQUIRED_FILE: (fileName: string, featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MISSING_REQUIRED_FILE,
          fileName,
          featureName
        ),
      CREATE_REQUIRED_FILE: (fileName: string, featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.CREATE_REQUIRED_FILE,
          fileName,
          featureName
        ),
      CONSIDER_OPTIONAL_FILE: (fileName: string, featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.CONSIDER_OPTIONAL_FILE,
          fileName,
          featureName
        ),
      CREATE_FEATURE_DIRECTORIES: messages.CREATE_FEATURE_DIRECTORIES,
    };
  }

  /**
   * Find all directories that could contain features
   */
  static findPotentialFeatureDirectories(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const srcPath = PathOperations.join(
      projectRoot,
      DIRECTORY_NAMES.SRC,
      DIRECTORY_NAMES.APP
    );

    if (!FileUtils.exists(srcPath)) {
      return [];
    }

    return this.findDirectoriesRecursively(srcPath, config);
  }

  /**
   * Find directories recursively with configuration filtering
   */
  private static findDirectoriesRecursively(
    basePath: string,
    config: RuleOfCodeConfig
  ): string[] {
    return findDirsRecursively(basePath, config);
  }

  /**
   * Check if a directory has NgRx feature indicators (RULE 2: Caching)
   */
  static hasFeatureIndicators(
    dirPath: string,
    config: RuleOfCodeConfig
  ): boolean {
    try {
      const entries = FileUtils.safeReadDirectory(dirPath, config);
      const stateFolder = NGRX_KEYWORDS.PLUS_STATE_FOLDER;
      const actionsSuffix = NGRX_KEYWORDS.ACTIONS_SUFFIX;
      const reducerSuffix = NGRX_KEYWORDS.REDUCER_SUFFIX;
      const selectorsSuffix = NGRX_KEYWORDS.SELECTORS_SUFFIX;
      const effectsSuffix = ANGULAR_CONSTANTS.EFFECTS_SUFFIX;

      // Look for +state directory
      const hasStateDir = entries.some(
        entry => entry.isDirectory() && entry.name === stateFolder
      );

      // Look for NgRx files in directory
      const hasNgRxFiles = entries.some(
        entry =>
          entry.isFile() &&
          (entry.name.includes(actionsSuffix) ||
            entry.name.includes(reducerSuffix) ||
            entry.name.includes(selectorsSuffix) ||
            entry.name.includes(effectsSuffix))
      );

      return hasStateDir || hasNgRxFiles;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Analyze feature store structure for a single feature (RULE 2: Caching)
   */
  static analyzeFeatureStructure(
    featureDir: string,
    _config: RuleOfCodeConfig
  ): {
    featureName: string;
    hasStateDir: boolean;
    stateDir: string;
    missingFiles: string[];
    optionalFiles: string[];
  } {
    const featureName = PathOperations.getBasename(featureDir);
    const stateFolder = NGRX_KEYWORDS.PLUS_STATE_FOLDER;
    const stateDir = PathOperations.join(featureDir, stateFolder);
    const hasStateDir = FileUtils.exists(stateDir);

    const requiredFiles = this.Config.getRequiredFeatureFiles(featureName);
    const optionalFiles = this.Config.getOptionalFeatureFiles(featureName);

    const missingFiles: string[] = [];
    const missingOptionalFiles: string[] = [];

    if (hasStateDir) {
      for (const fileName of requiredFiles) {
        const filePath = PathOperations.join(stateDir, fileName);
        if (!FileUtils.exists(filePath)) {
          if (optionalFiles.includes(fileName)) {
            missingOptionalFiles.push(fileName);
          } else {
            missingFiles.push(fileName);
          }
        }
      }
    }

    return {
      featureName,
      hasStateDir,
      stateDir,
      missingFiles,
      optionalFiles: missingOptionalFiles,
    };
  }
}
