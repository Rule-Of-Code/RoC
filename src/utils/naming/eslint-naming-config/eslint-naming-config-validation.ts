import { ConfigFileUtils } from '../../config-file-utils';
import { ESLINT_NAMING_CONVENTIONS } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { ESLintNamingConfigConfiguration } from './eslint-naming-config-configuration';

/**
 * ESLint Naming Config Validation
 * Specialized validation utilities for ESLint naming convention configuration
 */
export class ESLintNamingConfigValidation {
  /**
   * Validate ESLint naming convention configuration
   */
  static validateNamingConventionConfig(
    projectRoot: string,
    _config: Record<string, unknown> = {}
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const eslintConfig =
      ESLintNamingConfigValidation.findESLintConfiguration(projectRoot);
    if (!eslintConfig) {
      const messages = ESLintNamingConfigConfiguration.getViolationMessages({});
      const suggestionMessages =
        ESLintNamingConfigConfiguration.getSuggestionMessages({});
      violations.push(messages.noESLintConfig);
      suggestions.push(suggestionMessages.addESLintConfig);
      return { violations, suggestions };
    }

    try {
      ESLintNamingConfigValidation.validateNamingRules(
        eslintConfig,
        violations,
        suggestions
      );
    } catch (_error) {
      const messages = ESLintNamingConfigConfiguration.getViolationMessages({});
      const suggestionMessages =
        ESLintNamingConfigConfiguration.getSuggestionMessages({});
      violations.push(messages.errorParsingConfig);
      suggestions.push(suggestionMessages.verifyConfigSyntax);
    }

    return { violations, suggestions };
  }

  /**
   * Find ESLint configuration in project
   */
  static findESLintConfiguration(
    projectRoot: string
  ): Record<string, unknown> | null {
    const configFiles = ESLintNamingConfigConfiguration.getESLintConfigFiles(
      {}
    );

    for (const configFile of configFiles) {
      const config = ESLintNamingConfigValidation.loadESLintConfigFile(
        projectRoot,
        configFile
      );
      if (config) {
        return config;
      }
    }

    return null;
  }

  /**
   * Load ESLint configuration from file
   */
  private static loadESLintConfigFile(
    projectRoot: string,
    configFile: string
  ): Record<string, unknown> | null {
    const configPath = PathOperations.join(projectRoot, configFile);
    if (!FileUtils.exists(configPath)) {
      return null;
    }

    try {
      if (configFile === 'package.json') {
        return ESLintNamingConfigValidation.loadPackageJsonESLintConfig(
          configPath
        );
      }
      if (configFile.endsWith('.json')) {
        return ConfigFileUtils.loadConfig(configPath);
      }
      if (configFile.endsWith('.js') || configFile.endsWith('.mjs')) {
        // For flat config files (eslint.config.js/mjs), parse the content directly
        const content = FileUtils.readFile(configPath, { encoding: 'utf8' });

        // Check if naming-convention rule exists in the flat config
        const hasNamingConvention = content.includes(
          '@typescript-eslint/naming-convention'
        );

        if (hasNamingConvention) {
          // Return a mock config indicating naming rules exist
          return {
            _configFile: configFile,
            _isFlatConfig: true,
            _hasNamingRules: true,
            rules: {
              '@typescript-eslint/naming-convention': 'error',
            },
          };
        }

        // Config file exists but no naming rules found
        return {
          _configFile: configFile,
          _isFlatConfig: true,
          _hasNamingRules: false,
          rules: {},
        };
      }
    } catch (_error) {
      // Continue to next config file
    }

    return null;
  }

  /**
   * Load ESLint configuration from package.json
   */
  private static loadPackageJsonESLintConfig(
    configPath: string
  ): Record<string, unknown> | null {
    const packageJson = ConfigFileUtils.loadConfig(configPath) as Record<
      string,
      unknown
    > | null;

    const eslintConfigKey =
      ESLINT_NAMING_CONVENTIONS.PROPERTY_KEYS.ESLINT_CONFIG;
    if (packageJson?.[eslintConfigKey]) {
      return packageJson[eslintConfigKey] as Record<string, unknown>;
    }

    return null;
  }

  /**
   * Validate naming convention rules
   */
  static validateNamingRules(
    eslintConfig: Record<string, unknown>,
    violations: string[],
    suggestions: string[]
  ): void {
    // Check if this is a flat config
    if (eslintConfig._isFlatConfig) {
      // For flat configs, we already checked for naming rules during loading
      if (eslintConfig._hasNamingRules) {
        // Naming rules exist, no violations
        return;
      }
      // Flat config exists but no naming rules - add violation
      const messages = ESLintNamingConfigConfiguration.getViolationMessages({});
      const suggestionMessages =
        ESLintNamingConfigConfiguration.getSuggestionMessages({});
      violations.push(messages.noNamingRules);
      suggestions.push(suggestionMessages.configureNamingConvention);
      return;
    }

    // For legacy configs (.eslintrc), check rules object
    const rulesKey = ESLINT_NAMING_CONVENTIONS.PROPERTY_KEYS.RULES;
    const rules =
      (eslintConfig[rulesKey] as Record<string, unknown> | undefined) ?? {};
    const namingRules =
      ESLintNamingConfigConfiguration.getNamingConventionRules({});

    let hasNamingRules = false;
    for (const rule of namingRules) {
      if (rule in rules) {
        hasNamingRules = true;
        break;
      }
    }

    if (!hasNamingRules) {
      const messages = ESLintNamingConfigConfiguration.getViolationMessages({});
      const suggestionMessages =
        ESLintNamingConfigConfiguration.getSuggestionMessages({});
      violations.push(messages.noNamingRules);
      suggestions.push(suggestionMessages.configureNamingConvention);
    }

    ESLintNamingConfigValidation.validateNamingConventionPatterns(
      rules,
      suggestions
    );
    ESLintNamingConfigValidation.validateFilenameCase(rules, suggestions);
  }

  /**
   * Validate naming convention patterns
   */
  static validateNamingConventionPatterns(
    rules: Record<string, unknown>,
    suggestions: string[]
  ): void {
    const namingConventionRule =
      ESLINT_NAMING_CONVENTIONS.RULE_NAMES.TYPESCRIPT_NAMING_CONVENTION;
    const namingConvention = rules[namingConventionRule];
    if (namingConvention) {
      const ruleConfig = Array.isArray(namingConvention)
        ? namingConvention
        : [namingConvention];

      const configString = JSON.stringify(ruleConfig);
      const requiredPatterns =
        ESLintNamingConfigConfiguration.getRequiredNamingPatterns({});
      const suggestionMessages =
        ESLintNamingConfigConfiguration.getSuggestionMessages({});

      for (const [selector, format] of Object.entries(requiredPatterns)) {
        if (!configString.includes(selector)) {
          suggestions.push(
            suggestionMessages.addNamingRuleFor(selector, format)
          );
        }
      }
    }
  }

  /**
   * Validate filename case configuration
   */
  static validateFilenameCase(
    rules: Record<string, unknown>,
    suggestions: string[]
  ): void {
    const filenameCaseRule =
      ESLINT_NAMING_CONVENTIONS.RULE_NAMES.UNICORN_FILENAME_CASE;
    if (!(filenameCaseRule in rules)) {
      const suggestionMessages =
        ESLintNamingConfigConfiguration.getSuggestionMessages({});
      suggestions.push(suggestionMessages.configureFilenameCase);
    }
  }
}
