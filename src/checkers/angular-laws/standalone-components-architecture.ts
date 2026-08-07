/**
 * Standalone Components Architecture Law Implementation
 * Enforces Angular standalone components usage for better modularity
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { AngularComponentFiles } from '../../utils/angular-component-files';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';
import { AngularLawBase } from './angular-law-base';

export class StandaloneComponentsArchitectureLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for Angular project structure
    const angularAnalysis = this.checkAngularProject(context.projectRoot);
    violations.push(...angularAnalysis.violations);
    suggestions.push(...angularAnalysis.suggestions);

    // Check for standalone components usage
    const standaloneAnalysis = this.checkStandaloneComponents(
      context.projectRoot,
      context.config
    );
    violations.push(...standaloneAnalysis.violations);
    suggestions.push(...standaloneAnalysis.suggestions);

    // Check for proper imports configuration
    const importsAnalysis = this.checkImportsConfiguration(context.projectRoot);
    violations.push(...importsAnalysis.violations);
    suggestions.push(...importsAnalysis.suggestions);

    return LawBase.createResult(
      violations,
      'Standalone Components Architecture',
      '',
      suggestions,
      context
    );
  }

  private static checkAngularProject(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for Angular configuration files
    const angularConfigs = CheckerUtils.getCommonExtensions().CONFIG;

    const hasAngularConfig = angularConfigs.some(config =>
      FileUtils.exists(PathOperations.join(projectRoot, config))
    );

    if (!hasAngularConfig) {
      suggestions.push(
        'Ensure this is an Angular project with proper configuration'
      );
      return { violations, suggestions };
    }

    // Check for TypeScript configuration
    if (!ProjectTypeDetector.hasStrictTypeScriptConfig(projectRoot)) {
      suggestions.push(
        'Enable TypeScript strict mode for better standalone component type checking'
      );
    }

    return { violations, suggestions };
  }

  /**
   * Does this Angular version make standalone the default?
   *
   * v19 flipped it: a correct standalone component now OMITS the flag, and an
   * NgModule one is marked `standalone: false`. An unreadable version keeps the
   * pre-v19 reading rather than guessing.
   */
  private static standaloneIsDefault(projectRoot: string): boolean {
    const major = this.getAngularMajor(projectRoot);
    return major !== null && major >= 19;
  }

  /**
   * Reading a missing flag as "not standalone" FALSE-FAILED every modern
   * component: on v19+ the law told projects to fix code that was already right,
   * and the only way to satisfy it was to add a flag the framework no longer
   * wants. Before v19 the flag was genuinely required, so that reading holds.
   */
  private static isStandaloneComponent(
    content: string,
    standaloneIsDefault: boolean
  ): boolean {
    return standaloneIsDefault
      ? !/standalone\s*:\s*false/.test(content)
      : content.includes('standalone: true');
  }

  private static checkStandaloneComponents(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find component files
    const srcPath = PathOperations.join(projectRoot, 'src');
    if (!FileUtils.exists(srcPath)) {
      suggestions.push('Create src directory with Angular components');
      return { violations, suggestions };
    }

    const componentFiles = AngularComponentFiles.find(srcPath, config);
    if (componentFiles.length === 0) {
      suggestions.push(
        'Create Angular components using standalone architecture'
      );
      return { violations, suggestions };
    }

    let nonStandaloneComponents = 0;
    let totalComponents = 0;

    const standaloneIsDefault = this.standaloneIsDefault(projectRoot);

    for (const componentFile of componentFiles) {
      try {
        const content = FileUtils.readFile(componentFile);
        totalComponents++;

        const isStandalone = this.isStandaloneComponent(
          content,
          standaloneIsDefault
        );
        if (!isStandalone) {
          nonStandaloneComponents++;
        }

        if (isStandalone && !content.includes('imports:')) {
          suggestions.push(
            `Component ${PathOperations.getBasename(
              componentFile
            )} should define imports array`
          );
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    if (nonStandaloneComponents > 0) {
      violations.push(
        `${nonStandaloneComponents}/${totalComponents} components are not standalone`
      );
      suggestions.push('Convert components to standalone architecture');
    }

    return { violations, suggestions };
  }

  private static checkImportsConfiguration(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for main.ts bootstrap configuration
    const mainTsPath = PathOperations.join(projectRoot, 'src', 'main.ts');
    if (FileUtils.exists(mainTsPath)) {
      try {
        const mainContent = FileUtils.readFile(mainTsPath);

        if (!mainContent.includes('bootstrapApplication')) {
          violations.push(
            'main.ts should use bootstrapApplication for standalone components'
          );
          suggestions.push(
            'Update main.ts to use bootstrapApplication instead of platformBrowserDynamic'
          );
        }

        if (mainContent.includes('AppModule')) {
          violations.push(
            'main.ts should not reference AppModule in standalone architecture'
          );
          suggestions.push(
            'Remove AppModule dependency and use standalone component bootstrap'
          );
        }
      } catch (_error) {
        // Continue if main.ts can't be read
      }
    }

    // Check for app.config.ts
    const appConfigPath = PathOperations.join(
      projectRoot,
      'src',
      'app',
      'app.config.ts'
    );
    if (!FileUtils.exists(appConfigPath)) {
      suggestions.push(
        'Create app.config.ts for centralized application configuration'
      );
    } else {
      try {
        const configContent = FileUtils.readFile(appConfigPath);
        if (
          !configContent.includes('provideRouter') &&
          !configContent.includes('providers')
        ) {
          suggestions.push(
            'Configure providers in app.config.ts for dependency injection'
          );
        }
      } catch (_error) {
        // Continue if config can't be read
      }
    }

    return { violations, suggestions };
  }

  private static findComponentFiles(
    srcPath: string,
    config: RuleOfCodeConfig
  ): string[] {
    // CheckerUtils.findAngularFiles: Use CheckerUtils to find component files with proper ignore handling
    // Note: CheckerUtils works with project root, so adjust the search
    const srcIndex = srcPath.indexOf('/src');
    const projectRoot =
      srcIndex !== -1 ? srcPath.substring(0, srcIndex) : srcPath;
    return AngularComponentFiles.find(projectRoot, config).filter(
      (file: string) => file.startsWith(srcPath)
    );
  }
}
