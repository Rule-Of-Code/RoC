/**
 * NgRx State Normalization File Discovery Constants
 * Defines which files to analyze and what extensions are expected
 */

import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';

export class NgRxStateNormalizationFileDiscoveryConstants {
  /**
   * The directories in which we search for state files
   */
  static readonly SCAN_DIRECTORIES = ['src', 'apps'];

  /**
   * Regular expressions for finding state files
   */
  static readonly STATE_FILE_PATTERNS = {
    REDUCER: /\.(reducer|state)\.ts$/i,
    SELECTOR: /\.selectors?\.ts$/i,
    ACTIONS: /\.actions\.ts$/i,
  };

  /**
   * Extensions that should be included in the search
   */
  static readonly TYPESCRIPT_EXTENSIONS = ['ts', 'tsx'];

  /**
   * Directories that should be skipped during the search
   */
  static readonly EXCLUSION_PATTERNS = [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.angular',
    '.cache',
    'tmp',
  ];

  /**
   * Checks whether the file's extension is TypeScript
   */
  static isTypeScriptFile(filename: string): boolean {
    const ext = PathOperations.getExtension(filename).toLowerCase();
    return this.TYPESCRIPT_EXTENSIONS.includes(ext.replace('.', ''));
  }

  /**
   * Checks whether the file is a state/reducer file
   */
  static isStateFile(filename: string): boolean {
    return this.STATE_FILE_PATTERNS.REDUCER.test(filename);
  }

  /**
   * Checks whether the file is a selector file
   */
  static isSelectorFile(filename: string): boolean {
    return this.STATE_FILE_PATTERNS.SELECTOR.test(filename);
  }

  /**
   * Checks whether the file is an actions file
   */
  static isActionsFile(filename: string): boolean {
    return this.STATE_FILE_PATTERNS.ACTIONS.test(filename);
  }

  /**
   * Checks whether the directory should be skipped
   */
  static shouldExcludeDirectory(dirPath: string): boolean {
    const dirname = PathOperations.getBasename(dirPath);
    return this.EXCLUSION_PATTERNS.some(pattern => dirname.includes(pattern));
  }

  /**
   * Returns the directories to scan within the project root
   */
  static getScanDirectories(projectRoot: string): string[] {
    return this.SCAN_DIRECTORIES.map(dir =>
      PathOperations.join(projectRoot, dir)
    ).filter(dir => FileUtils.exists(dir));
  }

  /**
   * Gets the path to package.json
   */
  static getPackageJsonPath(projectRoot: string): string {
    return PathOperations.join(projectRoot, 'package.json');
  }
}
