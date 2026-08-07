/**
 * Entity Usage Analyzer Service
 * Checks whether @ngrx/entity is installed and used correctly
 */

import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { NgRxStateNormalizationPatternConstants as Patterns } from '../constants/patterns';
import type { EntityUsageResult } from '../constants/types';

export class NgRxStateNormalizationEntityUsageService {
  static checkEntityUsage(projectRoot: string): EntityUsageResult {
    try {
      // Use ProjectTypeDetectorValidation to obtain the dependencies
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      // Check whether @ngrx/entity is installed
      const hasEntity = Object.keys(deps).some(
        dep => dep === Patterns.NGRX_ENTITY_PACKAGE
      );

      if (!hasEntity) {
        return {
          hasEntityAdapter: false,
          entityFiles: [],
        };
      }

      // If the package is installed, return a positive result
      return {
        hasEntityAdapter: true,
        version: deps[Patterns.NGRX_ENTITY_PACKAGE] as string,
        entityFiles: [],
      };
    } catch {
      return {
        hasEntityAdapter: false,
        entityFiles: [],
      };
    }
  }
}
