import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import {
  type CodeView,
  matchesFromCode,
} from '../../../../utils/security/code-view';

/**
 * InputValidationConstants
 *
 * Input validation and sanitization configuration.
 * Single Responsibility: Form validation and XSS prevention patterns
 */
export class InputValidationConstants {
  static readonly VALIDATION_PATTERNS = {
    FORM_CONTROL: /FormControl/,
    VALIDATORS: /Validators/,
    INNER_HTML: /innerHTML/,
    SANITIZE: /sanitiz/i,
    HTTP_CLIENT: /\bHttpClient\b/,
    /** An Angular service: the decorator, in code — not a message about it. */
    INJECTABLE: /@Injectable\s*\(/,
    /** A call of a validator: `validate(…)`, `this.rules.validateOrder(…)`. */
    VALIDATE_CALL: /\bvalidate\w*\s*\(/i,
    /** A schema library, as the module the file imports. */
    SCHEMA_MODULE:
      /['"](?:zod|yup|joi|@hapi\/joi|io-ts|valibot|superstruct|class-validator|ajv|runtypes|arktype|@sinclair\/typebox)(?:\/[^'"]*)?['"]/,
    /** A value typed as unknown — the response the code must narrow. */
    UNKNOWN_TYPE: /\bunknown\b/,
    /** Narrowing: a `typeof x ===` check or a type predicate `(x): x is T`. */
    NARROWING:
      /\btypeof\s+[\w$.[\]]+\s*[!=]==|\)\s*:\s*(?:asserts\s+)?[\w$.]+\s+is\s+[\w$]/,
  };

  static readonly RISKY_PATTERNS = {
    INNER_HTML_WITHOUT_SANITIZE: /innerHTML.*[^sanitiz]/i,
    FORM_CONTROL_NO_VALIDATORS: /FormControl\s*\(/,
  };

  static hasProperFormValidation(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.FORM_CONTROL
      ) &&
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.VALIDATORS
      )
    );
  }

  static hasFormControl(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.VALIDATION_PATTERNS.FORM_CONTROL
    );
  }

  static hasValidators(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.VALIDATION_PATTERNS.VALIDATORS
    );
  }

  static hasXSSVulnerability(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.INNER_HTML
      ) &&
      !PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.SANITIZE
      )
    );
  }

  /** An `@Injectable()` class is declared here (in code). */
  static isInjectable(view: CodeView): boolean {
    return matchesFromCode(view, this.VALIDATION_PATTERNS.INJECTABLE);
  }

  /** The code uses Angular's HttpClient (a string naming it does not). */
  static usesHttpClient(view: CodeView): boolean {
    return matchesFromCode(view, this.VALIDATION_PATTERNS.HTTP_CLIENT);
  }

  /**
   * What comes back over HTTP is checked before it is used (#550): a schema
   * library, a validator call, or a value typed `unknown` and narrowed. The
   * word "validate" in a comment, a string or a file name is not a check.
   */
  static validatesResponses(view: CodeView): boolean {
    const p = this.VALIDATION_PATTERNS;
    return (
      matchesFromCode(view, p.SCHEMA_MODULE) ||
      matchesFromCode(view, p.VALIDATE_CALL) ||
      (matchesFromCode(view, p.UNKNOWN_TYPE) &&
        matchesFromCode(view, p.NARROWING))
    );
  }

  /** The file uses HttpClient and checks what it receives. */
  static hasHttpValidation(view: CodeView): boolean {
    return this.usesHttpClient(view) && this.validatesResponses(view);
  }
}
