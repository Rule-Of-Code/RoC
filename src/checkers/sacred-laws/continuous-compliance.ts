/**
 * Continuous Compliance Doctrine Law
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { dependenciesIncludeRuleOfCode } from '../../utils/ruleofcode-package';
import { PathOperations } from '../../utils/path-operations';
import { SacredLawUtilities } from './shared-sacred-utilities';

export class ContinuousComplianceLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for continuous monitoring
    const monitoringAnalysis = this.checkContinuousMonitoring(
      context.projectRoot,
      context.config
    );
    violations.push(...monitoringAnalysis.violations);
    suggestions.push(...monitoringAnalysis.suggestions);

    // Check for compliance automation
    const complianceAutomation = this.checkComplianceAutomation(
      context.projectRoot
    );
    violations.push(...complianceAutomation.violations);
    suggestions.push(...complianceAutomation.suggestions);

    // Check for reporting mechanisms
    const reporting = this.checkReportingMechanisms(context.projectRoot);
    suggestions.push(...reporting.suggestions);

    return SacredLawUtilities.createSacredLawResult(
      violations,
      suggestions,
      'Continuous compliance monitoring active',
      'compliance monitoring gaps found'
    );
  }

  private static checkContinuousMonitoring(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for monitoring configuration
    const monitoringConfigs = [
      'ruleofcode.config.json',
      '.eslintrc.js',
      'sonar-project.properties',
      '.github/workflows',
    ];

    const hasMonitoring = monitoringConfigs.some(config =>
      FileUtils.exists(PathOperations.join(projectRoot, config))
    );

    if (!hasMonitoring) {
      violations.push(
        'No continuous monitoring configuration detected in ruleofcode.config.json or .github/workflows/'
      );
      suggestions.push('Set up continuous quality monitoring tools');
    }

    // Check for scheduled compliance checks
    const githubWorkflows = PathOperations.join(
      projectRoot,
      '.github/workflows'
    );
    if (FileUtils.exists(githubWorkflows)) {
      const workflowFiles = CheckerUtils.findFilesByExtension(
        githubWorkflows,
        ['yml', 'yaml'],
        config
      );
      const hasScheduledChecks = workflowFiles.some((file: string) => {
        try {
          const content = FileUtils.readFile(
            PathOperations.join(githubWorkflows, file),
            { encoding: 'utf8' }
          );
          return content.includes('schedule:') || content.includes('cron:');
        } catch {
          return false;
        }
      });

      if (!hasScheduledChecks) {
        suggestions.push('Add scheduled compliance checks to CI/CD pipeline');
      }
    }

    return { violations, suggestions };
  }

  private static checkComplianceAutomation(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    return SacredLawUtilities.checkPackageScripts(
      projectRoot,
      (scripts, violations, suggestions) => {
        // Check for compliance checking scripts
        const complianceScripts = [
          'check:laws',
          'audit:constitutional',
          'compliance:check',
          'quality:gate',
        ];
        const hasComplianceScript = complianceScripts.some(
          script => scripts[script]
        );

        if (!hasComplianceScript) {
          violations.push('No automated compliance checking scripts');
          suggestions.push(
            'Add compliance checking scripts for automated monitoring'
          );
        }

        // Check for automated reporting
        if (!scripts['report:compliance'] && !scripts['report:quality']) {
          suggestions.push('Add automated compliance reporting scripts');
        }

        // Check for constitutional enforcement
        const deps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
        if (!dependenciesIncludeRuleOfCode(deps)) {
          violations.push('No constitutional law enforcement tools detected');
          suggestions.push(
            'Install RuleOfCode for automated FileHeaderComplianceAnalyzer constitutional compliance'
          );
        }
      }
    );
  }

  private static checkReportingMechanisms(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for compliance documentation
    const complianceDocs = [
      'docs/COMPLIANCE.md',
      'COMPLIANCE_REPORT.md',
      'docs/constitutional/COMPLIANCE.md',
    ];

    const hasComplianceDocs = complianceDocs.some(doc =>
      FileUtils.exists(PathOperations.join(projectRoot, doc))
    );

    if (!hasComplianceDocs) {
      suggestions.push('Create compliance documentation and reports');
    }

    // Check for automated compliance badges
    const readmePath = PathOperations.join(projectRoot, 'README.md');
    if (FileUtils.exists(readmePath)) {
      try {
        const readmeContent = FileUtils.readFile(readmePath);
        if (
          !readmeContent.includes('badge') &&
          !readmeContent.includes('shields.io')
        ) {
          suggestions.push(
            'Add compliance status badges to README for transparency'
          );
        }
      } catch (_error) {
        // Continue if README can't be read
      }
    }

    // Check for integration with external compliance tools
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const deps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

        const complianceTools = ['sonarjs', 'codecov', 'coveralls'];
        const hasComplianceIntegration = complianceTools.some(
          tool => deps[tool]
        );

        if (!hasComplianceIntegration) {
          suggestions.push(
            'Integrate with external compliance monitoring tools (SonarCloud, Codecov)'
          );
        }
      } catch (_error) {
        // Continue if package.json can't be parsed
      }
    }

    return { violations, suggestions };
  }
}
