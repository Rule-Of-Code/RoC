/**
 * NgRx Feature Store Structure Mandate Law Implementation (SACRED LAW)
 * Enforces proper +state directory structure for NgRx features
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NgRxFeatureStoreStructureAnalyzer } from '../../utils/angular/ngrx-feature-store';
import { NgRxFileOrganizationAnalyzer } from '../../utils/angular/ngrx-file-organization';
import { NgRxNamingConventionsAnalyzer } from '../../utils/angular/ngrx-naming-conventions';

export class NgRxFeatureStoreStructureMandateLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for proper feature store structure using specialized utility
    const structureAnalysis =
      NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
        context.projectRoot,
        context.config
      );
    violations.push(...structureAnalysis.violations);
    suggestions.push(...structureAnalysis.suggestions);

    // Check for file organization using specialized utility
    const organizationAnalysis =
      NgRxFileOrganizationAnalyzer.checkFileOrganization(
        context.projectRoot,
        context.config
      );
    violations.push(...organizationAnalysis.violations);
    suggestions.push(...organizationAnalysis.suggestions);

    // Check for naming conventions using specialized utility
    const namingAnalysis = NgRxNamingConventionsAnalyzer.checkNamingConventions(
      context.projectRoot,
      context.config
    );
    violations.push(...namingAnalysis.violations);
    suggestions.push(...namingAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'NgRx Feature Store Structure Mandate',
      message:
        violations.length === 0
          ? 'NgRx Feature Store Structure Mandate compliance verified'
          : `${violations.length} NgRx Feature Store Structure Mandate violations found`,
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
