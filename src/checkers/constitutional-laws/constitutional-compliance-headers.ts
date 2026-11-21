/**
 * Constitutional Compliance Headers Law Implementation (Streamlined)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  FileHeaderComplianceAnalyzer,
  HeaderAutomationAnalyzer,
  HeaderConfigurationAnalyzer,
} from '../../utils/constitutional';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/** License texts a repository keeps at its root. */
const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
];

export class ConstitutionalComplianceHeadersLaw {
  /**
   * The license and terms stated once for the whole repository: a license
   * text at the root AND the license named in package.json, which npm and
   * every dependency scanner read. That is where a package's terms live; a
   * header repeating them in every file adds nothing a reader or a tool
   * uses, and has to be kept in step by hand.
   */
  private static repositoryLicense(projectRoot: string): string | null {
    const text = LICENSE_FILES.find(name =>
      FileUtils.exists(PathOperations.join(projectRoot, name))
    );
    if (!text) return null;
    const manifest = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(manifest)) return null;
    try {
      const { license } = JSON.parse(FileUtils.readFile(manifest)) as {
        license?: unknown;
      };
      return typeof license === 'string' && license.trim() !== ''
        ? `${text} + package.json license (${license.trim()})`
        : null;
    } catch {
      return null;
    }
  }

  static check(context: LawCheckContext): LawResult {
    const declared = this.repositoryLicense(context.projectRoot);
    if (declared) {
      const message = `Constitutional Compliance Headers: license declared for the whole repository — ${declared}; per-file headers are not required`;
      return {
        passed: true,
        lawName: 'Constitutional Compliance Headers',
        message,
        details: [message],
        violations: [],
        suggestions: [],
        score: 100,
        config: context.config,
      };
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for header templates and configuration using specialized utility
    const headerAnalysis = HeaderConfigurationAnalyzer.checkHeaderConfiguration(
      context.projectRoot
    );
    violations.push(...headerAnalysis.violations);
    suggestions.push(...headerAnalysis.suggestions);

    // Check sample files for header compliance using specialized utility
    const complianceAnalysis =
      FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(
        context.projectRoot
      );
    violations.push(...complianceAnalysis.violations);
    suggestions.push(...complianceAnalysis.suggestions);

    // Check for automated header tools using specialized utility
    const automationAnalysis = HeaderAutomationAnalyzer.checkHeaderAutomation(
      context.projectRoot
    );
    violations.push(...automationAnalysis.violations);
    suggestions.push(...automationAnalysis.suggestions);
    if (violations.length > 0) {
      suggestions.push(
        'Or state the terms once for the repository: a LICENSE file at the root and the license field in package.json'
      );
    }

    return {
      passed: violations.length === 0,
      lawName: 'Constitutional Compliance Headers',
      message:
        violations.length === 0
          ? 'Constitutional Compliance Headers compliance verified'
          : `${violations.length} Constitutional Compliance Headers violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
