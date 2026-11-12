import * as fs from 'fs';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PerformanceAlertingConstants } from '../constants/performance-alerting.constants';

/**
 * Performance Alerting Policy Analyzer Service
 *
 * Single Responsibility: Analyze performance alerting configuration
 *
 * Three routes: a monitoring vendor's config that declares alerts, a Lighthouse
 * CI config with assertions (a regression fails the pipeline), and a CI
 * workflow that runs a performance check and notifies someone. Until 7.26.2
 * only the first was read — the workflow check was declared and never called,
 * and `.lighthouserc.js` could never count (`'.lighthouserc.js'.split('.')[0]`
 * is `''`) — so a correctly monitored app could pass only by adding a vendor
 * file it does not use.
 */
export class PerformanceAlertingPolicyAnalyzerService {
  static checkPerformanceAlerting(projectRoot: string): {
    hasAlerts: boolean;
    alertSources: string[];
  } {
    const alertSources: string[] = [];

    for (const configFile of PerformanceAlertingConstants.MONITORING_CONFIG_FILES) {
      const content = this.read(projectRoot, configFile);
      if (content !== null && PerformanceAlertingConstants.hasAlertConfiguration(content)) {
        alertSources.push(`${this.serviceName(configFile)} alerts (${configFile})`);
      }
    }

    for (const configFile of PerformanceAlertingConstants.LIGHTHOUSE_CI_FILES) {
      const content = this.read(projectRoot, configFile);
      if (content !== null && PerformanceAlertingConstants.hasLighthouseAssertions(content)) {
        alertSources.push(`Lighthouse CI assertions (${configFile})`);
      }
    }

    for (const workflow of this.workflowFiles(projectRoot)) {
      const content = this.read(projectRoot, workflow);
      if (content !== null && PerformanceAlertingConstants.hasGithubAlerts(content)) {
        alertSources.push(`CI workflow alerts (${workflow})`);
      }
    }

    return {
      hasAlerts: alertSources.length > 0,
      alertSources,
    };
  }

  /** `newrelic.js` → `Newrelic`; a leading dot is not the name. */
  private static serviceName(configFile: string): string {
    const name = configFile.replace(/^\.+/, '').split('.')[0] ?? configFile;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private static workflowFiles(projectRoot: string): string[] {
    const dir = PathOperations.join(projectRoot, PerformanceAlertingConstants.WORKFLOWS_DIR);
    if (!FileUtils.exists(dir)) return [];
    try {
      return fs
        .readdirSync(dir)
        .filter(name => /\.ya?ml$/i.test(name))
        .sort()
        .map(name => `${PerformanceAlertingConstants.WORKFLOWS_DIR}/${name}`);
    } catch {
      return [];
    }
  }

  private static read(projectRoot: string, file: string): string | null {
    const fullPath = PathOperations.join(projectRoot, file);
    if (!FileUtils.exists(fullPath)) return null;
    try {
      return FileUtils.readFile(fullPath, { encoding: 'utf8' });
    } catch {
      // Unreadable = no alert found here; the law then fails, it does not pass.
      return null;
    }
  }
}
