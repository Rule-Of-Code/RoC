import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularValidationUtils } from '../angular-validation';
import { AngularFormValidationConfiguration } from './angular-form-validation-configuration';

/**
 * Angular Form Validation Validation Patterns
 * Specialized validation methods for form validation patterns
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated file processing
 */
export class AngularFormValidationValidationPatterns {
  private static readonly Config = AngularFormValidationConfiguration;
  /**
   * Helper: Read file with standard Angular form validation config
   * Meta-dogfooding: Eliminates duplicated FileUtils.readFile calls with same config
   */
  private static readFileWithConfig(filePath: string): string {
    return FileUtils.readFile(filePath, {
      encoding: this.Config.FILE_CONFIG.ENCODING,
      fallbackToEmpty: this.Config.FILE_CONFIG.FALLBACK_TO_EMPTY,
    });
  }

  /**
   * Process file content with standard error handling pattern
   * Meta-dogfooding: Centralizes file processing logic using our utilities
   */
  static processFileContent(
    filePath: string,
    processor: (content: string, fileName: string, filePath: string) => void
  ): void {
    const content = this.readFileWithConfig(filePath);
    if (!content) return;

    const fileName = PathOperations.getBasename(filePath);
    processor(content, fileName, filePath);
  }

  /**
   * Process template content with standard error handling pattern
   * Meta-dogfooding: Centralizes template processing logic for Angular components
   */
  static processTemplateContent(
    componentFilePath: string,
    processor: (
      templateContent: string,
      templatePath: string,
      fileName: string
    ) => void,
    fileName: string
  ): void {
    const templatePath = this.Config.getTemplatePath(componentFilePath);

    if (!FileUtils.exists(templatePath)) return;

    const templateContent = this.readFileWithConfig(templatePath);
    if (!templateContent) return;

    processor(templateContent, templatePath, fileName);
  }

  /**
   * Validate validator usage patterns
   */
  static validateValidatorUsage(
    patterns: ReturnType<
      typeof AngularFormValidationConfiguration.analyzeFormValidationPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasFormControls) return;

    const validationConfig = this.Config.buildValidationSuggestions(patterns);

    AngularValidationUtils.validateAndSuggest(
      '', // content not needed since we have patterns
      patterns.fileName,
      validationConfig,
      suggestions
    );
  }

  /**
   * Validate template validation patterns
   */
  static validateTemplateValidation(
    componentFilePath: string,
    componentPatterns: ReturnType<
      typeof AngularFormValidationConfiguration.analyzeFormValidationPatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!componentPatterns.hasFormGroup) return;

    this.processTemplateContent(
      componentFilePath,
      (templateContent, templatePath, fileName) => {
        const templatePatterns = this.Config.analyzeTemplateValidationPatterns(
          templateContent,
          templatePath
        );

        const validationConfig =
          this.Config.buildTemplateValidationSuggestions(templatePatterns);

        AngularValidationUtils.validateAndSuggest(
          templateContent,
          fileName,
          validationConfig,
          suggestions
        );

        // Critical validation violations
        if (!templatePatterns.hasErrorDisplay) {
          violations.push(
            `${this.Config.VALIDATION_MESSAGES.TEMPLATE_ERRORS_MISSING} ${fileName}`
          );
        }
      },
      componentPatterns.fileName
    );
  }

  /**
   * Master validation orchestrator for all form validation patterns
   */
  static validateAllFormValidationPatterns(
    content: string,
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const patterns = this.Config.analyzeFormValidationPatterns(
      content,
      filePath
    );

    // Validator usage validation
    this.validateValidatorUsage(patterns, suggestions);

    // Template validation
    this.validateTemplateValidation(
      filePath,
      patterns,
      violations,
      suggestions
    );
  }

  /**
   * Process component file and validate all form validation patterns
   * Meta-dogfooding: Complete file processing with centralized validation
   */
  static processComponentFile(
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.processFileContent(filePath, (content, _fileName, filePath) => {
      this.validateAllFormValidationPatterns(
        content,
        filePath,
        violations,
        suggestions
      );
    });
  }
}
