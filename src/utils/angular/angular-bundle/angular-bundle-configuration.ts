import { ANGULAR_CONSTANTS } from '../../constants';

/**
 * Angular bundle optimization configuration utilities
 * Meta-dogfooding: Centralized bundle optimization patterns for Angular projects
 */
export class AngularBundleConfiguration {
  /**
   * Bundle optimization validation messages - eliminates hardcoded strings
   */
  static readonly VALIDATION_MESSAGES = {
    AOT_DISABLED: (projectName: string) => ({
      violationMessage: `${ANGULAR_CONSTANTS.AOT} compilation should be enabled for production in ${projectName}`,
      suggestionMessage: `Set "${ANGULAR_CONSTANTS.AOT}": true in production configuration`,
    }),

    BUILD_OPTIMIZER_DISABLED: (projectName: string) => ({
      suggestionMessage: `Enable ${ANGULAR_CONSTANTS.BUILD_OPTIMIZER} for better tree shaking in ${projectName}`,
    }),

    LICENSE_EXTRACTION_DISABLED: (projectName: string) => ({
      suggestionMessage: `Enable license ${ANGULAR_CONSTANTS.EXTRACT_LICENSES} in production build for ${projectName}`,
    }),

    SOURCE_MAPS_ENABLED: (projectName: string) => ({
      suggestionMessage: `Disable ${ANGULAR_CONSTANTS.SOURCE_MAP} in production for smaller bundle size in ${projectName}`,
    }),

    BUNDLE_ANALYZER_MISSING: () => ({
      suggestionMessage: `Consider adding ${ANGULAR_CONSTANTS.WEBPACK_BUNDLE_ANALYZER} for bundle size monitoring`,
    }),

    PERFORMANCE_BUDGETS_MISSING: () => ({
      suggestionMessage:
        'Add performance budgets in angular.json build configuration',
    }),

    WEBPACK_CONFIG_MISSING: () => ({
      suggestionMessage:
        'Configure webpack performance settings and optimization',
    }),

    WEBPACK_PERFORMANCE_LIMITS_MISSING: () => ({
      suggestionMessage:
        'Add maxAssetSize and maxEntrypointSize in webpack configuration',
    }),

    ANGULAR_CONFIG_REVIEW: () => ({
      suggestionMessage:
        'Review angular.json build configuration for optimization settings',
    }),

    SOURCE_CODE_REVIEW: () => ({
      suggestionMessage:
        'Review source code for performance optimization opportunities',
    }),

    WEBPACK_PERFORMANCE_CONFIGURED: (configs: string[]) => ({
      suggestionMessage: `Webpack performance configured in: ${configs.join(', ')}`,
    }),
  };

  /**
   * Production configuration requirements
   */
  static readonly PRODUCTION_CONFIG_REQUIREMENTS = {
    AOT: { key: ANGULAR_CONSTANTS.AOT, expectedValue: true, required: true },
    BUILD_OPTIMIZER: {
      key: ANGULAR_CONSTANTS.BUILD_OPTIMIZER,
      expectedValue: true,
      required: false,
    },
    EXTRACT_LICENSES: {
      key: ANGULAR_CONSTANTS.EXTRACT_LICENSES,
      expectedValue: true,
      required: false,
    },
    SOURCE_MAP: {
      key: ANGULAR_CONSTANTS.SOURCE_MAP,
      expectedValue: false,
      required: false,
    },
  } as const;

  /**
   * Get production configuration from angular.json structure
   * Meta-dogfooding: Centralized angular.json navigation logic
   */
  static getProductionConfig(angularConfig: Record<string, unknown>): Array<{
    projectName: string;
    config: Record<string, unknown>;
  }> {
    const results: Array<{
      projectName: string;
      config: Record<string, unknown>;
    }> = [];

    const projects = angularConfig[ANGULAR_CONSTANTS.PROJECTS] ?? {};

    for (const [projectName, projectConfig] of Object.entries(projects)) {
      const prodConfig = this.extractProductionConfig(projectConfig);
      if (prodConfig) {
        results.push({ projectName, config: prodConfig });
      }
    }

    return results;
  }

  /**
   * Extract production configuration from project config
   */
  private static extractProductionConfig(
    projectConfig: unknown
  ): Record<string, unknown> | null {
    const typedConfig = projectConfig as Record<string, unknown> | undefined;
    const architect = typedConfig?.[ANGULAR_CONSTANTS.ARCHITECT] as
      | Record<string, unknown>
      | undefined;
    const build = architect?.[ANGULAR_CONSTANTS.BUILD] as
      | Record<string, unknown>
      | undefined;
    const configurations = build?.[ANGULAR_CONSTANTS.CONFIGURATIONS] as
      | Record<string, unknown>
      | undefined;
    const prodConfig = configurations?.[ANGULAR_CONSTANTS.PRODUCTION] as
      | Record<string, unknown>
      | undefined;

    return prodConfig ?? null;
  }

  /**
   * Validate production configuration setting
   * Meta-dogfooding: Centralized production config validation
   */
  static validateProductionSetting(
    projectName: string,
    prodConfig: Record<string, unknown>,
    requirement: (typeof AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS)[keyof typeof AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS],
    violations: string[],
    suggestions: string[]
  ): void {
    const currentValue = prodConfig[requirement.key];

    if (currentValue !== requirement.expectedValue) {
      const messageKey = this.getMessageKeyForRequirement(requirement.key);
      if (messageKey) {
        // Type-safe message call - all VALIDATION_MESSAGES accept projectName or configs array
        const messageFn = this.VALIDATION_MESSAGES[messageKey];
        const message = messageFn(projectName as never); // Type assertion for union compatibility

        if (requirement.required && 'violationMessage' in message) {
          violations.push(message.violationMessage as string);
        }

        if ('suggestionMessage' in message) {
          suggestions.push(message.suggestionMessage);
        }
      }
    }
  }

  /**
   * Map requirement key to validation message key
   */
  private static getMessageKeyForRequirement(
    requirementKey: string
  ): keyof typeof AngularBundleConfiguration.VALIDATION_MESSAGES | null {
    const keyMap: Record<
      string,
      keyof typeof AngularBundleConfiguration.VALIDATION_MESSAGES
    > = {
      [ANGULAR_CONSTANTS.AOT]: 'AOT_DISABLED',
      [ANGULAR_CONSTANTS.BUILD_OPTIMIZER]: 'BUILD_OPTIMIZER_DISABLED',
      [ANGULAR_CONSTANTS.EXTRACT_LICENSES]: 'LICENSE_EXTRACTION_DISABLED',
      [ANGULAR_CONSTANTS.SOURCE_MAP]: 'SOURCE_MAPS_ENABLED',
    };

    return keyMap[requirementKey] ?? null;
  }
}
