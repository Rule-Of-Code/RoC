import {
  AUTOMATION_MESSAGES,
  CICD_PATHS,
  CODE_QUALITY_TOOLS,
  CONFIG_FILES,
  FILE_OPERATIONS,
  LINTING_TOOLS,
  REVIEW_AUTOMATION,
} from '../../constants';

/**
 * Automated Review Tools Analyzer Configuration
 * Centralized configuration for automated review tools detection patterns
 */
export class AutomatedReviewToolsAnalyzerConfiguration {
  /**
   * Get linting tools configuration
   */
  static getLintingToolsPatterns(): {
    tools: string[];
    violationMessage: string;
    suggestionMessage: string;
  } {
    return {
      tools: [
        LINTING_TOOLS.ESLINT,
        LINTING_TOOLS.TSLINT,
        LINTING_TOOLS.JSHINT,
        LINTING_TOOLS.STYLELINT,
        LINTING_TOOLS.PRETTIER,
      ],
      violationMessage: AUTOMATION_MESSAGES.LINTING.NO_TOOLS_VIOLATION,
      suggestionMessage: AUTOMATION_MESSAGES.LINTING.ADD_TOOLS_SUGGESTION,
    };
  }

  /**
   * Get code quality tools configuration
   */
  static getCodeQualityToolsPatterns(): {
    tools: string[];
    suggestionMessage: string;
  } {
    return {
      tools: [
        CODE_QUALITY_TOOLS.SONARJS,
        CODE_QUALITY_TOOLS.CODACY_COVERAGE,
        CODE_QUALITY_TOOLS.CODECOV,
        CODE_QUALITY_TOOLS.ISTANBUL,
        CODE_QUALITY_TOOLS.JEST,
        CODE_QUALITY_TOOLS.NYC,
      ],
      suggestionMessage: AUTOMATION_MESSAGES.CODE_QUALITY.ADD_TOOLS_SUGGESTION,
    };
  }

  /**
   * Get CI/CD configuration patterns
   */
  static getCICDPatterns(): {
    configPaths: string[];
    noCICDMessage: string;
    noReviewChecksMessage: string;
    cicdSuggestion: string;
    reviewChecksSuggestion: string;
  } {
    return {
      configPaths: [
        CICD_PATHS.GITHUB_WORKFLOWS,
        CICD_PATHS.BITBUCKET_PIPELINES,
        CICD_PATHS.GITLAB_CI,
        CICD_PATHS.TRAVIS_CI,
        CICD_PATHS.CIRCLE_CI,
        CICD_PATHS.AZURE_PIPELINES,
        CICD_PATHS.JENKINSFILE,
      ],
      noCICDMessage: AUTOMATION_MESSAGES.CICD.NO_CICD_VIOLATION,
      noReviewChecksMessage:
        AUTOMATION_MESSAGES.CICD.NO_REVIEW_CHECKS_VIOLATION,
      cicdSuggestion: AUTOMATION_MESSAGES.CICD.SETUP_CICD_SUGGESTION,
      reviewChecksSuggestion:
        AUTOMATION_MESSAGES.CICD.ADD_REVIEW_CHECKS_SUGGESTION,
    };
  }

  /**
   * Get review automation keywords
   */
  static getReviewKeywords(): string[] {
    return [
      REVIEW_AUTOMATION.KEYWORDS.LINT,
      REVIEW_AUTOMATION.KEYWORDS.TEST,
      REVIEW_AUTOMATION.KEYWORDS.QUALITY,
      REVIEW_AUTOMATION.KEYWORDS.REVIEW,
    ];
  }

  /**
   * Get pre-commit hooks configuration
   */
  static getPreCommitHooksPatterns(): {
    hookPaths: string[];
    suggestions: string[];
  } {
    return {
      hookPaths: [
        REVIEW_AUTOMATION.PRE_COMMIT_HOOKS.HUSKY,
        REVIEW_AUTOMATION.PRE_COMMIT_HOOKS.PRE_COMMIT_CONFIG,
        REVIEW_AUTOMATION.PRE_COMMIT_HOOKS.GIT_HOOKS_PRE_COMMIT,
      ],
      suggestions: [
        AUTOMATION_MESSAGES.PRE_COMMIT.SETUP_HOOKS_SUGGESTION,
        AUTOMATION_MESSAGES.PRE_COMMIT.USE_HUSKY_SUGGESTION,
      ],
    };
  }

  /**
   * Get dependency updater tools configuration
   */
  static getDependencyUpdatersPatterns(): {
    updaterPaths: string[];
    suggestionMessage: string;
  } {
    return {
      updaterPaths: [
        REVIEW_AUTOMATION.DEPENDENCY_UPDATERS.DEPENDABOT,
        REVIEW_AUTOMATION.DEPENDENCY_UPDATERS.RENOVATE,
      ],
      suggestionMessage:
        AUTOMATION_MESSAGES.DEPENDENCY_UPDATERS.CONSIDER_TOOLS_SUGGESTION,
    };
  }

  /**
   * Get code coverage reporting configuration
   */
  static getCoverageReportingPatterns(): {
    coverageConfigs: string[];
    suggestionMessage: string;
  } {
    return {
      coverageConfigs: [
        REVIEW_AUTOMATION.COVERAGE_CONFIGS.COVERALLS,
        REVIEW_AUTOMATION.COVERAGE_CONFIGS.CODECOV,
        REVIEW_AUTOMATION.COVERAGE_CONFIGS.CODECOV_ALT,
      ],
      suggestionMessage:
        AUTOMATION_MESSAGES.COVERAGE.SETUP_REPORTING_SUGGESTION,
    };
  }

  /**
   * Get package.json path configuration
   */
  static getPackageJsonConfig(): {
    fileName: string;
  } {
    return {
      fileName: CONFIG_FILES.PACKAGE_JSON,
    };
  }

  /**
   * Get FileUtils default configuration
   */
  static getFileUtilsConfig(): {
    includePattern: string;
    excludePattern: string;
  } {
    return {
      includePattern: FILE_OPERATIONS.PATTERNS.ALL_FILES,
      excludePattern: FILE_OPERATIONS.PATTERNS.NODE_MODULES_EXCLUDE,
    };
  }

  /**
   * Get file reading options for content analysis
   */
  static getFileReadingOptions(): {
    encoding: 'utf8';
    flag: string;
  } {
    return {
      encoding: FILE_OPERATIONS.READ_OPTIONS.ENCODING,
      flag: FILE_OPERATIONS.READ_OPTIONS.FLAG_READ,
    };
  }
}
