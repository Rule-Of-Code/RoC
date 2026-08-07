/**
 * Error Handling Completeness Law
 * Ensures comprehensive error handling throughout the application
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { NxWorkspace } from '../../utils/nx-workspace';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { CodeQualityLawBase } from './code-quality-law-base';

export class ErrorHandlingCompletenessLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for error handling patterns
    const errorHandlingAnalysis = this.analyzeErrorHandling(
      context.projectRoot,
      context.config
    );
    violations.push(...errorHandlingAnalysis.violations);
    suggestions.push(...errorHandlingAnalysis.suggestions);

    // Check for global error handling
    const globalErrorHandling = this.checkGlobalErrorHandling(
      context.projectRoot
    );
    violations.push(...globalErrorHandling.violations);
    suggestions.push(...globalErrorHandling.suggestions);

    // Check for error monitoring setup
    const errorMonitoring = this.checkErrorMonitoring(context.projectRoot);
    suggestions.push(...errorMonitoring.suggestions);

    return ErrorHandlingCompletenessLaw.createResult(
      violations,
      'Error Handling Completeness',
      'Code Quality',
      suggestions,
      context
    );
  }

  private static analyzeErrorHandling(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } = this.initializeAnalysis();

    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      [
        ...CheckerUtils.getCommonExtensions().TYPESCRIPT,
        ...CheckerUtils.getCommonExtensions().JAVASCRIPT,
      ],
      config
    );
    let filesWithoutErrorHandling = 0;

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const errorHandlingIssues = this.analyzeFileErrorHandling(content);

        if (errorHandlingIssues.violations.length > 0) {
          filesWithoutErrorHandling++;
          const relativePath = PathOperations.getRelative(projectRoot, file);
          violations.push(
            `Error handling gaps in ${relativePath}: ${errorHandlingIssues.violations.join(
              ', '
            )}`
          );
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    if (filesWithoutErrorHandling > 0) {
      suggestions.push(
        'Add try-catch blocks around async operations and API calls'
      );
      suggestions.push('Implement proper error boundaries in React components');
      suggestions.push(
        'Use Result/Either patterns for functional error handling'
      );
      suggestions.push(
        'Add type guards instead of unsafe property access (obj?.prop === "string")'
      );
      suggestions.push(
        'Use proper type checking before accessing object properties'
      );
    }

    return { violations, suggestions };
  }

  private static analyzeFileErrorHandling(content: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];

    // Check for unhandled async operations
    const asyncCalls = content.match(/await\s+\w+/g) ?? [];
    const tryBlocks = content.match(/try\s*{/g) ?? [];
    const catchBlocks = content.match(/\.catch\(/g) ?? [];
    const errorHandlers = tryBlocks.length + catchBlocks.length;

    // Relaxed ratio: only flag if many async calls with no error handling, or very high ratio
    if (asyncCalls.length > errorHandlers * 4 && asyncCalls.length > 3) {
      violations.push('async calls without proper error handling');
    }

    // Check for unhandled Promise chains
    // Exclude Angular lazy loading patterns (loadComponent/loadChildren with import().then())
    const promiseChains = content.match(/\.then\(/g) ?? [];
    const angularLazyLoads = content.match(/import\([^)]+\)\.then\(/g) ?? [];

    // Only flag non-Angular lazy loading promise chains (use catchBlocks from line 113)
    const nonFrameworkPromises = promiseChains.length - angularLazyLoads.length;
    if (nonFrameworkPromises > catchBlocks.length && nonFrameworkPromises > 0) {
      violations.push('Promise chains without .catch() handlers');
    }

    // Check for HTTP requests without error handling
    // More specific patterns to avoid false positives (FormBuilder.get, Map.get, provideHttpClient, etc.)
    // Exclude Angular config files which only provide HTTP client, not use it
    const isAngularConfig =
      content.includes('ApplicationConfig') ||
      content.includes('provideRouter') ||
      content.includes('CapacitorConfig');

    const httpRequests =
      content.match(/(fetch\(|axios\.|this\.http\.|\.httpClient\.)/g) ?? [];
    if (
      httpRequests.length > 0 &&
      tryBlocks.length === 0 &&
      catchBlocks.length === 0 &&
      !isAngularConfig
    ) {
      violations.push('HTTP requests without error handling');
    }

    // Check for event listeners without error handling
    // Exclude Angular provider functions (provideBrowserGlobalErrorListeners, etc)
    const eventListeners = content.match(/addEventListener\(/g) ?? [];
    if (
      eventListeners.length > 0 &&
      !content.includes('try') &&
      !content.includes('catch') &&
      !isAngularConfig // Don't flag Angular config files
    ) {
      violations.push('event handlers without error handling');
    }

    // Removed overly strict unsafe property access checks - TypeScript handles this
    // Optional chaining (?.) is a valid TypeScript pattern, not an error

    return { violations, suggestions: [] };
  }

  private static checkGlobalErrorHandling(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Canonical, root-relative entry points. Each is resolved across the
    // workspace (root AND every monorepo app), so an Nx app at
    // apps/<name>/src/app/app.config.ts is found by LAYOUT, not by name — the old
    // list hardcoded client-app/master-app/admin-web and was blind to any other.
    const globalErrorFiles = [
      'src/app/app.component.ts',
      'src/app/app.config.ts',
      'src/App.tsx',
      'src/main.ts',
      'src/index.ts',
      'app.js',
      'index.js',
    ];

    const hasGlobalErrorHandling =
      this.checkFilesForErrorHandling(projectRoot, globalErrorFiles) ||
      this.hasPythonGlobalErrorHandling(projectRoot);

    if (!hasGlobalErrorHandling) {
      violations.push('No global error handling configured');
      suggestions.push(
        'Implement global error handlers for unhandled promise rejections'
      );
      suggestions.push(
        'Add error boundaries for React or global error interceptors for Angular'
      );
    }

    return { violations, suggestions };
  }

  private static checkFilesForErrorHandling(
    projectRoot: string,
    files: string[]
  ): boolean {
    for (const errorFile of files) {
      // resolveSourceFiles returns only existing matches at the root and under
      // every app/lib, so no explicit existence check is needed.
      for (const fullPath of NxWorkspace.resolveSourceFiles(
        projectRoot,
        errorFile
      )) {
        try {
          const content = FileUtils.readFile(fullPath);
          if (this.hasGlobalErrorHandlingPatterns(content)) {
            return true;
          }
        } catch (_error) {
          // Continue if file can't be read
        }
      }
    }
    return false;
  }

  /**
   * The Python-native answer to "is a global error handler configured?".
   * Flask/FastAPI register it with a decorator — `@app.errorhandler(Exception)`,
   * `@app.exception_handler(...)` — never in src/main.ts, so the JS/TS file list
   * above can only ever answer "no" for them. Asked only for Python projects,
   * so JS/TS detection is untouched.
   */
  private static hasPythonGlobalErrorHandling(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasGlobalErrorHandler(projectRoot)
    );
  }

  private static hasGlobalErrorHandlingPatterns(content: string): boolean {
    const globalErrorPatterns = [
      'unhandledRejection',
      'uncaughtException',
      'ErrorBoundary',
      'GlobalErrorHandler',
      'window.onerror',
      'process.on',
      'ErrorHandler',
      'errorHandlerInterceptor', // Angular HTTP error interceptor
      'provideHttpClient', // Angular with interceptors
      'provideBrowserGlobalErrorListeners', // Angular 20 default provider
    ];

    return globalErrorPatterns.some(pattern => content.includes(pattern));
  }

  private static checkErrorMonitoring(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    const deps = ProjectTypeDetector.getPackageDependencies(projectRoot) ?? {};

    const monitoringTools = [
      'sentry',
      '@sentry/browser',
      '@sentry/node',
      'bugsnag',
      'rollbar',
      'airbrake',
    ];

    const hasErrorMonitoring = monitoringTools.some(tool => deps[tool]);

    if (!hasErrorMonitoring) {
      suggestions.push(
        'Consider adding error monitoring service (Sentry, Bugsnag, Rollbar)'
      );
    }

    // Check for logging libraries
    const loggingLibs = ['winston', 'bunyan', 'pino', 'log4js'];
    const hasLogging = loggingLibs.some(lib => deps[lib]);

    if (!hasLogging) {
      suggestions.push(
        'Add structured logging library for better error tracking'
      );
    }

    return { violations: [], suggestions };
  }
}
