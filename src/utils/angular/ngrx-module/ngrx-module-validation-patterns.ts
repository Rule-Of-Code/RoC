import {
  ANGULAR_CONSTANTS,
  NGRX_KEYWORDS,
  NGRX_MESSAGES,
} from '../../constants';

/**
 * NgRx Module Validation Patterns
 * Validation patterns and rules for NgRx module configuration
 */
export class NgRxModuleValidationPatterns {
  /**
   * Module structure validation patterns
   */
  static readonly MODULE_STRUCTURE_PATTERNS = {
    ngModuleDecorator: ANGULAR_CONSTANTS.NG_MODULE_DECORATOR,
    importsProperty: ANGULAR_CONSTANTS.IMPORTS_PROPERTY,
    providersProperty: ANGULAR_CONSTANTS.PROVIDERS_PROPERTY,
  } as const;

  /**
   * NgRx specific module patterns
   */
  static readonly NGRX_MODULE_PATTERNS = {
    storeModuleForRoot: NGRX_KEYWORDS.STORE_MODULE_FOR_ROOT,
    effectsModuleForRoot: NGRX_KEYWORDS.EFFECTS_MODULE_FOR_ROOT,
    storeDevtoolsModule: NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE,
  } as const;

  /**
   * Pattern detection methods
   */
  static readonly PATTERN_TYPES = {
    storeModule: 'storeModule',
    effectsModule: 'effectsModule',
    devtoolsModule: 'devtoolsModule',
  } as const;

  /**
   * Validation error messages
   * RULE 2: Uses constants from NGRX_KEYWORDS instead of hardcoded strings
   */
  static readonly VALIDATION_MESSAGES = {
    APP_MODULE_NOT_FOUND: NGRX_MESSAGES.APP_MODULE_NOT_FOUND,
    MODULE_MISSING_DECORATOR: `App module must have ${ANGULAR_CONSTANTS.NG_MODULE_DECORATOR} decorator`,
    MISSING_STORE_SETUP: `${NGRX_KEYWORDS.STORE_MODULE_FOR_ROOT} is required when @ngrx/store is installed`,
    MISSING_EFFECTS_SETUP: `${NGRX_KEYWORDS.EFFECTS_MODULE_FOR_ROOT} should be added when @ngrx/effects is installed`,
    MISSING_DEVTOOLS_SETUP: `${NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE} configuration missing`,
  } as const;

  /**
   * Required imports validation
   */
  static readonly REQUIRED_IMPORTS = {
    storeModule: '@ngrx/store',
    effectsModule: '@ngrx/effects',
    devtoolsModule: '@ngrx/store-devtools',
  } as const;

  /**
   * Module configuration recommendations
   * RULE 2: Uses NGRX_KEYWORDS constants instead of hardcoded strings
   */
  static readonly SETUP_RECOMMENDATIONS = {
    STORE_MODULE: `Add ${NGRX_KEYWORDS.STORE_MODULE_FOR_ROOT}({}) to imports array`,
    EFFECTS_MODULE: `Add ${NGRX_KEYWORDS.EFFECTS_MODULE_FOR_ROOT}([]) to imports array`,
    DEVTOOLS_MODULE: `Add ${NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE}.instrument() to imports array`,
  } as const;

  /**
   * Check if module content contains required NgRx patterns
   * RULE 2: Optimized with direct pattern lookup from NGRX_MODULE_PATTERNS
   */
  static containsPattern(
    content: string,
    patternType: keyof typeof NgRxModuleValidationPatterns.PATTERN_TYPES
  ): boolean {
    // RULE 2: Direct pattern lookup without duplicate mapping
    const patterns = this.NGRX_MODULE_PATTERNS;

    switch (patternType) {
      case 'storeModule':
        return content.includes(patterns.storeModuleForRoot);
      case 'effectsModule':
        return content.includes(patterns.effectsModuleForRoot);
      case 'devtoolsModule':
        return content.includes(patterns.storeDevtoolsModule);
      default:
        return false;
    }
  }

  /**
   * Validate module structure
   * RULE 2: Optimized with single content scan and early returns
   */
  static validateModuleStructure(content: string): {
    hasNgModuleDecorator: boolean;
    hasImportsProperty: boolean;
    hasProvidersProperty: boolean;
  } {
    // RULE 2: Cache pattern constants to avoid repeated property access
    const ngModuleDecorator = ANGULAR_CONSTANTS.NG_MODULE_DECORATOR;
    const importsProperty = ANGULAR_CONSTANTS.IMPORTS_PROPERTY;
    const providersProperty = ANGULAR_CONSTANTS.PROVIDERS_PROPERTY;

    return {
      hasNgModuleDecorator: content.includes(ngModuleDecorator),
      hasImportsProperty: content.includes(importsProperty),
      hasProvidersProperty: content.includes(providersProperty),
    };
  }
}
