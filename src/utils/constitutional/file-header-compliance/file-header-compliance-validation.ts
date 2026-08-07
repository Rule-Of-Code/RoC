import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { FileHeaderComplianceConfiguration } from './file-header-compliance-configuration';

/**
 * FileHeaderComplianceValidation
 * Comprehensive file header compliance validation workflow for constitutional compliance
 */
export class FileHeaderComplianceValidation {
  /**
   * Execute complete file header compliance analysis workflow
   */
  static executeAnalysisWorkflow(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const directoryConfig =
      FileHeaderComplianceConfiguration.getDirectoryFilterConfig();
    const srcPath = PathOperations.join(
      projectRoot,
      directoryConfig.srcDirectory
    );

    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions };
    }

    // Get sample files for header checking
    const sampleFiles = this.getSampleFiles(srcPath);
    let filesWithoutHeaders = 0;
    let totalSampleFiles = 0;
    const exampleFiles: string[] = [];
    const analysisConfig =
      FileHeaderComplianceConfiguration.getFileHeaderAnalysisConfig();

    for (const file of sampleFiles) {
      const result = this.analyzeFileHeaderCompliance(file, projectRoot);

      if (result.success) {
        totalSampleFiles++;

        if (!result.hasHeader) {
          filesWithoutHeaders++;
          if (exampleFiles.length < analysisConfig.maxExampleFiles) {
            exampleFiles.push(result.relativePath ?? file);
          }
        }
      }
    }

    if (filesWithoutHeaders > 0) {
      const percentage = (
        (filesWithoutHeaders / totalSampleFiles) *
        100
      ).toFixed(1);
      const messages =
        FileHeaderComplianceConfiguration.getValidationMessages();
      violations.push(
        `${filesWithoutHeaders}/${totalSampleFiles} ${messages.violations.missingHeaders} (${percentage}%)`
      );

      if (exampleFiles.length > 0) {
        suggestions.push(
          `${messages.suggestions.addHeaders}: ${exampleFiles.join(', ')}`
        );
      }

      suggestions.push(messages.suggestions.includeCompliance);
    }

    return { violations, suggestions };
  }

  /**
   * Analyze individual file for header compliance
   */
  private static analyzeFileHeaderCompliance(
    file: string,
    projectRoot: string
  ): {
    success: boolean;
    hasHeader: boolean;
    relativePath?: string;
  } {
    const readingConfig =
      FileHeaderComplianceConfiguration.getFileReadingConfig();
    const content = FileUtils.readFile(file, {
      encoding: readingConfig.encoding,
      fallbackToEmpty: true,
    });

    // Empty content means file couldn't be read
    if (!content) {
      return { success: false, hasHeader: false };
    }

    const hasHeader = this.checkFileHasHeader(content);
    const relativePath = PathOperations.getRelative(projectRoot, file);

    return {
      success: true,
      hasHeader,
      relativePath,
    };
  }

  /**
   * Check if file has proper constitutional compliance header
   */
  private static checkFileHasHeader(content: string): boolean {
    const analysisConfig =
      FileHeaderComplianceConfiguration.getFileHeaderAnalysisConfig();
    const firstLines = content.split('\n').join('\n').toLowerCase();

    const headerConfig =
      FileHeaderComplianceConfiguration.getHeaderIndicatorPatterns();

    return headerConfig.patterns.some(indicator =>
      firstLines.includes(indicator)
    );
  }

  /**
   * Get sample files for header checking with depth limiting
   */
  static getSampleFiles(srcPath: string): string[] {
    const sampleFiles: string[] = [];
    const analysisConfig =
      FileHeaderComplianceConfiguration.getFileHeaderAnalysisConfig();

    this.collectSampleFiles(srcPath, sampleFiles, 0, analysisConfig);
    return sampleFiles.slice(0, analysisConfig.maxSampleFiles);
  }

  /**
   * Recursively collect sample files with configuration-based limits
   */
  private static collectSampleFiles(
    directory: string,
    files: string[],
    depth: number,
    config: ReturnType<
      typeof FileHeaderComplianceConfiguration.getFileHeaderAnalysisConfig
    >
  ): void {
    if (depth > config.maxSearchDepth || files.length > config.maxSampleFiles) {
      return;
    }

    const entries = FileSystemOperations.readDirectory(directory);

    for (const entry of entries) {
      const fullPath = PathOperations.join(directory, entry.name);

      if (
        entry.isDirectory() &&
        !FileHeaderComplianceConfiguration.shouldSkipDirectory(entry.name)
      ) {
        this.collectSampleFiles(fullPath, files, depth + 1, config);
      } else if (entry.isFile() && this.isSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  /**
   * Check if file is a source file that should have headers
   */
  static isSourceFile(fileName: string): boolean {
    const sourceConfig =
      FileHeaderComplianceConfiguration.getSourceFileConfig();

    const hasSourceExtension = sourceConfig.extensions.some(ext =>
      fileName.endsWith(ext)
    );
    const shouldSkip = sourceConfig.skipPatterns.some(pattern =>
      fileName.includes(pattern)
    );

    return hasSourceExtension && !shouldSkip;
  }
}
