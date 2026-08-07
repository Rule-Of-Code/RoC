import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { CoreWebVitalsFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { LighthouseCheckResult } from '../constants/types';

export class LighthouseAnalyzerService {
  static analyze(projectRoot: string): LighthouseCheckResult {
    const configFiles: string[] = [];
    const configPaths = FileDiscovery.getLighthouseConfigPaths(projectRoot);

    for (const configPath of configPaths) {
      if (FileUtils.exists(configPath)) {
        configFiles.push(PathOperations.getBasename(configPath));
      }
    }

    return {
      hasConfig: configFiles.length > 0,
      configFiles,
    };
  }
}
