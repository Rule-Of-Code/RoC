import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../../utils/checker-utils';
import { FileUtils } from '../../../utils/file-utils';
import { PathOperations } from '../../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../../utils/react/tsx-source';
import {
  type CodeView,
  matchesFromCode,
  readCodeView,
} from '../../../utils/security/code-view';

/**
 * Parsed files, keyed by path and checked against the content read now: the
 * three checkers of a law read the same files many times. Bounded.
 */
const VIEW_CACHE = new Map<string, { content: string; view: CodeView }>();
const VIEW_CACHE_LIMIT = 5000;

function readCachedView(file: string): CodeView | null {
  let content: string;
  try {
    content = FileUtils.readFile(file);
  } catch {
    return null;
  }
  const cached = VIEW_CACHE.get(file);
  if (cached && cached.content === content) return cached.view;
  const ts = loadTypeScript(PathOperations.getDirectory(file));
  if (!ts) return null;
  const view = readCodeView(ts, content, file);
  if (VIEW_CACHE.size >= VIEW_CACHE_LIMIT) VIEW_CACHE.clear();
  VIEW_CACHE.set(file, { content, view });
  return view;
}

/**
 * Base class for Security Checkers
 * Consolidates common security analysis patterns and patterns
 */
export class SecurityCheckerBase {
  /**
   * Common initialization for security checkers
   * Validates src path and returns code files
   * Supports both standard projects and Nx monorepo structure
   */
  protected static initializeSecurityCheck(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[]; codeFiles: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let codeFiles: string[] = [];

    // For security checks, we need to scan ALL code files, not just includes
    // Authorization patterns (guards, RBAC, etc.) can be anywhere in the project
    const scanConfig: RuleOfCodeConfig = {
      ...config,
      includes: undefined, // Remove includes filtering for security checks
    };

    // Try standard src path first
    const srcPath = PathOperations.join(projectRoot, 'src');
    if (FileUtils.exists(srcPath)) {
      codeFiles = CheckerUtils.findFilesByExtension(
        srcPath,
        CheckerUtils.getCommonExtensions().ALL_CODE,
        scanConfig
      );
    }

    // If no files found, try Nx monorepo structure (apps/*/src and libs/*/src)
    if (codeFiles.length === 0) {
      const appsPath = PathOperations.join(projectRoot, 'apps');
      const libsPath = PathOperations.join(projectRoot, 'libs');

      if (FileUtils.exists(appsPath)) {
        const appsFiles = CheckerUtils.findFilesByExtension(
          appsPath,
          CheckerUtils.getCommonExtensions().ALL_CODE,
          scanConfig
        );
        codeFiles = [...codeFiles, ...appsFiles];
      }

      if (FileUtils.exists(libsPath)) {
        const libsFiles = CheckerUtils.findFilesByExtension(
          libsPath,
          CheckerUtils.getCommonExtensions().ALL_CODE,
          scanConfig
        );
        codeFiles = [...codeFiles, ...libsFiles];
      }
    }

    return { violations, suggestions, codeFiles };
  }

  /**
   * Does any file match any pattern IN CODE (#426)? A match counts when it
   * starts in code — not inside a string, template, regex or comment — so a
   * checker's own pattern table (`/AuthService/`, `/md5.*password/`) and the
   * law registry's prose match nothing, while `localStorage.setItem('token',
   * …)` and `from 'firebase/auth'` (an import is code) still do. An unreadable
   * file, or one with no parser, matches nothing.
   */
  protected static anyFileMatchesCode(
    codeFiles: string[],
    patterns: readonly RegExp[]
  ): boolean {
    return codeFiles.some(file => {
      const view = readCachedView(file);
      return !!view && patterns.some(pattern => matchesFromCode(view, pattern));
    });
  }

  /**
   * Generic security checker pattern
   * Eliminates duplicate initialization and early return logic
   */
  protected static runSecurityCheck<
    T extends { violations: string[]; suggestions: string[] },
  >(
    projectRoot: string,
    config: RuleOfCodeConfig,
    checkFunction: (codeFiles: string[]) => T
  ): T {
    const { violations, suggestions, codeFiles } = this.initializeSecurityCheck(
      projectRoot,
      config
    );

    // If no code files found, return early with empty violations/suggestions
    if (codeFiles.length === 0) {
      return { violations, suggestions } as T;
    }

    // The patterns are matched in code (#426); without the parser the files
    // are not read — said so, never judged by their text.
    if (!loadTypeScript(projectRoot)) {
      return {
        violations: [
          ...violations,
          parserUnavailable(
            projectRoot,
            `the ${codeFiles.length} .ts/.js file(s)`
          ),
        ],
        suggestions,
      } as T;
    }

    // Run the check function with code files
    const result = checkFunction(codeFiles);

    // Merge violations and suggestions from initialization with check results
    return {
      ...result,
      violations: [...violations, ...result.violations],
      suggestions: [...suggestions, ...result.suggestions],
    } as T;
  }

  /**
   * Common pattern for adding violation and suggestion pair
   */
  protected static addViolationWithSuggestion(
    violations: string[],
    suggestions: string[],
    violation: string,
    suggestion: string
  ): void {
    violations.push(violation);
    suggestions.push(suggestion);
  }
}
