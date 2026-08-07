import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import {
  PerformanceBudgetComplianceCheckConstants,
  PerformanceBudgetComplianceFileDiscoveryConstants,
} from '../constants';

/**
 * ProductionMonitoringAnalyzerService
 *
 * Responsibility:
 * - Analyze production performance monitoring setup
 * - Verify monitoring services (Sentry, New Relic, Firebase, web-vitals)
 */
export class ProductionMonitoringAnalyzerService {
  /**
   * Analyze production performance monitoring
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { monitored: boolean; services: string[] } {
    const services: string[] = [];

    // Use ProjectTypeDetectorValidation utility for safe package.json reading
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    // Check for performance monitoring services
    for (const service of PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES) {
      if (allDeps[service]) {
        services.push(service);

        // Special handling for Firebase - check for Performance Monitoring in code
        if (service === 'firebase') {
          if (this.checkFirebasePerformanceInCode(projectRoot, config)) {
            services.push('Firebase Performance');
          }
        }
      }
    }

    // Check environment files for monitoring configuration
    if (this.checkEnvironmentFiles(projectRoot)) {
      if (!services.includes('Environment Config')) {
        services.push('Environment Config');
      }
    }

    return { monitored: services.length > 0, services };
  }

  /**
   * Check for Firebase Performance Monitoring in code
   */
  private static checkFirebasePerformanceInCode(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): boolean {
    const srcDirs = ['src', 'apps', 'libs'];

    for (const srcDir of srcDirs) {
      const srcPath = PathOperations.join(projectRoot, srcDir);
      if (!FileUtils.exists(srcPath)) continue;

      try {
        const files = CheckerUtils.findFilesByExtension(
          srcPath,
          ['.ts', '.js'],
          config
        );

        for (const file of files) {
          const content = FileUtils.readFile(file, { encoding: 'utf8' });
          if (
            content.includes('firebase/performance') ||
            content.includes('getPerformance')
          ) {
            return true;
          }
        }
      } catch {
        // Ignore file read errors
      }
    }
    return false;
  }

  /**
   * Check environment files for monitoring configuration
   */
  private static checkEnvironmentFiles(projectRoot: string): boolean {
    const envFiles = [
      PathOperations.join(projectRoot, 'src/environments/environment.prod.ts'),
      PathOperations.join(projectRoot, '.env.production'),
      PathOperations.join(projectRoot, '.env'),
    ];

    for (const envFile of envFiles) {
      if (FileUtils.exists(envFile)) {
        try {
          const content = FileUtils.readFile(envFile, { encoding: 'utf8' });
          if (
            PerformanceBudgetComplianceFileDiscoveryConstants.hasMonitoringKeywords(
              content
            )
          ) {
            return true;
          }
        } catch {
          // Ignore file read errors
        }
      }
    }
    return false;
  }
}
