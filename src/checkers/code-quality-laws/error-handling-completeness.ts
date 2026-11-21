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
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { CodeQualityLawBase } from './code-quality-law-base';
import { findFloatingPromises } from './floating-promises';
import { packageEntrySources } from './package-entry-sources';
import { readSource } from './source-view';

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

    // Read from the parse (#438): a `.then(` or `fetch(` in a message string,
    // a regex or a comment is not code. Without the parser the files are not
    // read — said so.
    const ts = loadTypeScript(projectRoot);
    if (!ts && codeFiles.length > 0) {
      violations.push(
        parserUnavailable(
          projectRoot,
          `the ${codeFiles.length} .ts/.js file(s)`
        )
      );
      return { violations, suggestions };
    }

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        if (!content || !ts) continue;
        const errorHandlingIssues = this.analyzeFileErrorHandling(
          ts,
          content,
          file
        );

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

  /**
   * One file's gaps. A promise that is dropped — a `.then` chain or a call to
   * an async function of this file, used as a statement and neither awaited,
   * returned, `void`-ed nor caught — is one (#438). An `await` is not: its
   * rejection is thrown into the enclosing `try` or to the caller.
   */
  private static analyzeFileErrorHandling(
    ts: NonNullable<ReturnType<typeof loadTypeScript>>,
    content: string,
    file: string
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const { source, code } = readSource(ts, content, file);

    const floating = findFloatingPromises(ts, source);
    if (floating.length > 0) {
      violations.push(
        `${floating.length} promise(s) neither awaited, returned nor caught (line ${floating
          .map(f => f.line)
          .join(', ')})`
      );
    }

    violations.push(...this.guardingGaps(code));

    return { violations, suggestions: [] };
  }

  /**
   * HTTP calls and event listeners in a file with no try/catch at all —
   * judged on the code view (strings and comments blanked). Angular config
   * files only provide the HTTP client and the global listeners; they are
   * not judged.
   */
  private static guardingGaps(code: string): string[] {
    const isAngularConfig =
      code.includes('ApplicationConfig') ||
      code.includes('provideRouter') ||
      code.includes('CapacitorConfig');
    if (isAngularConfig) return [];
    return [...this.unguardedHttp(code), ...this.unguardedListeners(code)];
  }

  /** fetch / axios / HttpClient calls in a file with no try {} and no .catch(). */
  private static unguardedHttp(code: string): string[] {
    // Specific patterns: FormBuilder.get, Map.get, provideHttpClient are not calls.
    const hasHttp = /(fetch\(|axios\.|this\.http\.|\.httpClient\.)/.test(code);
    const guarded = /try\s*{/.test(code) || /\.catch\(/.test(code);
    return hasHttp && !guarded ? ['HTTP requests without error handling'] : [];
  }

  /** addEventListener in a file with no try and no catch. */
  private static unguardedListeners(code: string): string[] {
    const hasListener = code.includes('addEventListener(');
    const guarded = code.includes('try') || code.includes('catch');
    return hasListener && !guarded
      ? ['event handlers without error handling']
      : [];
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

    // ...and the package's own entry points: what `bin` and `main` in
    // package.json name, read from source (#438). A CLI whose bin is
    // dist/cli.js starts in src/cli.ts, which no fixed list names.
    const hasGlobalErrorHandling =
      this.checkFilesForErrorHandling(projectRoot, globalErrorFiles) ||
      this.checkEntryPointsForErrorHandling(projectRoot) ||
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

  private static checkEntryPointsForErrorHandling(
    projectRoot: string
  ): boolean {
    return packageEntrySources(projectRoot).some(file => {
      try {
        return this.hasGlobalErrorHandlingPatterns(FileUtils.readFile(file));
      } catch (_error) {
        return false;
      }
    });
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
