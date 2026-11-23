import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import {
  type CodeView,
  matchesFromCode,
} from '../../../../utils/security/code-view';

/**
 * CORSConstants
 *
 * CORS configuration and validation patterns.
 * Single Responsibility: CORS header and middleware validation
 */
export class CORSConstants {
  static readonly CORS_PATTERNS = {
    CORS_MIDDLEWARE: /cors/i,
    ACCESS_CONTROL_HEADER: /Access-Control-Allow-Origin/i,
    /**
     * `'express'` as the module a file imports. Read in a code view, where a
     * module specifier is the only string left: the word in a law's prose or
     * inside `ts.isExpressionStatement` is not an import (#550, #559).
     */
    EXPRESS_MODULE: /['"]express['"]/,
    /** The application is created or started here. */
    EXPRESS_APP: /\bexpress\s*\(\s*\)|\.listen\s*\(/,
  };

  static readonly CONFIG_FILES = [
    'proxy.conf.json',
    'functions/src/index.ts',
    'server.ts',
    'main.ts',
    'app.ts',
  ];

  static hasCorsMiddleware(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.CORS_PATTERNS.CORS_MIDDLEWARE
    );
  }

  static hasAccessControlHeader(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.CORS_PATTERNS.ACCESS_CONTROL_HEADER
    );
  }

  /** The file imports express and creates or starts the application. */
  static isExpressServer(view: CodeView): boolean {
    return (
      matchesFromCode(view, this.CORS_PATTERNS.EXPRESS_MODULE) &&
      matchesFromCode(view, this.CORS_PATTERNS.EXPRESS_APP)
    );
  }

  /**
   * An Express server that configures no CORS: no `cors` in its code (the
   * middleware, a `./cors-config` import) and no Access-Control-Allow-Origin
   * header it sets. A comment that says "cors" configures nothing.
   */
  static isExpressServerMissingCors(view: CodeView): boolean {
    if (!this.isExpressServer(view)) return false;
    const configuresCors =
      matchesFromCode(view, this.CORS_PATTERNS.CORS_MIDDLEWARE) ||
      this.hasAccessControlHeader(view.commentless);
    return !configuresCors;
  }
}
