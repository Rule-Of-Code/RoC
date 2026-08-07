import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PerformanceAnalysisService } from '../../utils/performance';
interface PipelineAnalysis {
  hasPipeline: boolean;
  pipelineType: string;
  pipelineContent: string;
}

interface ConstitutionalChecks {
  hasConstitutionalValidation: boolean;
  validationTypes?: string[];
  coverage?: number;
}

interface QualityGates {
  hasQualityGates: boolean;
  gateTypes?: string[];
  coverage?: number;
}

interface SecurityChecks {
  hasSecurityValidation: boolean;
  securityTypes?: string[];
  coverage?: number;
}

interface PerformanceTesting {
  hasPerformanceTesting: boolean;
  testingTypes?: string[];
  coverage?: number;
}

interface ApprovalProcess {
  hasApprovalGates: boolean;
  approvalTypes?: string[];
  coverage?: number;
}

interface RollbackCapabilities {
  hasRollbackStrategy: boolean;
  rollbackTypes?: string[];
  coverage?: number;
}

/**
 * CI/CD Constitutional Tribunal Law
 *
 * Comprehensive CI/CD pipeline validation that ensures:
 * - Constitutional compliance checks are mandatory first steps
 * - Pipeline rejects violations without appeal
 * - Proper CI/CD configuration and enforcement
 * - Quality gates and compliance validation
 * - Security and performance checks integration
 * - Automated constitutional validation
 *
 * Professional implementation following CI/CD constitutional governance
 */
export class CicdConstitutionalTribunalLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;

    // Initialize configurable thresholds
    const thresholds = {
      noPipelineDeduction:
        config.thresholds?.deployment?.cicd?.noPipelineDeduction ?? 30,
      noConstitutionalChecksDeduction:
        config.thresholds?.deployment?.cicd?.noConstitutionalChecksDeduction ??
        25,
      noQualityGatesDeduction:
        config.thresholds?.deployment?.cicd?.noQualityGatesDeduction ?? 20,
      noSecurityScanningDeduction:
        config.thresholds?.deployment?.cicd?.noSecurityScanningDeduction ?? 20,
      noPerformanceTestingDeduction:
        config.thresholds?.deployment?.cicd?.noPerformanceTestingDeduction ??
        10,
      noApprovalGatesDeduction:
        config.thresholds?.deployment?.cicd?.noApprovalGatesDeduction ?? 10,
      noRollbackStrategyDeduction:
        config.thresholds?.deployment?.cicd?.noRollbackStrategyDeduction ?? 10,
    };

    // 1. Check for CI/CD pipeline files
    const pipelineAnalysis = this.analyzeCICDPipelines(projectRoot);
    if (!pipelineAnalysis.hasPipeline) {
      violations.push('No CI/CD pipeline configuration found');
      suggestions.push(
        'Create CI/CD pipeline with GitHub Actions, GitLab CI, or similar'
      );
      score -= thresholds.noPipelineDeduction;
    }

    // 2. Check for constitutional checks in pipeline
    const constitutionalChecks = this.analyzeConstitutionalChecks(
      projectRoot,
      pipelineAnalysis
    );
    if (!constitutionalChecks.hasConstitutionalValidation) {
      violations.push(
        'CI/CD pipeline missing constitutional compliance validation'
      );
      suggestions.push(
        'Add RuleOfCode constitutional checks as mandatory first step'
      );
      score -= thresholds.noConstitutionalChecksDeduction;
    }

    // 3. Check for quality gates
    const qualityGates = this.analyzeQualityGates(
      projectRoot,
      pipelineAnalysis
    );
    if (!qualityGates.hasQualityGates) {
      violations.push('CI/CD pipeline missing quality gates');
      suggestions.push(
        'Implement quality gates for code coverage, linting, and tests'
      );
      score -= thresholds.noQualityGatesDeduction;
    }

    // 4. Check for security scanning integration
    const securityScanning = this.analyzeSecurityScanning(
      projectRoot,
      pipelineAnalysis
    );
    if (!securityScanning.hasSecurityValidation) {
      violations.push('CI/CD pipeline missing security scanning');
      suggestions.push('Add security vulnerability scanning to pipeline');
      score -= thresholds.noSecurityScanningDeduction;
    }

    // 5. Check for PerformanceTestUtils integration (suggestions only, not violations)
    const performanceTesting =
      PerformanceAnalysisService.analyzePerformanceTesting(projectRoot);
    if (performanceTesting.hasPerformanceIssues) {
      suggestions.push(
        'Consider adding PerformanceTestUtils to CI/CD pipeline'
      );
      performanceTesting.recommendations.forEach(rec => {
        suggestions.push(rec);
      });
      // Optional enhancement - don't penalize score for suggestions
    }

    // 6. Check for deployment approval process (suggestions only, not violations)
    const approvalProcess = this.analyzeApprovalProcess(
      projectRoot,
      pipelineAnalysis
    );
    if (!approvalProcess.hasApprovalGates) {
      suggestions.push(
        'Consider adding approval gates for production deployments'
      );
      // Optional enhancement - don't penalize score for suggestions
    }

    // 7. Check for rollback capabilities (suggestions only, not violations)
    const rollbackCapabilities = this.analyzeRollbackCapabilities(
      projectRoot,
      pipelineAnalysis
    );
    if (!rollbackCapabilities.hasRollbackStrategy) {
      suggestions.push('Implement automated rollback capabilities');
      // Optional enhancement - don't penalize score for suggestions
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        pipelineAnalysis,
        constitutionalChecks
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static analyzeCICDPipelines(projectRoot: string): PipelineAnalysis {
    const pipelineFiles = [
      '.github/workflows/ci.yml',
      '.github/workflows/ci.yaml',
      '.github/workflows/main.yml',
      '.github/workflows/build.yml',
      '.gitlab-ci.yml',
      'azure-pipelines.yml',
      'bitbucket-pipelines.yml',
      'Jenkinsfile',
      '.circleci/config.yml',
      '.travis.yml',
      'buildkite.yml',
    ];

    let hasPipeline = false;
    let pipelineType = '';
    let pipelineContent = '';

    for (const filename of pipelineFiles) {
      const filePath = PathOperations.join(projectRoot, filename);
      if (FileUtils.exists(filePath)) {
        hasPipeline = true;
        pipelineType = filename;
        try {
          pipelineContent = FileUtils.readFile(filePath, { encoding: 'utf8' });
        } catch (_error) {
          // Skip files that can't be read
        }
        break;
      }
    }

    return { hasPipeline, pipelineType, pipelineContent };
  }

  private static analyzeConstitutionalChecks(
    projectRoot: string,
    pipelineAnalysis: PipelineAnalysis
  ): ConstitutionalChecks {
    if (!pipelineAnalysis.hasPipeline) {
      return { hasConstitutionalValidation: false };
    }

    const constitutionalPatterns = [
      /ruleofcode/i, // RuleOfCode checks
      /constitutional/i, // Constitutional checks
      /compliance.*check/i, // Compliance validation
      /rule.*check/i, // Rule validation
      /npm run.*constitutional/i, // Constitutional npm scripts
      /yarn.*constitutional/i, // Constitutional yarn scripts
    ];

    const hasConstitutionalValidation = constitutionalPatterns.some(pattern =>
      pattern.test(pipelineAnalysis.pipelineContent)
    );

    return { hasConstitutionalValidation };
  }

  private static analyzeQualityGates(
    projectRoot: string,
    pipelineAnalysis: PipelineAnalysis
  ): QualityGates {
    if (!pipelineAnalysis.hasPipeline) {
      return { hasQualityGates: false };
    }

    const qualityGatePatterns = [
      /test.*coverage/i, // Test coverage checks
      /lint/i, // Linting
      /eslint/i, // ESLint
      /typescript.*check/i, // TypeScript checks
      /build.*fail/i, // Build failure handling
      /quality.*gate/i, // Explicit quality gates
      /sonar/i, // SonarQube integration
    ];

    const hasQualityGates = qualityGatePatterns.some(pattern =>
      pattern.test(pipelineAnalysis.pipelineContent)
    );

    return { hasQualityGates };
  }

  private static analyzeSecurityScanning(
    projectRoot: string,
    pipelineAnalysis: PipelineAnalysis
  ): SecurityChecks {
    if (!pipelineAnalysis.hasPipeline) {
      return { hasSecurityValidation: false };
    }

    const securityPatterns = [
      /security.*scan/i, // Security scanning
      /vulnerability.*scan/i, // Vulnerability scanning
      /npm.*audit/i, // NPM audit
      /yarn.*audit/i, // Yarn audit
      /snyk/i, // Snyk security
      /codeql/i, // GitHub CodeQL
      /dependabot/i, // Dependabot
      /safety.*check/i, // Safety checks
    ];

    const hasSecurityScanning = securityPatterns.some(pattern =>
      pattern.test(pipelineAnalysis.pipelineContent)
    );

    return { hasSecurityValidation: hasSecurityScanning };
  }

  private static analyzePerformanceTesting(
    projectRoot: string,
    pipelineAnalysis: PipelineAnalysis
  ): PerformanceTesting {
    if (!pipelineAnalysis.hasPipeline) {
      return { hasPerformanceTesting: false };
    }

    const performancePatterns = [
      /lighthouse/i, // Lighthouse CI
      /load.*test/i, // Load testing
      /BundleSizeAnalyzer.*bundle.*size/i, // Bundle size checks
      /web.*vitals/i, // Web Vitals
      /performance.*budget/i, // Performance budgets
    ];

    const hasPerformanceTesting = performancePatterns.some(pattern =>
      pattern.test(pipelineAnalysis.pipelineContent)
    );

    return { hasPerformanceTesting };
  }

  private static analyzeApprovalProcess(
    projectRoot: string,
    pipelineAnalysis: PipelineAnalysis
  ): ApprovalProcess {
    if (!pipelineAnalysis.hasPipeline) {
      return { hasApprovalGates: false };
    }

    const approvalPatterns = [
      /approval/i, // Approval gates
      /manual.*trigger/i, // Manual triggers
      /environment.*protection/i, // Environment protection
      /deployment.*gate/i, // Deployment gates
      /review.*required/i, // Review requirements
    ];

    const hasApprovalGates = approvalPatterns.some(pattern =>
      pattern.test(pipelineAnalysis.pipelineContent)
    );

    return { hasApprovalGates };
  }

  private static analyzeRollbackCapabilities(
    projectRoot: string,
    pipelineAnalysis: PipelineAnalysis
  ): RollbackCapabilities {
    if (!pipelineAnalysis.hasPipeline) {
      return { hasRollbackStrategy: false };
    }

    const rollbackPatterns = [
      /rollback/i, // Rollback steps
      /revert/i, // Revert capabilities
      /blue.*green/i, // Blue-green deployment
      /canary/i, // Canary deployment
      /previous.*version/i, // Previous version restoration
    ];

    const hasRollbackStrategy = rollbackPatterns.some(pattern =>
      pattern.test(pipelineAnalysis.pipelineContent)
    );

    return { hasRollbackStrategy };
  }

  private static generateMessage(
    violationCount: number,
    pipelineAnalysis: PipelineAnalysis,
    constitutionalChecks: ConstitutionalChecks
  ): string {
    if (violationCount === 0) {
      return '✅ CI/CD Constitutional Tribunal: Pipeline enforces FileHeaderComplianceAnalyzer compliance';
    }

    if (!pipelineAnalysis.hasPipeline) {
      return '⚠️ CI/CD Constitutional Tribunal: No CI/CD pipeline found';
    }

    if (!constitutionalChecks.hasConstitutionalValidation) {
      return '⚠️ CI/CD Constitutional Tribunal: Missing FileHeaderComplianceAnalyzer validation';
    }

    return `⚠️ CI/CD Constitutional Tribunal: ${violationCount} compliance issues found`;
  }
}
