/**
 * Angular Service Layer Architecture Law Implementation
 * Ensures proper service layer design and dependency injection
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularDependencyInjectionAnalyzer } from '../../utils/angular/angular-dependency-injection';
import { AngularServiceArchitectureAnalyzer } from '../../utils/angular/angular-service-architecture';
import { AngularServiceOrganizationAnalyzer } from '../../utils/angular/angular-service-organization';

export class AngularServiceLayerArchitectureLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check service architecture patterns using specialized utility
    const serviceAnalysis =
      AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
        context.projectRoot,
        context.config
      );
    violations.push(...serviceAnalysis.violations);
    suggestions.push(...serviceAnalysis.suggestions);

    // Check dependency injection patterns using specialized utility
    const diAnalysis =
      AngularDependencyInjectionAnalyzer.checkDependencyInjection(
        context.projectRoot,
        context.config
      );
    violations.push(...diAnalysis.violations);
    suggestions.push(...diAnalysis.suggestions);

    // Check service organization using specialized utility
    const organizationAnalysis =
      AngularServiceOrganizationAnalyzer.checkServiceOrganization(
        context.projectRoot,
        context.config
      );
    violations.push(...organizationAnalysis.violations);
    suggestions.push(...organizationAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Angular Service Layer Architecture',
      message:
        violations.length === 0
          ? 'Angular Service Layer Architecture compliance verified'
          : `${violations.length} Angular Service Layer Architecture violations found`,
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
