/**
 * Configuration analyzer service
 * Responsibility: Analyze if DevTools is properly configured in app files
 */

import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils } from '../../../../utils';
import { NgRxDevToolsFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import { NgRxDevToolsPatternConstants as Patterns } from '../constants/patterns';
import type { DevToolsConfigResult } from '../constants/types';

export class NgRxDevToolsConfigService {
  static async analyzeConfiguration(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<DevToolsConfigResult> {
    try {
      const configFiles = await FileDiscovery.getConfigFilePaths(
        projectRoot,
        config
      );

      if (configFiles.length === 0) {
        return {
          configured: false,
          hasEnvironmentCheck: false,
          hasConfigOptions: false,
        };
      }

      const found: DevToolsConfigResult = {
        configured: false,
        hasEnvironmentCheck: false,
        hasConfigOptions: false,
      };

      for (const filePath of configFiles) {
        const content = FileUtils.readFile(filePath);
        if (!content) {
          console.log(
            `⚠️  [NgRxDevTools] File not found or empty: ${filePath}`
          );
          continue;
        }

        // Checking NgRx DevTools configuration
        this.markFound(content, found);

        if (
          found.configured &&
          found.hasEnvironmentCheck &&
          found.hasConfigOptions
        ) {
          break;
        }
      }

      return {
        configured: found.configured,
        hasEnvironmentCheck: found.hasEnvironmentCheck,
        hasConfigOptions: found.hasConfigOptions,
      };
    } catch {
      return {
        configured: false,
        hasEnvironmentCheck: false,
        hasConfigOptions: false,
      };
    }
  }

  /** What one config file shows: the integration, an environment check, options. */
  private static markFound(content: string, found: DevToolsConfigResult): void {
    if (Patterns.hasDevToolsIntegration(content)) {
      found.configured = true;
    }

    if (Patterns.hasEnvironmentCondition(content)) {
      found.hasEnvironmentCheck = true;
    }

    if (Patterns.hasConfigOptions(content)) {
      found.hasConfigOptions = true;
    }
  }
}
