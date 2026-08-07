import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils } from '../../../../utils/file-utils';
import { RealUserMonitoringConstants } from '../constants/real-user-monitoring.constants';

/**
 * Real User Monitoring Analyzer Service
 *
 * Single Responsibility: Analyze RUM configuration
 */
export class RealUserMonitoringAnalyzerService {
  static async checkRealUserMonitoring(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    configured: boolean;
  }> {
    try {
      // Check for RUM configuration in main files
      const rumConfigLocations =
        await RealUserMonitoringConstants.getRumConfigLocations(
          projectRoot,
          config
        );
      for (const mainFilePath of rumConfigLocations) {
        if (FileUtils.exists(mainFilePath)) {
          const content = FileUtils.readFile(mainFilePath, {
            encoding: 'utf8',
          });
          if (RealUserMonitoringConstants.hasRumIndicators(content)) {
            return { configured: true };
          }
        }
      }

      return { configured: false };
    } catch {
      return { configured: false };
    }
  }
}
