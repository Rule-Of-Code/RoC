import type { RuleOfCodeConfig } from '../../types/law.types';
import { CheckerUtils } from '../checker-utils';
import { FileUtils } from '../file-utils';

/**
 * Base class for security validation patterns
 * Consolidates common file scanning and result mapping patterns
 * Used for encryption, environment variables, and similar security analyzers
 */
export abstract class SecurityValidationPatternBase {
  /**
   * RULE 2: Generic file scanning and results mapping helper
   * Eliminates duplicate pattern across 2+ security validation checkers
   * Returns array of results from file-by-file analysis
   */
  protected static scanFilesWithAnalyzer<
    T extends { violations: string[]; suggestions: string[] },
  >(
    projectRoot: string,
    config: RuleOfCodeConfig,
    analyzer: (file: string, content: string) => T,
    createEmptyResult: () => T
  ): T[] {
    const files = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().ALL_CODE,
      config
    );

    return files.map(file => {
      const content = this.safeReadFile(file);
      if (!content) return createEmptyResult();
      return analyzer(file, content);
    });
  }

  /**
   * Safe file read operation
   * Returns null if file cannot be read
   */
  protected static safeReadFile(filePath: string): string | null {
    try {
      return FileUtils.readFile(filePath, { encoding: 'utf-8' });
    } catch (_error) {
      return null;
    }
  }
}
