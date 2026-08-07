import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES, REGEX_PATTERNS } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { NgRxNamingConventionsConfiguration } from './ngrx-naming-conventions-configuration';

/**
 * Validation patterns utility for NgRx Naming Conventions Analysis
 * Provides comprehensive naming convention validation workflow and pattern matching
 */
export class NgRxNamingConventionsValidationPatterns {
  /**
   * Class-level alias for Configuration to reduce verbosity
   */
  private static readonly Config = NgRxNamingConventionsConfiguration;

  /**
   * Validate all NgRx naming convention patterns
   * Uses NgRxSetupConfiguration for result deduplication
   */
  static validateAllNamingConventions(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find all NgRx files
    const ngrxExtensions = [...this.Config.NGRX_FILE_EXTENSIONS] as string[];
    const ngrxFiles = CheckerUtils.findFilesByExtension(
      PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC),
      ngrxExtensions,
      config
    );

    // Validate each NgRx file
    for (const file of ngrxFiles) {
      this.validateSingleNgRxFile(file, violations, suggestions);
    }

    // Deduplicate results using centralized utility
    return {
      violations: [...new Set(violations)],
      suggestions: [...new Set(suggestions)],
    };
  }

  /**
   * Validate a single NgRx file
   */
  private static validateSingleNgRxFile(
    file: string,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(file, this.Config.FILE_READ_OPTIONS);

      if (!content) return;

      const fileName = PathOperations.getBasename(file);
      const featurePath = PathOperations.getDirectory(file);
      const featureName = this.Config.extractFeatureName(featurePath);

      // Apply specific validations based on file type
      this.validateByFileType(
        content,
        fileName,
        featureName,
        violations,
        suggestions
      );
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  /**
   * File type to validation method mapping - eliminates duplicated if statements
   */
  private static readonly FILE_TYPE_VALIDATORS: Record<
    string,
    (
      content: string,
      fileName: string,
      featureName: string,
      violations: string[],
      suggestions: string[]
    ) => void
  > = {
    actions: (content, fileName, featureName, violations, suggestions) =>
      { NgRxNamingConventionsValidationPatterns.validateActionNaming(
        content,
        fileName,
        featureName,
        violations,
        suggestions
      ); },
    reducer: (content, fileName, featureName, violations, suggestions) =>
      { NgRxNamingConventionsValidationPatterns.validateReducerNaming(
        content,
        fileName,
        featureName,
        violations,
        suggestions
      ); },
    selectors: (content, fileName, featureName, violations, suggestions) =>
      { NgRxNamingConventionsValidationPatterns.validateSelectorNaming(
        content,
        fileName,
        featureName,
        violations,
        suggestions
      ); },
    effects: (content, fileName, featureName, violations, suggestions) =>
      { NgRxNamingConventionsValidationPatterns.validateEffectNaming(
        content,
        fileName,
        featureName,
        violations,
        suggestions
      ); },
  };

  /**
   * Validate based on file type using centralized validation map
   */
  private static validateByFileType(
    content: string,
    fileName: string,
    featureName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const fileTypes = Object.keys(this.FILE_TYPE_VALIDATORS);

    for (const fileType of fileTypes) {
      if (this.Config.isFileType(fileName, fileType)) {
        const validator = this.FILE_TYPE_VALIDATORS[fileType];
        if (validator) {
          validator(content, fileName, featureName, violations, suggestions);
        }
      }
    }
  }

  /**
   * Validate action naming conventions
   */
  private static validateActionNaming(
    content: string,
    fileName: string,
    featureName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const analysis = this.Config.analyzeActionNaming(content, featureName);

    // Validate action patterns
    this.processActionMatches(
      analysis.actionMatches,
      fileName,
      featureName,
      violations,
      suggestions
    );

    // Validate action creator naming
    this.processActionCreatorMatches(
      analysis.actionCreatorMatches,
      fileName,
      suggestions
    );
  }

  /**
   * Process action matches for naming validation
   */
  private static processActionMatches(
    actionMatches: RegExpMatchArray | null,
    fileName: string,
    featureName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const actionNames = this.Config.extractNamesFromMatches(
      actionMatches,
      REGEX_PATTERNS.QUOTED_STRING
    );

    for (const actionName of actionNames) {
      // Check action prefix
      if (!this.Config.hasProperActionPrefix(actionName, featureName)) {
        violations.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.ACTION_PREFIX_VIOLATION,
            actionName,
            featureName,
            fileName
          )
        );
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.ACTION_PREFIX_SUGGESTION,
            featureName,
            actionName
          )
        );
      }

      // Check action case
      const actionText = this.Config.cleanActionName(actionName);
      if (!this.Config.hasProperActionCase(actionText)) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.ACTION_CASE_SUGGESTION,
            actionText,
            fileName
          )
        );
      }
    }
  }

  /**
   * Process action creator matches for naming validation
   */
  private static processActionCreatorMatches(
    actionCreatorMatches: RegExpMatchArray | null,
    fileName: string,
    suggestions: string[]
  ): void {
    const creatorNames = this.Config.extractNamesFromMatches(
      actionCreatorMatches,
      REGEX_PATTERNS.CONST_PATTERN
    );

    for (const creatorName of creatorNames) {
      if (!this.Config.hasProperActionCreatorCase(creatorName)) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.ACTION_CREATOR_CASE_SUGGESTION,
            creatorName,
            fileName
          )
        );
      }
    }
  }

  /**
   * Validate reducer naming conventions
   */
  private static validateReducerNaming(
    content: string,
    fileName: string,
    featureName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const analysis = this.Config.analyzeReducerNaming(content);
    const expectedNames = this.Config.generateExpectedNames(featureName);

    // Validate reducer function naming
    const reducerNames = this.Config.extractNamesFromMatches(
      analysis.reducerMatches,
      REGEX_PATTERNS.CONST_PATTERN
    );
    for (const reducerName of reducerNames) {
      if (reducerName !== expectedNames.reducer) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.REDUCER_NAME_SUGGESTION,
            expectedNames.reducer,
            fileName
          )
        );
      }
    }

    // Validate initial state naming
    if (!this.Config.hasProperInitialState(content, featureName)) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.INITIAL_STATE_SUGGESTION,
          featureName,
          fileName
        )
      );
    }

    // Validate state interface naming
    const stateNames = this.Config.extractNamesFromMatches(
      analysis.interfaceMatches,
      REGEX_PATTERNS.INTERFACE_PATTERN
    );
    for (const stateName of stateNames) {
      if (
        stateName !== expectedNames.stateInterface &&
        !this.Config.hasProperStateInterfaceCase(stateName)
      ) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.STATE_INTERFACE_SUGGESTION,
            expectedNames.stateInterface,
            fileName
          )
        );
      }
    }
  }

  /**
   * Validate selector naming conventions
   */
  private static validateSelectorNaming(
    content: string,
    fileName: string,
    featureName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const analysis = this.Config.analyzeSelectorNaming(content);
    const expectedNames = this.Config.generateExpectedNames(featureName);

    // Validate feature selector naming
    const featureSelectorNames = this.Config.extractNamesFromMatches(
      analysis.featureSelectorMatches,
      REGEX_PATTERNS.CONST_PATTERN
    );
    for (const selectorName of featureSelectorNames) {
      if (selectorName !== expectedNames.featureSelector) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.FEATURE_SELECTOR_SUGGESTION,
            expectedNames.featureSelector,
            fileName
          )
        );
      }
    }

    // Validate general selector naming
    const generalSelectorNames = this.Config.extractNamesFromMatches(
      analysis.generalSelectorMatches,
      REGEX_PATTERNS.CONST_PATTERN
    );
    for (const selectorName of generalSelectorNames) {
      if (!this.Config.hasProperSelectorPrefix(selectorName)) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.SELECTOR_PREFIX_SUGGESTION,
            selectorName,
            fileName
          )
        );
      }
    }
  }

  /**
   * Validate effect naming conventions
   */
  private static validateEffectNaming(
    content: string,
    fileName: string,
    featureName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const analysis = this.Config.analyzeEffectNaming(content);
    const expectedNames = this.Config.generateExpectedNames(featureName);

    // Validate effect class naming
    const classNames = this.Config.extractNamesFromMatches(
      analysis.classMatches,
      REGEX_PATTERNS.CLASS_PATTERN
    );
    for (const className of classNames) {
      if (className !== expectedNames.effectsClass) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.EFFECTS_CLASS_SUGGESTION,
            expectedNames.effectsClass,
            fileName
          )
        );
      }
    }

    // Validate individual effect naming
    const effectNames = this.Config.extractNamesFromMatches(
      analysis.effectMatches,
      REGEX_PATTERNS.EFFECT_ASSIGNMENT
    );
    for (const effectName of effectNames) {
      if (!this.Config.hasValidEffectNaming(effectName)) {
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.EFFECT_NAMING_SUGGESTION,
            effectName,
            fileName
          )
        );
      }
    }
  }
}
