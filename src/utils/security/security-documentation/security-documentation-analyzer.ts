/**
 * Security Documentation Analyzer
 * Clean facade for security documentation analysis
 */

import * as Config from './security-documentation-configuration';
import { validateSecurityDocumentation } from './security-documentation-validation-patterns';

export class SecurityDocumentationAnalyzer {
  static checkSecurityDocumentation(
    projectRoot: string
  ): Config.DocumentationCheckResult {
    return validateSecurityDocumentation(projectRoot);
  }

  static getSecurityDocumentationRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }

  static getDocumentationTemplates(): Record<string, readonly string[]> {
    return Config.DOCUMENTATION_TEMPLATES;
  }
}
