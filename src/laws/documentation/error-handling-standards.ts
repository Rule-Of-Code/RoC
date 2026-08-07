import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PathResolver } from '../../utils/path-resolver';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
/**
 * Error Handling Standards Law
 *
 * Comprehensive error handling implementation that checks for:
 * - Proper try-catch block usage
 * - Error logging and monitoring
 * - User-friendly error messages
 * - Error boundary implementations (Angular)
 * - HTTP error handling patterns
 * - Observable error handling
 * - Global error handlers
 *
 * Professional implementation following error handling best practices
 */
export class ErrorHandlingStandardsLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for proper try-catch usage
    const tryCatchAnalysis = this.analyzeTryCatchUsage(projectRoot);
    if (tryCatchAnalysis.missingTryCatchInCriticalAreas > 0) {
      violations.push(
        `${tryCatchAnalysis.missingTryCatchInCriticalAreas} critical areas missing try-catch blocks`
      );
      suggestions.push(
        'Add try-catch blocks around async operations and external calls'
      );
      score -= 25;
    }

    // 2. Check for error logging
    const loggingAnalysis = this.analyzeErrorLogging(projectRoot);
    if (!loggingAnalysis.hasProperLogging) {
      violations.push('Missing proper error logging implementation');
      suggestions.push(
        'Implement comprehensive error logging with appropriate log levels'
      );
      score -= 20;
    }

    // 3. Check for user-friendly error messages
    const errorMessagesAnalysis = this.analyzeErrorMessages(projectRoot);
    if (!errorMessagesAnalysis.hasUserFriendlyMessages) {
      violations.push('Error messages are not user-friendly');
      suggestions.push(
        'Replace technical error messages with user-friendly alternatives'
      );
      score -= 20;
    }

    // 4. Check for HTTP error handling
    const httpErrorHandling = this.analyzeHttpErrorHandling(projectRoot);
    if (!httpErrorHandling.hasProperHttpErrorHandling) {
      violations.push('HTTP requests missing proper error handling');
      suggestions.push(
        'Implement HTTP error interceptors and proper error responses'
      );
      score -= 20;
    }

    // 5. Check for Observable error handling (RxJS)
    const observableErrorHandling =
      this.analyzeObservableErrorHandling(projectRoot);
    if (!observableErrorHandling.hasProperObservableErrorHandling) {
      violations.push('Observables missing proper error handling');
      suggestions.push(
        'Use catchError operator and proper error handling in subscriptions'
      );
      score -= 15;
    }

    // 6. Check for global error handlers (suggestions only, not violations)
    const globalErrorHandling = await this.analyzeGlobalErrorHandling(
      projectRoot,
      context.config
    );
    if (!globalErrorHandling.hasGlobalErrorHandling) {
      suggestions.push(
        'Consider implementing global error handlers for unhandled errors'
      );
      // Optional enhancement - don't penalize score for suggestions
    }

    // 7. Check for error boundaries (Angular, suggestions only, not violations)
    const errorBoundariesAnalysis = this.analyzeErrorBoundaries(projectRoot);
    if (!errorBoundariesAnalysis.hasErrorBoundaries) {
      suggestions.push(
        'Consider implementing error boundaries for better error containment'
      );
      // Optional enhancement - don't penalize score for suggestions
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        tryCatchAnalysis,
        loggingAnalysis
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static analyzeTryCatchUsage(projectRoot: string): {
    missingTryCatchInCriticalAreas: number;
    totalSourceFiles: number;
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);
    let missingTryCatchInCriticalAreas = 0;

    for (const sourceFile of sourceFiles) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });

        if (this.hasCriticalOperationsWithoutTryCatch(content)) {
          missingTryCatchInCriticalAreas++;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      missingTryCatchInCriticalAreas,
      totalSourceFiles: sourceFiles.length,
    };
  }

  private static analyzeErrorLogging(projectRoot: string): {
    hasProperLogging: boolean;
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);
    let filesWithLogging = 0;
    let totalFilesWithErrors = 0;

    for (const sourceFile of sourceFiles) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });

        if (this.hasErrorHandling(content)) {
          totalFilesWithErrors++;
          if (this.hasProperErrorLogging(content)) {
            filesWithLogging++;
          }
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasProperLogging:
        totalFilesWithErrors === 0 ||
        filesWithLogging / totalFilesWithErrors >= 0.7,
    };
  }

  private static analyzeErrorMessages(projectRoot: string): {
    hasUserFriendlyMessages: boolean;
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);
    let hasUserFriendlyMessages = true;

    for (const sourceFile of sourceFiles) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });

        if (this.hasTechnicalErrorMessages(content)) {
          hasUserFriendlyMessages = false;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasUserFriendlyMessages };
  }

  private static analyzeHttpErrorHandling(projectRoot: string): {
    hasProperHttpErrorHandling: boolean;
  } {
    // First check if there's a global HTTP error interceptor
    const hasErrorInterceptor = this.hasHttpErrorInterceptor(projectRoot);
    if (hasErrorInterceptor) {
      return { hasProperHttpErrorHandling: true };
    }

    // If no interceptor, check individual HTTP calls for error handling
    const jsCalls = this.scanJsHttpCalls(projectRoot);
    if (jsCalls.unguarded) {
      return { hasProperHttpErrorHandling: false };
    }
    if (jsCalls.guarded) {
      return { hasProperHttpErrorHandling: true };
    }

    // No axios/fetch/HttpClient call anywhere. On a Python project the outbound
    // calls live in the .py sources: `urlopen`/`requests`/`httpx`/`aiohttp`
    // wrapped in try/except satisfy this concern the Python way — and a project
    // that makes no outbound call at all has nothing to guard (N/A, never a
    // violation). Non-Python projects keep the previous verdict: false.
    return {
      hasProperHttpErrorHandling: this.hasPythonHttpErrorHandling(projectRoot),
    };
  }

  /**
   * The JS/TS verdict, unchanged: any file with an unguarded HTTP call fails the
   * concern outright; otherwise a file with a guarded call satisfies it.
   */
  private static scanJsHttpCalls(projectRoot: string): {
    guarded: boolean;
    unguarded: boolean;
  } {
    let guarded = false;

    for (const sourceFile of this.findSourceFiles(projectRoot)) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });

        if (this.hasHttpCallsWithProperErrorHandling(content)) {
          guarded = true;
        } else if (this.hasHttpCallsWithoutErrorHandling(content)) {
          return { guarded, unguarded: true };
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { guarded, unguarded: false };
  }

  private static hasPythonHttpErrorHandling(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasGuardedHttpCalls(projectRoot)
    );
  }

  private static analyzeObservableErrorHandling(projectRoot: string): {
    hasProperObservableErrorHandling: boolean;
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);
    let hasProperObservableErrorHandling = true;

    for (const sourceFile of sourceFiles) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });

        if (this.hasObservablesWithoutErrorHandling(content)) {
          hasProperObservableErrorHandling = false;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasProperObservableErrorHandling };
  }

  private static async analyzeGlobalErrorHandling(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    hasGlobalErrorHandling: boolean;
  }> {
    const globalErrorHandlerFiles = await this.buildGlobalErrorHandlerPaths(
      projectRoot,
      config
    );

    // Check if any global error handler file exists
    if (this.hasErrorHandlerFile(globalErrorHandlerFiles)) {
      return { hasGlobalErrorHandling: true };
    }

    // Check for Angular global error handler in source files
    const hasAngularErrorHandler = this.checkAngularErrorHandler(projectRoot);
    return { hasGlobalErrorHandling: hasAngularErrorHandler };
  }

  private static async buildGlobalErrorHandlerPaths(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    const basePaths = [
      PathOperations.join(projectRoot, 'src/app/core/error-handler.ts'),
      PathOperations.join(projectRoot, 'src/error-handler.ts'),
      PathOperations.join(projectRoot, 'src/app/shared/error-handler.ts'),
    ];

    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const srcRootPaths = await resolver.getSrcRootPaths();
      for (const srcRoot of srcRootPaths) {
        basePaths.push(
          PathOperations.join(srcRoot, 'app/core/error-handler.ts')
        );
      }
      return basePaths;
    }

    return [
      ...basePaths,
      PathOperations.join(projectRoot, 'apps/*/src/app/core/error-handler.ts'),
    ];
  }

  private static hasErrorHandlerFile(filePaths: string[]): boolean {
    return filePaths.some(filePath => FileUtils.exists(filePath));
  }

  private static checkAngularErrorHandler(projectRoot: string): boolean {
    const sourceFiles = this.findSourceFiles(projectRoot);
    for (const sourceFile of sourceFiles) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });
        if (
          content.includes('ErrorHandler') ||
          content.includes('GlobalErrorHandler')
        ) {
          return true;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }
    return false;
  }

  private static analyzeErrorBoundaries(projectRoot: string): {
    hasErrorBoundaries: boolean;
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);
    let hasErrorBoundaries = false;

    for (const sourceFile of sourceFiles) {
      try {
        const content = FileUtils.readFile(sourceFile, { encoding: 'utf8' });
        if (this.hasErrorBoundaryPatterns(content)) {
          hasErrorBoundaries = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasErrorBoundaries };
  }

  private static hasCriticalOperationsWithoutTryCatch(
    content: string
  ): boolean {
    // Look for critical operations that should be wrapped in try-catch
    const criticalOperations = [
      /JSON\.parse\(/, // JSON parsing
      /localStorage\./, // Local storage operations
      /sessionStorage\./, // Session storage operations
      /fetch\(/, // Fetch API calls
      /\.subscribe\(/, // RxJS subscriptions
      /await\s+\w/, // Async/await operations
    ];

    const hasCriticalOp = criticalOperations.some(pattern =>
      pattern.test(content)
    );
    const hasTryCatch = /try\s*\{/.test(content);

    return hasCriticalOp && !hasTryCatch;
  }

  private static hasErrorHandling(content: string): boolean {
    const errorHandlingPatterns = [
      /try\s*\{/, // Try blocks
      /catch\s*\(/, // Catch blocks
      /\.catch\(/, // Promise catch
      /catchError/, // RxJS catchError
      /throw\s+/, // Throwing errors
    ];

    return errorHandlingPatterns.some(pattern => pattern.test(content));
  }

  private static hasProperErrorLogging(content: string): boolean {
    const loggingPatterns = [
      /console\.error/, // Console error logging
      /logger\.error/, // Logger error
      /log\.error/, // Log error
      /\.error\(/, // Generic error method
      /logError/, // Error logging function
    ];

    return loggingPatterns.some(pattern => pattern.test(content));
  }

  private static hasTechnicalErrorMessages(content: string): boolean {
    // Look for technical error messages that should be user-friendly
    const technicalMessages = [
      /throw\s+new\s+Error\(['"][A-Z_]+['"]/, // Technical error codes
      /error\s*:\s*['"][a-z_]+['"]/, // Technical error keys
      /status\s*:\s*\d{3}/, // HTTP status codes shown to users
    ];

    return technicalMessages.some(pattern => pattern.test(content));
  }

  private static hasHttpCallsWithProperErrorHandling(content: string): boolean {
    const hasHttpCalls = /http\.|HttpClient|fetch\(/.test(content);
    const hasErrorHandling = /\.catch\(|catchError|\.subscribe\(.*error/.test(
      content
    );

    return hasHttpCalls && hasErrorHandling;
  }

  private static hasHttpCallsWithoutErrorHandling(content: string): boolean {
    const hasHttpCalls = /http\.|HttpClient|fetch\(/.test(content);
    const hasErrorHandling = /\.catch\(|catchError|\.subscribe\(.*error/.test(
      content
    );

    return hasHttpCalls && !hasErrorHandling;
  }

  private static hasObservablesWithoutErrorHandling(content: string): boolean {
    const hasObservables = /\.subscribe\(|Observable|Subject/.test(content);
    const hasErrorHandling =
      /catchError|\.subscribe\(.*,.*error|error\s*:/s.test(content);

    return hasObservables && !hasErrorHandling;
  }

  private static hasErrorBoundaryPatterns(content: string): boolean {
    const errorBoundaryPatterns = [
      /ErrorHandler/, // Angular Error Handler
      /componentDidCatch/, // React error boundary (if React is used)
      /error-boundary/, // Error boundary component
      /GlobalErrorHandler/, // Global error handler
    ];

    return errorBoundaryPatterns.some(pattern => pattern.test(content));
  }

  private static hasHttpErrorInterceptor(projectRoot: string): boolean {
    const interceptorFiles = this.getInterceptorFilePaths(projectRoot);
    if (this.hasValidErrorInterceptorFile(interceptorFiles)) {
      return true;
    }

    const configFiles = this.getConfigFilePaths(projectRoot);
    return this.hasRegisteredErrorInterceptor(configFiles);
  }

  private static getInterceptorFilePaths(projectRoot: string): string[] {
    return [
      PathOperations.join(
        projectRoot,
        'libs/shared/data-access/src/lib/interceptors/error-handler.interceptor.ts'
      ),
      PathOperations.join(
        projectRoot,
        'libs/shared/src/lib/interceptors/error-handler.interceptor.ts'
      ),
      PathOperations.join(
        projectRoot,
        'src/app/interceptors/error-handler.interceptor.ts'
      ),
      PathOperations.join(
        projectRoot,
        'src/interceptors/error-handler.interceptor.ts'
      ),
      PathOperations.join(
        projectRoot,
        'libs/shared/data-access/src/lib/interceptors/error.interceptor.ts'
      ),
      PathOperations.join(
        projectRoot,
        'src/app/interceptors/error.interceptor.ts'
      ),
    ];
  }

  private static getConfigFilePaths(projectRoot: string): string[] {
    return [
      PathOperations.join(projectRoot, 'apps/client-app/src/app/app.config.ts'),
      PathOperations.join(projectRoot, 'apps/master-app/src/app/app.config.ts'),
      PathOperations.join(projectRoot, 'apps/admin-web/src/app/app.config.ts'),
      PathOperations.join(projectRoot, 'src/app/app.config.ts'),
    ];
  }

  private static hasValidErrorInterceptorFile(filePaths: string[]): boolean {
    for (const filePath of filePaths) {
      if (
        FileUtils.exists(filePath) &&
        this.isValidErrorInterceptor(filePath)
      ) {
        return true;
      }
    }
    return false;
  }

  private static isValidErrorInterceptor(filePath: string): boolean {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      return (
        content.includes('HttpInterceptorFn') &&
        content.includes('catchError') &&
        (content.includes('HttpErrorResponse') || content.includes('error'))
      );
    } catch (_error) {
      return false;
    }
  }

  private static hasRegisteredErrorInterceptor(configFiles: string[]): boolean {
    for (const configFile of configFiles) {
      if (
        FileUtils.exists(configFile) &&
        this.hasInterceptorRegistered(configFile)
      ) {
        return true;
      }
    }
    return false;
  }

  private static hasInterceptorRegistered(configFile: string): boolean {
    try {
      const content = FileUtils.readFile(configFile, { encoding: 'utf8' });
      return (
        (content.includes('errorHandlerInterceptor') ||
          content.includes('errorInterceptor')) &&
        content.includes('withInterceptors')
      );
    } catch (_error) {
      return false;
    }
  }

  private static findSourceFiles(projectRoot: string): string[] {
    return CheckerUtils.findTypeScriptFiles(
      projectRoot,
      ConfigFileUtils.getMinimalDefaultConfig(),
      undefined,
      false
    ).filter((file: string) =>
      this.isSourceFile(PathOperations.getBasename(file))
    );
  }

  private static isSourceFile(filename: string): boolean {
    return (
      filename.endsWith('.ts') &&
      !filename.endsWith('.spec.ts') &&
      !filename.endsWith('.test.ts') &&
      !filename.endsWith('.d.ts')
    );
  }

  private static generateMessage(
    violationCount: number,
    tryCatchAnalysis: { missingTryCatchInCriticalAreas: number },
    loggingAnalysis: { hasProperLogging: boolean }
  ): string {
    if (violationCount === 0) {
      return '✅ Error Handling Standards: Excellent error handling practices';
    }

    const issues = [];
    if (tryCatchAnalysis.missingTryCatchInCriticalAreas > 0)
      issues.push('missing try-catch');
    if (!loggingAnalysis.hasProperLogging) issues.push('poor error logging');

    return `⚠️ Error Handling issues: ${issues.join(', ')}`;
  }
}
