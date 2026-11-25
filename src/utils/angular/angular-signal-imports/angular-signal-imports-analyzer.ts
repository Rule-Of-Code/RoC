import type { RuleOfCodeConfig } from '../../../config/types';
import { ProjectTypeDetector } from '../../config';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularSignalImportsConfiguration } from './angular-signal-imports-configuration';

/**
 * Angular Signal Imports Analyzer
 * Specialized utility for analyzing Angular Signal imports and configuration
 * Meta-dogfooding: Uses centralized Configuration and validates imports
 */
export class AngularSignalImportsAnalyzer extends AngularSignalAnalyzerBase {
  private static readonly config = AngularSignalImportsConfiguration;

  /**
   * Check for Signal imports and configuration
   */
  static checkSignalImports(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return new AngularSignalImportsAnalyzer().commonCheck(projectRoot, config);
  }

  protected getFileExtensions(): string[] {
    return [...AngularSignalImportsAnalyzer.config.FILE_EXTENSIONS];
  }

  protected analyzeFile(
    filePath: string,
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzeImportFile(filePath, projectRoot, violations, suggestions);
  }

  /**
   * Analyze single Angular file for signal imports
   */
  private analyzeImportFile(
    angularFile: string,
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(angularFile, { fallbackToEmpty: true });
    if (!content) return;

    const fileName = PathOperations.getBasename(angularFile);

    AngularSignalImportsAnalyzer.validateCoreSignalImports(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularSignalImportsAnalyzer.validateRxjsInteropImports(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularSignalImportsAnalyzer.validateImportGrouping(
      content,
      fileName,
      suggestions
    );
    AngularSignalImportsAnalyzer.validateAngularVersionCompatibility(
      content,
      fileName,
      projectRoot,
      suggestions
    );
    AngularSignalImportsAnalyzer.validateExperimentalSignals(
      content,
      fileName,
      violations,
      suggestions
    );
  }

  /**
   * Validate core signal imports
   */
  /**
   * Is `symbol` among the named specifiers of any import in this file?
   *
   * This replaces an exact-substring test for `import { signal }`, which only
   * matched an import of EXACTLY one symbol. The idiomatic
   * `import { signal, computed } from '@angular/core'` does not contain that
   * substring, so the law reported "signal used but not imported" about code
   * that imports it correctly on the very line above — and the only way to
   * silence it was to split the import badly.
   *
   * Handles grouped and multiline specifier lists, `import type`, inline
   * `type` specifiers (`import { type Signal }`, #612) and aliases
   * (`signal as sig` is an import of `signal`).
   */
  private static importsSymbol(content: string, symbol: string): boolean {
    const blocks = content.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from/g);
    for (const block of blocks) {
      const specifiers = (block[1] ?? '').split(',').map(entry =>
        entry
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          ?.trim()
      );
      if (specifiers.includes(symbol)) {
        return true;
      }
    }
    return false;
  }

  private static validateCoreSignalImports(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    for (const check of this.config.SIGNAL_CHECKS) {
      if (
        this.config.usesSymbol(content, check.usage) &&
        !this.importsSymbol(content, check.import)
      ) {
        violations.push(
          this.config.buildSignalMessage(
            this.config.VALIDATION_MESSAGES.SIGNAL_NOT_IMPORTED,
            check.function,
            fileName
          )
        );
        suggestions.push(
          this.config.buildSignalMessage(
            this.config.VALIDATION_MESSAGES.SUGGEST_IMPORT,
            check.import,
            fileName
          )
        );
      }
    }

    // Effect cleanup validation
    if (
      content.includes('effect(') &&
      content.includes(this.config.EFFECT_CLEANUP_INDICATOR)
    ) {
      if (!this.importsSymbol(content, this.config.DESTROY_REF_IMPORT)) {
        suggestions.push(
          this.config.buildFileNameMessage(
            this.config.VALIDATION_MESSAGES.DESTROY_REF_SUGGESTION,
            fileName
          )
        );
      }
    }
  }

  /**
   * Validate RxJS interop imports
   */
  private static validateRxjsInteropImports(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const hasRxjsInterop = this.config.RXJS_INTEROP_FUNCTIONS.some(fn =>
      content.includes(fn)
    );

    if (hasRxjsInterop && !content.includes(this.config.RXJS_INTEROP_PACKAGE)) {
      violations.push(
        this.config.buildFileNameMessage(
          this.config.VALIDATION_MESSAGES.RXJS_INTEROP_NOT_IMPORTED,
          fileName
        )
      );
      suggestions.push(
        this.config.buildFileNameMessage(
          this.config.VALIDATION_MESSAGES.SUGGEST_RXJS_INTEROP_IMPORT,
          fileName
        )
      );
    }
  }

  /**
   * Validate import grouping
   */
  private static validateImportGrouping(
    content: string,
    fileName: string,
    suggestions: string[]
  ): void {
    const coreImports = content.match(this.config.ANGULAR_CORE_IMPORT_REGEX);

    if (coreImports && coreImports.length > 1) {
      suggestions.push(
        this.config.buildFileNameMessage(
          this.config.VALIDATION_MESSAGES.COMBINE_IMPORTS,
          fileName
        )
      );
    }
  }

  /**
   * Validate Angular version compatibility
   */
  private static validateAngularVersionCompatibility(
    content: string,
    fileName: string,
    projectRoot: string,
    suggestions: string[]
  ): void {
    const dependencies =
      ProjectTypeDetector.getPackageDependencies(projectRoot);
    if (!dependencies) return;

    const angularVersion = dependencies['@angular/core'];
    if (!angularVersion) return;

    const hasSignals = this.config.SIGNAL_USAGE_INDICATORS.some(indicator =>
      content.includes(indicator)
    );
    const major = this.config.lowestMajorVersion(angularVersion);
    // A range we cannot read (a tag, a workspace or git reference) is not
    // judged: nothing says it is older than 16.
    const isIncompatibleVersion =
      major !== undefined && major < this.config.MIN_SIGNALS_MAJOR_VERSION;

    if (hasSignals && isIncompatibleVersion) {
      suggestions.push(
        this.config.buildVersionMessage(
          this.config.VALIDATION_MESSAGES.SIGNALS_VERSION_INCOMPATIBLE,
          angularVersion,
          fileName
        )
      );
    }
  }

  /**
   * Validate experimental signals usage
   */
  private static validateExperimentalSignals(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (content.includes(this.config.EXPERIMENTAL_PACKAGE)) {
      violations.push(
        this.config.buildFileNameMessage(
          this.config.VALIDATION_MESSAGES.EXPERIMENTAL_SIGNALS_WARNING,
          fileName
        )
      );
      suggestions.push(
        this.config.buildFileNameMessage(
          this.config.VALIDATION_MESSAGES.UPGRADE_TO_STABLE,
          fileName
        )
      );
    }
  }
}
