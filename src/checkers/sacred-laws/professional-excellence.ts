/**
 * Professional Excellence Mandate Law
 * Enterprise-grade professional code quality standards
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { NxWorkspace } from '../../utils/nx-workspace';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';
import type { QualityTool } from './package-json-utilities';
import { PackageJsonUtilities } from './package-json-utilities';
export class ProfessionalExcellenceLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check code quality tools
    const qualityTools = this.checkQualityTools(context.projectRoot);
    violations.push(...qualityTools.violations);
    suggestions.push(...qualityTools.suggestions);

    // Check professional standards
    const professionalStandards = this.checkProfessionalStandards(
      context.projectRoot
    );
    violations.push(...professionalStandards.violations);
    suggestions.push(...professionalStandards.suggestions);

    // Check enterprise practices
    const enterprisePractices = this.checkEnterprisePractices(
      context.projectRoot
    );
    suggestions.push(...enterprisePractices.suggestions);

    return LawBase.buildDetailedResult({
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Professional excellence standards met'
          : `${violations.length} professional standard violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 15),
      context,
    });
  }

  private static checkQualityTools(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const ENHANCED_QC = 'enhanced quality control';

    // Essential quality tools
    const essentialTools: QualityTool[] = [
      { name: 'eslint', purpose: 'Code linting', required: true },
      { name: 'prettier', purpose: 'Code formatting', required: true },
      { name: 'typescript', purpose: 'Type safety', required: true },
    ];

    // Advanced quality tools
    const advancedTools: QualityTool[] = [
      { name: 'husky', purpose: ENHANCED_QC, required: false },
      {
        name: 'lint-staged',
        purpose: ENHANCED_QC,
        required: false,
      },
      {
        name: 'commitizen',
        purpose: ENHANCED_QC,
        required: false,
      },
      {
        name: '@commitlint/cli',
        purpose: ENHANCED_QC,
        required: false,
      },
    ];

    const essentialResult = PackageJsonUtilities.checkRequiredDependencies(
      projectRoot,
      essentialTools
    );

    const advancedResult = PackageJsonUtilities.checkRequiredDependencies(
      projectRoot,
      advancedTools
    );

    // Combine results
    return {
      violations: [...essentialResult.violations, ...advancedResult.violations],
      suggestions: [
        ...essentialResult.suggestions,
        ...advancedResult.suggestions,
      ],
    };
  }

  private static checkProfessionalStandards(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Each concern is satisfied by ANY of its accepted filenames, resolved across
    // the workspace (root + apps/<name>/). The old check demanded the legacy
    // `.eslintrc.js` by exact name and reported "Missing .eslintrc.js" against a
    // project using flat config (eslint.config.mjs) — the ESLint 9 default for
    // two years — and the legacy `.prettierrc` against `.prettierrc.json`.
    const configConcerns = [
      {
        canonical: 'eslint.config.mjs',
        purpose: 'ESLint configuration',
        accepts: [
          'eslint.config.mjs',
          'eslint.config.js',
          'eslint.config.cjs',
          'eslint.config.ts',
          '.eslintrc.js',
          '.eslintrc.cjs',
          '.eslintrc.json',
          '.eslintrc.yaml',
          '.eslintrc.yml',
        ],
      },
      {
        canonical: 'tsconfig.json',
        purpose: 'TypeScript configuration',
        accepts: ['tsconfig.json', 'tsconfig.base.json'],
      },
      {
        canonical: '.prettierrc',
        purpose: 'Code formatting rules',
        accepts: [
          '.prettierrc',
          '.prettierrc.json',
          '.prettierrc.js',
          '.prettierrc.cjs',
          '.prettierrc.mjs',
          '.prettierrc.yaml',
          '.prettierrc.yml',
          'prettier.config.js',
          'prettier.config.mjs',
          'prettier.config.cjs',
        ],
      },
    ];

    for (const concern of configConcerns) {
      const present = concern.accepts.some(
        name => NxWorkspace.resolveSourceFiles(projectRoot, name).length > 0
      );
      if (!present) {
        violations.push(`Missing ${concern.canonical}`);
        suggestions.push(
          `Create ${concern.canonical} for ${concern.purpose}`
        );
      }
    }

    // Check for code standards documentation
    const standardsDocs = [
      'CODING_STANDARDS.md',
      'docs/STANDARDS.md',
      'STYLE_GUIDE.md',
    ];
    const hasStandardsDocs = standardsDocs.some(doc =>
      FileUtils.exists(PathOperations.join(projectRoot, doc))
    );

    if (!hasStandardsDocs) {
      suggestions.push('Document coding standards and style guidelines');
    }

    return { violations, suggestions };
  }

  private static checkEnterprisePractices(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for enterprise practices
    const enterprisePractices = [
      { file: 'SECURITY.md', purpose: 'Security policy' },
      { file: 'CODE_OF_CONDUCT.md', purpose: 'Code of conduct' },
      { file: '.github/workflows', purpose: 'CI/CD automation' },
      { file: 'sonar-project.properties', purpose: 'Code quality analysis' },
    ];

    for (const practice of enterprisePractices) {
      if (!FileUtils.exists(PathOperations.join(projectRoot, practice.file))) {
        suggestions.push(
          `Consider adding ${practice.file} for ${practice.purpose}`
        );
      }
    }

    // Check for monitoring and observability
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const deps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

        if (
          !Object.keys(deps).some(
            dep => dep.includes('sentry') || dep.includes('bugsnag')
          )
        ) {
          suggestions.push(
            'Consider adding error tracking for enterprise monitoring'
          );
        }
      } catch (_error) {
        // Continue if package.json can't be parsed
      }
    }

    return { violations, suggestions };
  }
}
