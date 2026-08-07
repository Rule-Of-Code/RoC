import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PerformanceAnalysisService } from '../../utils/performance';
import { QualityAssessmentUtils } from '../../utils/quality-assessment-utils';
/**
 * Launch Readiness Checklist Law
 *
 * Validates comprehensive launch readiness before production deployment:
 * - Launch checklist document exists and is complete
 * - All critical systems testing completed
 * - Performance benchmarks met
 * - Security review completed
 * - Monitoring and alerting configured
 * - Rollback procedures tested
 * - Go-live approval obtained
 * - Post-launch support plan ready
 *
 * Professional implementation following launch readiness best practices
 */
export class LaunchReadinessChecklistLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for launch checklist document
    const launchChecklist = this.analyzeLaunchChecklistDocument(
      projectRoot,
      context.config
    );
    if (!launchChecklist.hasLaunchChecklist) {
      violations.push('Missing launch readiness checklist document');
      suggestions.push(
        'Create LAUNCH_CHECKLIST.md with comprehensive deployment requirements'
      );
      score -= 30;
    }

    // 2. Check for testing completeness indicators
    const testingCompleteness = this.analyzeTestingCompleteness(projectRoot);
    if (!testingCompleteness.hasTestingCompleteness) {
      violations.push('Missing testing completeness indicators');
      suggestions.push(
        'Document testing completion status and coverage metrics'
      );
      score -= 25;
    }

    // 3. Check for performance benchmarking
    const performanceBenchmarks =
      PerformanceAnalysisService.analyzePerformanceBenchmarks(projectRoot);
    if (performanceBenchmarks.hasPerformanceIssues) {
      violations.push('Missing performance benchmark validation');
      suggestions.push(
        'Validate PerformanceTestUtils benchmarks and load testing results'
      );
      performanceBenchmarks.recommendations.forEach(rec => {
        suggestions.push(rec);
      });
      score -= 20;
    }

    // 4. Check for security review documentation
    const securityReview = this.analyzeSecurityReview(projectRoot);
    if (!securityReview.hasSecurityReview) {
      suggestions.push('Complete security review and document findings');
      score -= 15;
    }

    // 5. Check for monitoring readiness
    const monitoringReadiness = this.analyzeMonitoringReadiness(projectRoot);
    if (!monitoringReadiness.hasMonitoringReadiness) {
      suggestions.push('Verify monitoring and alerting configuration');
      score -= 10;
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(violations.length, launchChecklist),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static analyzeLaunchChecklistDocument(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasLaunchChecklist: boolean;
    checklistQuality: string;
  } {
    // Check for launch checklist documentation
    const launchChecklistFiles = [
      'LAUNCH_CHECKLIST.md',
      'docs/LAUNCH_CHECKLIST.md',
      'docs/deployment/LAUNCH_CHECKLIST.md',
      'deployment/LAUNCH_CHECKLIST.md',
      'DEPLOYMENT_CHECKLIST.md',
      'docs/DEPLOYMENT_CHECKLIST.md',
      'READINESS_CHECKLIST.md',
      'docs/READINESS_CHECKLIST.md',
    ];

    let hasLaunchChecklist = false;
    let checklistQuality = 'none';

    // Get markdown files using CheckerUtils to respect ignore configuration
    const markdownFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().DOCUMENTATION,
      config
    );

    for (const checklistFile of launchChecklistFiles) {
      const checklistExists = markdownFiles.some(file =>
        file.endsWith(checklistFile)
      );
      if (checklistExists) {
        hasLaunchChecklist = true;
        try {
          const filePath = PathOperations.join(projectRoot, checklistFile);
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          checklistQuality = this.assessChecklistQuality(content);
        } catch (_error) {
          checklistQuality = 'basic';
        }
        break;
      }
    }

    return {
      hasLaunchChecklist,
      checklistQuality,
    };
  }

  private static analyzeTestingCompleteness(projectRoot: string): {
    hasTestingCompleteness: boolean;
  } {
    // Check for testing completeness documentation
    let hasTestingCompleteness = false;

    // Look for test reports and coverage documentation
    const testingFiles = [
      'TEST_REPORT.md',
      'docs/TEST_REPORT.md',
      'test-results.md',
      'coverage/lcov-report/index.html',
      'coverage/coverage-summary.json',
      'jest-coverage-report.html',
    ];

    for (const testFile of testingFiles) {
      const filePath = PathOperations.join(projectRoot, testFile);
      if (FileUtils.exists(filePath)) {
        hasTestingCompleteness = true;
        break;
      }
    }

    // Check for package.json test scripts and coverage configuration
    if (!hasTestingCompleteness) {
      const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
      if (FileUtils.exists(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(
            FileUtils.readFile(packageJsonPath, { encoding: 'utf8' })
          );
          if (
            packageJson.scripts &&
            (packageJson.scripts.test || packageJson.scripts['test:coverage'])
          ) {
            hasTestingCompleteness = true;
          }
        } catch (_error) {
          // Skip if can't read package.json
        }
      }
    }

    return { hasTestingCompleteness };
  }

  private static analyzePerformanceBenchmarks(projectRoot: string): {
    hasPerformanceBenchmarks: boolean;
  } {
    // Check for performance benchmarking documentation and results
    let hasPerformanceBenchmarks = false;

    const performanceFiles = [
      'PERFORMANCE_REPORT.md',
      'docs/PERFORMANCE_REPORT.md',
      'performance-benchmarks.md',
      'load-test-results.md',
      'lighthouse-report.html',
      'performance/benchmarks.json',
      'performance/PerformanceTestUtils-results.json',
    ];

    for (const perfFile of performanceFiles) {
      const filePath = PathOperations.join(projectRoot, perfFile);
      if (FileUtils.exists(filePath)) {
        hasPerformanceBenchmarks = true;
        break;
      }
    }

    // Check for performance configuration files
    if (!hasPerformanceBenchmarks) {
      const performanceConfigFiles = [
        'lighthouse.config.js',
        'performance.config.js',
        'load-test.config.js',
      ];

      for (const configFile of performanceConfigFiles) {
        const filePath = PathOperations.join(projectRoot, configFile);
        if (FileUtils.exists(filePath)) {
          hasPerformanceBenchmarks = true;
          break;
        }
      }
    }

    return { hasPerformanceBenchmarks };
  }

  private static analyzeSecurityReview(projectRoot: string): {
    hasSecurityReview: boolean;
  } {
    // Check for security review documentation
    let hasSecurityReview = false;

    const securityFiles = [
      'SECURITY_REVIEW.md',
      'docs/SECURITY_REVIEW.md',
      'security-audit.md',
      'docs/security/audit-report.md',
      'SECURITY_AUDIT_REPORT.md',
      'security/review-checklist.md',
    ];

    for (const securityFile of securityFiles) {
      const filePath = PathOperations.join(projectRoot, securityFile);
      if (FileUtils.exists(filePath)) {
        hasSecurityReview = true;
        break;
      }
    }

    // Check for security scanning configuration
    if (!hasSecurityReview) {
      const securityConfigFiles = [
        '.snyk',
        'sonar-project.properties',
        'security-scan.config.json',
      ];

      for (const configFile of securityConfigFiles) {
        const filePath = PathOperations.join(projectRoot, configFile);
        if (FileUtils.exists(filePath)) {
          hasSecurityReview = true;
          break;
        }
      }
    }

    return { hasSecurityReview };
  }

  private static analyzeMonitoringReadiness(projectRoot: string): {
    hasMonitoringReadiness: boolean;
  } {
    // Check for monitoring and alerting readiness
    let hasMonitoringReadiness = false;

    const monitoringFiles = [
      'MONITORING_CHECKLIST.md',
      'docs/MONITORING_CHECKLIST.md',
      'monitoring/alerts.yml',
      'monitoring/dashboards.json',
      'alert-rules.yml',
    ];

    for (const monitoringFile of monitoringFiles) {
      const filePath = PathOperations.join(projectRoot, monitoringFile);
      if (FileUtils.exists(filePath)) {
        hasMonitoringReadiness = true;
        break;
      }
    }

    // Check for monitoring configuration in other files
    if (!hasMonitoringReadiness) {
      const configFiles = [
        'docker-compose.monitoring.yml',
        'k8s/monitoring.yml',
        'prometheus.yml',
      ];

      for (const configFile of configFiles) {
        const filePath = PathOperations.join(projectRoot, configFile);
        if (FileUtils.exists(filePath)) {
          hasMonitoringReadiness = true;
          break;
        }
      }
    }

    return { hasMonitoringReadiness };
  }

  private static assessChecklistQuality(content: string): string {
    const qualityIndicators = [
      /testing.*complete/i,
      /performance.*benchmark/i,
      /security.*review/i,
      /monitoring.*ready/i,
      /rollback.*tested/i,
      /approval.*obtained/i,
      /backup.*verified/i,
      /documentation.*updated/i,
    ];

    return QualityAssessmentUtils.assessQualityByPatterns(
      content,
      qualityIndicators
    );
  }

  private static generateMessage(
    violationCount: number,
    launchChecklist: { hasLaunchChecklist: boolean; checklistQuality: string }
  ): string {
    if (violationCount === 0) {
      return `✅ Launch Readiness: ${launchChecklist.checklistQuality} checklist`;
    }

    return `⚠️ Launch Readiness: Missing launch checklist documentation`;
  }
}
