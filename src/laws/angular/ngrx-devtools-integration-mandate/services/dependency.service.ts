/**
 * Dependency check analyzer service
 * Responsibility: Check if @ngrx/store-devtools is installed
 */

import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { NgRxDevToolsPatternConstants as Patterns } from '../constants/patterns';
import type { DependencyCheckResult } from '../constants/types';

export class NgRxDevToolsDependencyService {
  static checkDependency(projectRoot: string): DependencyCheckResult {
    try {
      // Use ProjectTypeDetectorValidation to get dependencies
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      const version = deps[Patterns.STORE_DEVTOOLS_PACKAGE];

      return {
        installed: !!version,
        version: version ?? undefined,
      };
    } catch {
      return { installed: false };
    }
  }
}
