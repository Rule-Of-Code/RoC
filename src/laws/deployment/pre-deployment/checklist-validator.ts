import type { RuleOfCodeConfig } from '../../../config/types';
import type { LawCheckContext } from '../../../types/law.types';
import { ChecklistValidatorBase } from '../../../utils/deployment/checklist-validator-base';

/**
 * Checklist Document Validator
 * Validates PRE_DEPLOYMENT_CHECKLIST.md existence and completion
 */
export class ChecklistDocumentValidator extends ChecklistValidatorBase {
  validate(context: LawCheckContext): {
    isValid: boolean;
    exists: boolean;
    isComplete: boolean;
    completionRate: number;
    totalItems: number;
    completedItems: number;
    errors?: string[];
    warnings?: string[];
  } {
    const result = this.checkPreDeploymentChecklist(
      context.projectRoot,
      context.config
    );
    return {
      isValid: result.exists && result.isComplete,
      errors:
        result.exists && result.isComplete
          ? []
          : ['Checklist validation failed'],
      warnings: [],
      ...result,
    };
  }

  checkPreDeploymentChecklist(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    exists: boolean;
    isComplete: boolean;
    completionRate: number;
    totalItems: number;
    completedItems: number;
    missingConcerns: string[];
    missingAdvisedConcerns: string[];
  } {
    // Structure, not ticked boxes: the checklist in a repo is a TEMPLATE, and
    // its boxes belong to an actual deployment. Demanding 90% ticked meant
    // demanding a committed lie (a backend consumer).
    return ChecklistValidatorBase.validateChecklistFile(
      projectRoot,
      config,
      'PRE_DEPLOYMENT_CHECKLIST.md'
    );
  }

  generateChecklistTemplate(): string {
    return `# Pre-Deployment Checklist

## Build & Testing
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Build compiles without errors
- [ ] No TypeScript/linting errors

## Security
- [ ] Security vulnerability scan complete
- [ ] No high/critical vulnerabilities found
- [ ] Authentication/authorization working
- [ ] Input validation implemented

## Performance
- [ ] Performance benchmarks meet requirements
- [ ] No performance regressions detected
- [ ] Database queries optimized
- [ ] Caching implemented where needed

## Configuration
- [ ] Environment variables configured
- [ ] Database connections validated
- [ ] Third-party integrations tested
- [ ] Feature flags configured

## Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Deployment guide updated
- [ ] Rollback procedures documented

## Monitoring
- [ ] Health checks implemented
- [ ] Logging configured
- [ ] Alerts configured
- [ ] Metrics collection enabled

## Final Checks
- [ ] Staging deployment successful
- [ ] Smoke tests pass in staging
- [ ] Rollback strategy prepared
- [ ] Team notification sent
`;
  }
}

export const checklistValidator = new ChecklistDocumentValidator();
