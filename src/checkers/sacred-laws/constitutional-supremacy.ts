/**
 * Constitutional Supremacy Doctrine Law
 * Constitutional law supremacy over all other project standards
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { dependenciesIncludeRuleOfCode } from '../../utils/ruleofcode-package';
export class ConstitutionalSupremacyLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const constitutionalCompliance = this.checkConstitutionalCompliance(
      context.projectRoot
    );
    violations.push(...constitutionalCompliance.violations);
    suggestions.push(...constitutionalCompliance.suggestions);

    // Check for rule enforcement
    const ruleEnforcement = this.checkRuleEnforcement(context.projectRoot);
    violations.push(...ruleEnforcement.violations);
    suggestions.push(...ruleEnforcement.suggestions);

    // Check for governance structures
    const governance = this.checkGovernanceStructures(context.projectRoot);
    suggestions.push(...governance.suggestions);

    return {
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Constitutional supremacy maintained'
          : `${violations.length} constitutional violations found`,
      violations,
      suggestions: violations.length > 0 ? suggestions : [],
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 20),
      fixable: violations.length > 0,
      config: context.config,
    };
  }

  private static checkConstitutionalCompliance(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for RuleOfCode configuration
    const ruleofcodeConfig = PathOperations.join(
      projectRoot,
      'ruleofcode.config.json'
    );
    if (!FileUtils.exists(ruleofcodeConfig)) {
      violations.push(
        'Missing constitutional law configuration in ruleofcode.config.json'
      );
      suggestions.push('Create ruleofcode.config.json for law enforcement');
    }

    // Check for constitutional documentation
    const constitutionalDocs = [
      'CONSTITUTION.md',
      'docs/CONSTITUTION.md',
      'docs/constitutional/',
    ];
    const hasConstitutionalDocs = constitutionalDocs.some(doc =>
      FileUtils.exists(PathOperations.join(projectRoot, doc))
    );

    if (!hasConstitutionalDocs) {
      suggestions.push(
        'Document constitutional principles in project documentation'
      );
    }

    return { violations, suggestions };
  }

  private static checkRuleEnforcement(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for enforcement mechanisms
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = FileSystemOperations.readJsonFile(
          packageJsonPath,
          {}
        ) as {
          scripts?: Record<string, string>;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          [key: string]: unknown;
        };

        if (
          !packageJson.scripts?.['check:laws'] &&
          !packageJson.scripts?.['audit:constitutional']
        ) {
          violations.push('No constitutional law enforcement scripts');
          suggestions.push(
            'Add check:laws script to package.json for automated enforcement'
          );
        }

        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        if (!dependenciesIncludeRuleOfCode(allDeps)) {
          suggestions.push(
            'Install RuleOfCode (the ruleofcode package) for constitutional enforcement'
          );
        }
      } catch (_error) {
        // Continue if package.json can't be parsed
      }
    }

    return { violations, suggestions };
  }

  private static checkGovernanceStructures(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for governance documentation
    const governanceFiles = [
      'GOVERNANCE.md',
      'CODEOWNERS',
      '.github/CODEOWNERS',
    ];
    const hasGovernance = governanceFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    if (!hasGovernance) {
      suggestions.push(
        'Establish governance structures with GOVERNANCE.md and CODEOWNERS'
      );
    }

    // Check for decision records
    const decisionRecords = ['docs/decisions/', 'docs/adr/', 'ADR/'];
    const hasDecisionRecords = decisionRecords.some(dir =>
      FileUtils.exists(PathOperations.join(projectRoot, dir))
    );

    if (!hasDecisionRecords) {
      suggestions.push('Document architectural decisions in ADR format');
    }

    return { violations, suggestions };
  }
}
