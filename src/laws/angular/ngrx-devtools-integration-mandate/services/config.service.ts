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

      let configured = false;
      let hasEnvironmentCheck = false;
      let hasConfigOptions = false;

      for (const filePath of configFiles) {
        const content = FileUtils.readFile(filePath);
        if (!content) {
          console.log(
            `⚠️  [NgRxDevTools] File not found or empty: ${filePath}`
          );
          continue;
        }

        // Checking NgRx DevTools configuration

        if (Patterns.hasDevToolsIntegration(content)) {
          configured = true;
        }

        if (Patterns.hasEnvironmentCondition(content)) {
          hasEnvironmentCheck = true;
        }

        if (Patterns.hasConfigOptions(content)) {
          hasConfigOptions = true;
        }

        if (configured && hasEnvironmentCheck && hasConfigOptions) {
          break;
        }
      }

      return {
        configured,
        hasEnvironmentCheck,
        hasConfigOptions,
      };
    } catch {
      return {
        configured: false,
        hasEnvironmentCheck: false,
        hasConfigOptions: false,
      };
    }
  }
}
