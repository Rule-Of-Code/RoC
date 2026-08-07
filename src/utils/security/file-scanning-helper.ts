/**
 * File Scanning Helper for Security Validations
 * Consolidates the file scanning pattern used by encryption and environment validators
 * Eliminates 12-line duplicate across multiple security validation modules
 */

import type { RuleOfCodeConfig } from '../../types/law.types';
import { CheckerUtils } from '../checker-utils';

/**
 * Generic file scanning helper for security validation patterns
 * Scans project files and applies analyzer callback to each
 * @param projectRoot - Project root directory
 * @param config - RuleOfCode configuration
 * @param analyzer - Callback to analyze each file (receives file path and content)
 * @param createEmptyResult - Callback to create empty result
 * @returns Array of analysis results from all files
 */
export function scanAndAnalyzeFiles<T>(
  projectRoot: string,
  config: RuleOfCodeConfig,
  analyzer: (file: string, content: string) => T,
  createEmptyResult: () => T,
  safeReadFile: (filePath: string) => string | null
): T[] {
  const files = CheckerUtils.findFilesByExtension(
    projectRoot,
    CheckerUtils.getCommonExtensions().ALL_CODE,
    config
  );

  return files.map(file => {
    const content = safeReadFile(file);
    if (!content) return createEmptyResult();
    return analyzer(file, content);
  });
}
