/**
 * Sacred Law Base Class
 * Common functionality for all Sacred Laws
 */

import type { LawResult } from '../../types/law.types';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { ResultBuilder } from '../../utils/result-builder';

export class SacredLawBase {
  public static createResult(
    violations: string[],
    title: string,
    type: string,
    suggestions: string[] = []
  ): LawResult {
    return ResultBuilder.create({
      violations,
      title,
      type,
      suggestions,
      config: ConfigFileUtils.getMinimalDefaultConfig(),
    });
  }

  public static getPackageJson(
    projectRoot: string
  ): Record<string, unknown> | null {
    try {
      const content = FileUtils.readFileContentSync(
        PathOperations.join(projectRoot, 'package.json')
      );
      return content ? JSON.parse(content) : null;
    } catch {
      return null;
    }
  }

  public static hasDependency(
    projectRoot: string,
    dependency: string
  ): boolean {
    try {
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      return Object.keys(deps).includes(dependency);
    } catch {
      return false;
    }
  }
}
