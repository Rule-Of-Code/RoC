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
import { findDirectoriesRecursively } from '../recursive-directory-finder';

/**
 * Interface for file entries returned by DirectoryScanner
 */
export interface FileEntry {
  isFile: () => boolean;
  name: string;
}

/**
 * Configuration utility for NgRx File Organization Analysis
 * Centralizes file organization patterns, naming conventions, and validation logic
 */
export class NgRxFileOrganizationConfiguration {
  private static readonly Config = NgRxFileOrganizationConfiguration;

  /**
   * Valid NgRx file suffixes for naming convention validation (RULE 1: 100% internal coverage)
   */
  static readonly VALID_NGRX_SUFFIXES = [
    FILE_EXTENSIONS.ACTIONS_TS,
    FILE_EXTENSIONS.REDUCER_TS,
    FILE_EXTENSIONS.SELECTORS_TS,
    FILE_EXTENSIONS.EFFECTS_TS,
    FILE_EXTENSIONS.MODELS_TS,
    FILE_EXTENSIONS.FACADE_TS,
    FILE_EXTENSIONS.STATE_TS,
  ] as readonly string[];

  /**
   * Test file extensions for testing validation (RULE 1: 100% internal coverage)
   */
  static readonly TEST_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.SPEC_TS,
    FILE_EXTENSIONS.TEST_TS,
  ] as readonly string[];

  /**
   * NgRx file organization validation messages (RULE 1: 100% internal coverage)
   */
  static readonly VALIDATION_MESSAGES_CONFIG = {
    MISSING_BARREL_EXPORT: 'Missing index.ts barrel export in {0}/+state/',
    CREATE_BARREL_EXPORT:
      'Create index.ts to export public API from {0}/+state/',
    IMPROPER_FILE_NAMING:
      'Consider using standard NgRx file naming for {0} in {1}/+state/',
    MISSING_FEATURE_PREFIX:
      "File {0} should start with feature name '{1}' in {1}/+state/",
    CONSIDER_TEST_FILES: 'Consider adding test files to {0}/+state/ directory',
    MULTIPLE_ACTION_FILES:
      'Multiple action files found in {0}/+state/, consider consolidating',
    MULTIPLE_REDUCER_FILES:
      'Multiple reducer files found in {0}/+state/, consider consolidating',
    MULTIPLE_SELECTOR_FILES:
      'Multiple selector files found in {0}/+state/, consider consolidating',
  } as const;

  /**
   * Get valid NgRx file suffixes for naming convention validation (RULE 2: Caching)
   */
  static getValidNgRxFileSuffixes(): readonly string[] {
    return this.Config.VALID_NGRX_SUFFIXES;
  }

  /**
   * Get test file extensions for testing validation (RULE 2: Caching)
   */
  static getTestFileExtensions(): readonly string[] {
    return this.Config.TEST_FILE_EXTENSIONS;
  }

  /**
   * Get NgRx file organization validation messages (RULE 2: Caching)
   */
  static getValidationMessages(): {
    MISSING_BARREL_EXPORT: (featureName: string) => string;
    CREATE_BARREL_EXPORT: (featureName: string) => string;
    IMPROPER_FILE_NAMING: (fileName: string, featureName: string) => string;
    MISSING_FEATURE_PREFIX: (fileName: string, featureName: string) => string;
    CONSIDER_TEST_FILES: (featureName: string) => string;
    MULTIPLE_ACTION_FILES: (featureName: string) => string;
    MULTIPLE_REDUCER_FILES: (featureName: string) => string;
    MULTIPLE_SELECTOR_FILES: (featureName: string) => string;
  } {
    const messages = this.Config.VALIDATION_MESSAGES_CONFIG;
    return {
      MISSING_BARREL_EXPORT: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MISSING_BARREL_EXPORT,
          featureName
        ),
      CREATE_BARREL_EXPORT: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.CREATE_BARREL_EXPORT,
          featureName
        ),
      IMPROPER_FILE_NAMING: (fileName: string, featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.IMPROPER_FILE_NAMING,
          fileName,
          featureName
        ),
      MISSING_FEATURE_PREFIX: (fileName: string, featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MISSING_FEATURE_PREFIX,
          fileName,
          featureName
        ),
      CONSIDER_TEST_FILES: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.CONSIDER_TEST_FILES,
          featureName
        ),
      MULTIPLE_ACTION_FILES: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MULTIPLE_ACTION_FILES,
          featureName
        ),
      MULTIPLE_REDUCER_FILES: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MULTIPLE_REDUCER_FILES,
          featureName
        ),
      MULTIPLE_SELECTOR_FILES: (featureName: string) =>
        StringTemplateUtils.formatTemplate(
          messages.MULTIPLE_SELECTOR_FILES,
          featureName
        ),
    };
  }

  /**
   * Find all +state directories in the project
   */
  static findStateDirectories(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return [];
    }

    return this.findStateDirectoriesRecursively(srcPath, config);
  }

  /**
   * Recursively find +state directories
   */
  private static findStateDirectoriesRecursively(
    basePath: string,
    config: RuleOfCodeConfig
  ): string[] {
    return findDirectoriesRecursively(
      basePath,
      config,
      dirName => dirName === NGRX_KEYWORDS.STATE_FOLDER
    );
  }

  /**
   * Extract feature name from state directory path
   */
  static extractFeatureName(stateDir: string): string {
    return PathOperations.getBasename(PathOperations.getDirectory(stateDir));
  }

  /**
   * Check if a file has a valid NgRx suffix (RULE 2: Caching)
   */
  static hasValidNgRxSuffix(fileName: string): boolean {
    const validSuffixes = this.Config.VALID_NGRX_SUFFIXES;
    return validSuffixes.some(suffix => fileName.endsWith(suffix));
  }

  /**
   * Check if a file should have the feature name prefix
   */
  static shouldHaveFeaturePrefix(fileName: string): boolean {
    return fileName !== ANGULAR_CONSTANTS.INDEX_TS;
  }

  /**
   * Check if files contain test files (RULE 2: Caching)
   */
  static hasTestFiles(files: FileEntry[]): boolean {
    const testExtensions = this.Config.TEST_FILE_EXTENSIONS;
    return files.some(file =>
      testExtensions.some(ext => file.name.includes(ext))
    );
  }

  /**
   * Filter files by NgRx type
   */
  static filterFilesByType(files: FileEntry[], ngRxType: string): FileEntry[] {
    return files.filter(file => file.name.includes(ngRxType));
  }

  /**
   * Get TypeScript files excluding index.ts (RULE 2: Caching)
   */
  static getTypeScriptFiles(files: FileEntry[]): FileEntry[] {
    const typeScriptExt = FILE_EXTENSIONS.TYPESCRIPT;
    const indexFile = ANGULAR_CONSTANTS.INDEX_TS;
    return files.filter(
      file =>
        file.isFile() &&
        file.name.endsWith(typeScriptExt) &&
        file.name !== indexFile
    );
  }

  /**
   * Check if barrel export file exists (RULE 2: Caching)
   */
  static hasBarrelExport(files: FileEntry[]): boolean {
    const indexFile = ANGULAR_CONSTANTS.INDEX_TS;
    return files.some(file => file.isFile() && file.name === indexFile);
  }

  /**
   * Analyze file organization for a single state directory
   */
  static analyzeStateDirectoryStructure(
    stateDir: string,
    files: FileEntry[]
  ): {
    featureName: string;
    hasBarrelExport: boolean;
    typeScriptFiles: FileEntry[];
    hasTestFiles: boolean;
    actionFiles: FileEntry[];
    reducerFiles: FileEntry[];
    selectorFiles: FileEntry[];
  } {
    const featureName = this.extractFeatureName(stateDir);
    const hasBarrelExport = this.hasBarrelExport(files);
    const typeScriptFiles = this.getTypeScriptFiles(files);
    const hasTestFiles = this.hasTestFiles(files);
    const actionFiles = this.filterFilesByType(
      files,
      NGRX_KEYWORDS.ACTIONS_SUFFIX
    );
    const reducerFiles = this.filterFilesByType(
      files,
      NGRX_KEYWORDS.REDUCER_SUFFIX
    );
    const selectorFiles = this.filterFilesByType(
      files,
      NGRX_KEYWORDS.SELECTORS_SUFFIX
    );

    return {
      featureName,
      hasBarrelExport,
      typeScriptFiles,
      hasTestFiles,
      actionFiles,
      reducerFiles,
      selectorFiles,
    };
  }
}
