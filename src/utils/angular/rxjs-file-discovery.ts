import type { RuleOfCodeConfig } from '../../config/types';
import { DirectoryScanner } from '../directory-scanner';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { RxJSOperatorUsageConfiguration } from './rxjs-operator-usage';

/**
 * NgRx File Discovery Utility
 * Single Responsibility: Find and validate NgRx effects files
 *
 * Uses DirectoryScanner for file discovery (RULE 2 - dogfooded internals)
 * Adds NgRx-specific file validation on top
 */
export class RxJSFileDiscovery {
  /**
   * Find all valid NgRx files in directory
   * Uses DirectoryScanner.scanForTypeScriptFiles + NgRx validation
   */
  static findNgRxFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use DirectoryScanner utility for file discovery (dogfooded)
    const allTsFiles = DirectoryScanner.scanForTypeScriptFiles(
      projectRoot,
      config,
      false // exclude test files
    );

    // Filter to NgRx effects files using Configuration patterns
    return allTsFiles.filter(file => this.isValidNgRxFile(file));
  }

  /** Check if file is valid NgRx effects file */
  private static isValidNgRxFile(fullPath: string): boolean {
    // Use PathOperations utility instead of hardcoded split
    // getFilename keeps the extension — getBasename strips ".ts" to "x.effects",
    // which then fails the ".effects." suffix match and finds zero effects files.
    const fileName = PathOperations.getFilename(fullPath);

    // Check filename pattern
    if (!RxJSOperatorUsageConfiguration.isNgRxEffectsFile(fileName)) {
      return false;
    }

    // Check content for NgRx patterns
    const readingConfig = RxJSOperatorUsageConfiguration.FILE_READING_CONFIG;
    const content = FileUtils.readFile(fullPath, {
      encoding: readingConfig.encoding as BufferEncoding,
      fallbackToEmpty: true,
    });

    if (!content) return false;

    const patterns = RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS;
    return patterns.requiredContent.some((pattern: string) =>
      content.includes(pattern)
    );
  }
}
