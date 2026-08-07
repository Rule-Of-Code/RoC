/**
 * Code Review Quality Law Implementation (Streamlined)
 * Ensures high-quality code reviews with proper guidelines
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  AutomatedReviewToolsAnalyzer,
  ReviewGuidelinesAnalyzer,
  ReviewTemplatesAnalyzer,
} from '../../utils/git';
import { GitLawBase } from './git-law-base';
import { GitLawUtilities } from './shared-git-utilities';

export class CodeReviewQualityLaw {
  static check(context: LawCheckContext): LawResult {
    // Early git repository validation
    const gitValidationResult = GitLawUtilities.validateGitRepository(
      context,
      'Code Review Quality'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const { violations, suggestions } =
      GitLawUtilities.initializeGitValidation();

    // Check for code review guidelines using specialized utility
    const guidelinesAnalysis = ReviewGuidelinesAnalyzer.checkReviewGuidelines(
      context.projectRoot,
      context.config
    );
    violations.push(...guidelinesAnalysis.violations);
    suggestions.push(...guidelinesAnalysis.suggestions);

    // Check for review templates using specialized utility
    const templatesAnalysis = ReviewTemplatesAnalyzer.checkReviewTemplates(
      context.projectRoot,
      context.config
    );
    violations.push(...templatesAnalysis.violations);
    suggestions.push(...templatesAnalysis.suggestions);

    // Check for automated review tools using specialized utility
    const automationAnalysis =
      AutomatedReviewToolsAnalyzer.checkAutomatedReviewTools(
        context.projectRoot,
        context.config
      );
    violations.push(...automationAnalysis.violations);
    suggestions.push(...automationAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Code Review Quality',
      'Version Control',
      suggestions,
      context
    );
  }
}
