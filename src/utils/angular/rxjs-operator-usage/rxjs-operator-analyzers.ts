import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { RxJSOperatorUsageConfiguration } from './rxjs-operator-usage-configuration';

/** Common analysis result type */
export interface AnalysisResult {
  violations: string[];
  suggestions: string[];
}

/** Validation messages type - use the constant type */
type ValidationMessages =
  typeof RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES;

/** File data from reading */
interface FileData {
  content: string;
  fileName: string;
}

/**
 * Base Operator Analyzer
 * Single Responsibility: Common file reading and analysis loop
 * RULE 2: Eliminates duplicated loop pattern across all analyzers
 */
abstract class BaseOperatorAnalyzer {
  /** Read file with configuration */
  protected static readFile(filePath: string): FileData | null {
    const cfg = RxJSOperatorUsageConfiguration.FILE_READING_CONFIG;
    const content = FileUtils.readFile(filePath, {
      encoding: cfg.encoding as BufferEncoding,
      fallbackToEmpty: true,
    });
    if (!content) return null;
    return { content, fileName: PathOperations.getBasename(filePath) };
  }

  /** Empty result helper */
  protected static emptyResult(): AnalysisResult {
    return { violations: [], suggestions: [] };
  }

  /** Initialize analysis: read file and return violations/suggestions containers */
  protected static initializeFileAnalysis(file: string): {
    fileData: FileData | null;
    violations: string[];
    suggestions: string[];
  } {
    const fileData = this.readFile(file);
    if (!fileData) {
      return {
        fileData: null,
        violations: [],
        suggestions: [],
      };
    }

    return {
      fileData,
      violations: [],
      suggestions: [],
    };
  }

  /** Extract file data for analysis with common early return pattern */
  protected static extractFileDataForAnalysis(file: string): {
    content: string;
    fileName: string;
    violations: string[];
    suggestions: string[];
  } | null {
    const init = this.initializeFileAnalysis(file);
    if (!init.fileData) return null;

    const { content, fileName } = init.fileData;
    return {
      content,
      fileName,
      violations: init.violations,
      suggestions: init.suggestions,
    };
  }

  /** Check if content contains operator call pattern: `operatorName(` */
  protected static hasOperatorCall(content: string, operator: string): boolean {
    return content.includes(`${operator}(`);
  }

  /**
   * Generic file analysis loop - eliminates duplicated for-loop pattern
   * Each analyzer provides getConfig and analyzeFile implementations
   */
  protected static analyzeFilesWithConfig<TConfig>(
    files: string[],
    getConfig: () => TConfig,
    analyzeFile: (
      file: string,
      config: TConfig,
      messages: ValidationMessages
    ) => AnalysisResult
  ): AnalysisResult {
    const config = getConfig();
    const messages = RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES;
    const violations: string[] = [];
    const suggestions: string[] = [];

    for (const file of files) {
      const result = analyzeFile(file, config, messages);
      violations.push(...result.violations);
      suggestions.push(...result.suggestions);
    }

    return { violations, suggestions };
  }
}

/**
 * Flattening Operators Analyzer
 * Single Responsibility: Analyze switchMap, mergeMap, exhaustMap usage
 */
export class FlatteningOperatorAnalyzer extends BaseOperatorAnalyzer {
  static analyze(files: string[]): AnalysisResult {
    return this.analyzeFilesWithConfig(
      files,
      () => RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG,
      (file, config, messages) => this.analyzeFile(file, config, messages)
    );
  }

  private static analyzeFile(
    file: string,
    config: typeof RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG,
    messages: ValidationMessages
  ): AnalysisResult {
    const data = this.extractFileDataForAnalysis(file);
    if (!data) return this.emptyResult();

    const { content, fileName, violations, suggestions } = data;

    // Operators array is guaranteed to have 4 elements from FLATTENING_OPERATORS_CONFIG
    const switchMapOp = config.operators[0];
    const exhaustMapOp = config.operators[3];

    // Check switchMap without error handling
    if (
      content.includes(switchMapOp) &&
      !config.errorHandlingRequired.some((h: string) => content.includes(h))
    ) {
      violations.push(
        RxJSOperatorUsageConfiguration.buildMessage(
          messages.SWITCH_MAP_WITHOUT_ERROR_HANDLING,
          fileName
        )
      );
      suggestions.push(
        RxJSOperatorUsageConfiguration.buildMessage(
          messages.ADD_ERROR_HANDLING,
          switchMapOp
        )
      );
    }

    // Check HTTP operations
    const hasHttp = config.httpOperations.some((op: string) =>
      content.includes(op)
    );
    if (
      hasHttp &&
      content.includes(switchMapOp) &&
      !content.includes(exhaustMapOp)
    ) {
      const httpOp = this.identifyHttpOperation(
        content,
        config.httpOperations,
        config.recommendations
      );
      if (httpOp)
        suggestions.push(
          RxJSOperatorUsageConfiguration.buildMessage(
            messages.RECOMMEND_EXHAUST_MAP,
            httpOp
          )
        );
    }

    // map() that returns an Observable (service/HTTP call) — should be a
    // flattening operator. Conservative regex (async-looking method only).
    if (RxJSOperatorUsageConfiguration.MAP_RETURNS_OBSERVABLE_PATTERN.test(content)) {
      violations.push(
        RxJSOperatorUsageConfiguration.buildMessage(
          messages.MAP_RETURNS_OBSERVABLE,
          fileName
        )
      );
      suggestions.push(
        RxJSOperatorUsageConfiguration.buildMessage(
          messages.USE_FLATTENING_OPERATOR,
          fileName
        )
      );
    }

    return { violations, suggestions };
  }

  /** Identify HTTP operation type using Configuration recommendations */
  private static identifyHttpOperation(
    content: string,
    ops: readonly string[],
    recommendations: Readonly<Record<string, string>>
  ): string | null {
    const op = ops.find(o => content.includes(o));
    if (!op) return null;

    // Use recommendations keys (POST, PUT, DELETE) from Configuration
    // Note: This path is rarely taken as operator names typically don't contain HTTP method names
    const httpMethods = Object.keys(recommendations);
    /* istanbul ignore next - operator names rarely contain HTTP methods */
    return (
      httpMethods.find(method =>
        op.toLowerCase().includes(method.toLowerCase())
      ) ?? null
    );
  }
}

/**
 * Deprecated Operators Analyzer
 * Single Responsibility: Detect deprecated RxJS operators
 */
export class DeprecatedOperatorAnalyzer extends BaseOperatorAnalyzer {
  static analyze(files: string[]): AnalysisResult {
    return this.analyzeFilesWithConfig(
      files,
      () => RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING,
      (file, mapping, messages) => this.analyzeFile(file, mapping, messages)
    );
  }

  private static analyzeFile(
    file: string,
    mapping: typeof RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING,
    messages: ValidationMessages
  ): AnalysisResult {
    const data = this.extractFileDataForAnalysis(file);
    if (!data) return this.emptyResult();

    const { content, fileName, violations, suggestions } = data;

    for (const [deprecated, replacement] of Object.entries(
      mapping.deprecated
    )) {
      if (this.hasOperatorCall(content, deprecated)) {
        violations.push(
          RxJSOperatorUsageConfiguration.buildMessage(
            messages.DEPRECATED_OPERATOR_FOUND,
            deprecated,
            fileName
          )
        );
        suggestions.push(
          RxJSOperatorUsageConfiguration.buildMessage(
            messages.REPLACE_DEPRECATED,
            deprecated,
            replacement
          )
        );
      }
    }

    return { violations, suggestions };
  }
}

/**
 * Transformation Operators Analyzer
 * Single Responsibility: Analyze map, filter, tap usage patterns
 */
export class TransformationOperatorAnalyzer extends BaseOperatorAnalyzer {
  static analyze(files: string[]): AnalysisResult {
    return this.analyzeFilesWithConfig(
      files,
      () => RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG,
      (file, config, messages) => this.analyzeFile(file, config, messages)
    );
  }

  private static analyzeFile(
    file: string,
    config: typeof RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG,
    messages: ValidationMessages
  ): AnalysisResult {
    const data = this.extractFileDataForAnalysis(file);
    if (!data) return this.emptyResult();

    const { content, fileName, violations, suggestions } = data;

    // Operators outside pipe
    for (const operator of config.operators) {
      if (
        this.hasOperatorCall(content, operator) &&
        !content.includes(config.pipeSyntax)
      ) {
        violations.push(
          RxJSOperatorUsageConfiguration.buildMessage(
            messages.OPERATOR_OUTSIDE_PIPE,
            operator,
            fileName
          )
        );
        suggestions.push(messages.USE_PIPE_METHOD);
      }
    }

    // Deprecated transformation operators
    for (const deprecated of config.deprecatedOperators) {
      if (this.hasOperatorCall(content, deprecated)) {
        suggestions.push(messages.DEPRECATED_PLUCK_USAGE);
      }
    }

    return { violations, suggestions };
  }
}
