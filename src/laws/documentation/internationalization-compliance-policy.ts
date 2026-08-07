import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PathResolver } from '../../utils/path-resolver';
// Interfaces for i18n analysis
interface I18nConfig {
  sourceLocale?: string;
  locales?: Record<
    string,
    string | { baseHref?: string; translation?: string }
  >;
  [key: string]: object | string | undefined;
}

interface AngularProject {
  i18n?: I18nConfig;
  architect?: {
    build?: {
      configurations?: Record<string, BuildConfiguration>;
    };
  };
}

interface BuildConfiguration {
  aot?: boolean;
  outputPath?: string;
  i18nMissingTranslation?: string;
  [key: string]: boolean | number | object | string | undefined;
}

/**
 * Internationalization (i18n) Compliance Policy Law
 *
 * Validates internationalization implementation and compliance:
 * - Angular i18n configuration present
 * - Translation files exist for supported locales
 * - No hardcoded text in templates
 * - i18n directives usage in templates
 * - Locale-specific configurations
 * - Date and number formatting localization
 * - Proper text extraction and management
 * - Translation keys consistency
 *
 * Professional implementation following Angular i18n best practices
 */
export class InternationalizationCompliancePolicyLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for Angular i18n configuration
    const i18nConfig = this.analyzeI18nConfiguration(projectRoot);
    if (!i18nConfig.hasI18nConfig) {
      violations.push('Missing Angular i18n configuration');
      suggestions.push(
        'Configure Angular i18n in angular.json and add @angular/localize'
      );
      score -= 30;
    }

    // 2. Check for translation files
    const translationFiles = this.analyzeTranslationFiles(projectRoot, context);
    if (!translationFiles.hasTranslationFiles) {
      violations.push('Missing i18n translation files');
      suggestions.push(
        'Create translation files for supported locales (messages.xlf, locale/*.json)'
      );
      score -= 25;
    }

    // 3. Check for hardcoded text in templates
    const hardcodedText = this.analyzeHardcodedText(projectRoot, context);
    if (hardcodedText.hasHardcodedText) {
      violations.push('Hardcoded text found in templates');
      suggestions.push('Extract hardcoded text to i18n translation keys');
      score -= 20;
    }

    // 4. Check for i18n directive usage
    const i18nDirectives = this.analyzeI18nDirectiveUsage(projectRoot, context);
    if (!i18nDirectives.hasI18nDirectives) {
      // Advisory only — no violation, so no score deduction (see the
      // score/verdict coherence note in incident-response-protocol).
      suggestions.push('Use i18n directives for proper text localization');
    }

    // 5. Check for locale-specific configurations
    const localeConfig = await this.checkLocaleConfiguration(
      projectRoot,
      context.config
    );
    if (!localeConfig.hasLocaleConfig) {
      suggestions.push(
        'Configure locale-specific settings (date/number formats, currency)'
      );
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(violations.length, i18nConfig),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static analyzeI18nConfiguration(projectRoot: string): {
    hasI18nConfig: boolean;
    configQuality: string;
  } {
    // Check for Angular i18n configuration
    let hasI18nConfig = false;
    let configQuality = 'none';

    // Check angular.json for i18n configuration
    const angularJsonPath = PathOperations.join(projectRoot, 'angular.json');
    if (FileUtils.exists(angularJsonPath)) {
      try {
        const angularJson = JSON.parse(
          FileUtils.readFile(angularJsonPath, { encoding: 'utf8' })
        );
        if (this.hasAngularI18nConfig(angularJson)) {
          hasI18nConfig = true;
          configQuality = 'angular';
        }
      } catch (_error) {
        // Skip if can't read angular.json
      }
    }

    // Check package.json for @angular/localize
    if (!hasI18nConfig) {
      try {
        if (this.hasLocalizePackage(projectRoot)) {
          hasI18nConfig = true;
          configQuality = 'localize';
        }
      } catch (_error) {
        // Skip if can't read package.json
      }
    }

    return {
      hasI18nConfig,
      configQuality,
    };
  }

  private static analyzeTranslationFiles(
    projectRoot: string,
    context?: LawCheckContext
  ): {
    hasTranslationFiles: boolean;
    translationQuality: string;
  } {
    const hasTranslationFiles =
      this.checkTranslationDirectories(projectRoot, context) ||
      this.checkAngularExtractionFiles(projectRoot);

    return {
      hasTranslationFiles,
      translationQuality: hasTranslationFiles ? 'basic' : 'none',
    };
  }

  private static checkTranslationDirectories(
    projectRoot: string,
    context?: LawCheckContext
  ): boolean {
    const translationPaths = [
      'src/locale',
      'src/i18n',
      'src/assets/i18n',
      'locale',
      'i18n',
    ];

    for (const translationPath of translationPaths) {
      const dirPath = PathOperations.join(projectRoot, translationPath);
      if (FileUtils.exists(dirPath)) {
        try {
          const jsonFiles = CheckerUtils.findFilesByExtension(
            dirPath,
            ['.json'],
            context?.config ?? FileUtils.getMinimalDefaultConfig()
          );
          if (
            jsonFiles.some(file =>
              this.isTranslationFile(PathOperations.getBasename(file))
            )
          ) {
            return true;
          }
        } catch (_error) {
          // Skip directories that can't be read
        }
      }
    }
    return false;
  }

  private static checkAngularExtractionFiles(projectRoot: string): boolean {
    const extractionFiles = [
      'messages.xlf',
      'messages.xmb',
      'messages.json',
      'src/messages.xlf',
      'src/locale/messages.en.xlf',
    ];

    for (const extractionFile of extractionFiles) {
      const filePath = PathOperations.join(projectRoot, extractionFile);
      if (FileUtils.exists(filePath)) {
        return true;
      }
    }
    return false;
  }

  private static analyzeHardcodedText(
    projectRoot: string,
    context?: LawCheckContext
  ): {
    hasHardcodedText: boolean;
    hardcodedTextCount: number;
  } {
    // Check for hardcoded text in Angular templates
    let hasHardcodedText = false;

    // Search for HTML template files
    const srcDir = PathOperations.join(projectRoot, 'src');
    if (FileUtils.exists(srcDir)) {
      hasHardcodedText = this.scanDirectoryForHardcodedText(
        srcDir,
        context ?? {
          projectRoot,
          config: FileUtils.getMinimalDefaultConfig(),
        }
      );
    }

    return { hasHardcodedText, hardcodedTextCount: hasHardcodedText ? 1 : 0 };
  }

  private static analyzeI18nDirectiveUsage(
    projectRoot: string,
    context?: LawCheckContext
  ): {
    hasI18nDirectives: boolean;
    directiveUsageCount: number;
  } {
    // Check for i18n directive usage in templates
    let hasI18nDirectives = false;

    const srcDir = PathOperations.join(projectRoot, 'src');
    if (FileUtils.exists(srcDir)) {
      hasI18nDirectives = this.scanDirectoryForI18nDirectives(srcDir, context);
    }

    return {
      hasI18nDirectives,
      directiveUsageCount: hasI18nDirectives ? 1 : 0,
    };
  }

  private static async checkLocaleConfiguration(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    hasLocaleConfig: boolean;
    supportedLocales: string[];
  }> {
    // Check for locale-specific configuration
    let hasLocaleConfig = false;

    // Get app files using PathResolver
    let appFiles: string[];
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [appModulePaths, mainTsPaths, appConfigPaths] = await Promise.all([
        resolver.getAppModulePaths(),
        resolver.getMainTsPaths(),
        resolver.getAppConfigPaths(),
      ]);
      appFiles = [...appModulePaths, ...mainTsPaths, ...appConfigPaths];
    } else {
      appFiles = [
        PathOperations.join(projectRoot, 'src/app/app.module.ts'),
        PathOperations.join(projectRoot, 'src/main.ts'),
        PathOperations.join(projectRoot, 'src/app/app.config.ts'),
      ];
    }

    for (const filePath of appFiles) {
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasLocaleRegistration(content)) {
            hasLocaleConfig = true;
            break;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return { hasLocaleConfig, supportedLocales: hasLocaleConfig ? ['en'] : [] };
  }

  private static hasAngularI18nConfig(
    angularJson: Record<string, unknown>
  ): boolean {
    // Check for i18n configuration in angular.json
    if (angularJson.projects) {
      for (const projectName in angularJson.projects as Record<
        string,
        unknown
      >) {
        const project = (angularJson.projects as Record<string, unknown>)[
          projectName
        ] as AngularProject;
        if (this.hasProjectI18nConfig(project)) {
          return true;
        }
      }
    }
    return false;
  }

  private static hasLocalizePackage(projectRoot: string): boolean {
    try {
      const dependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      return !!(
        dependencies['@angular/localize'] ??
        dependencies['@angular/common/locales'] ??
        dependencies['@ngx-translate/core']
      );
    } catch {
      return false;
    }
  }

  private static isTranslationFile(filename: string): boolean {
    const translationExtensions = [
      '.xlf',
      '.xmb',
      '.json',
      '.po',
      '.yaml',
      '.yml',
    ];
    const localePatterns = [
      /^[a-z]{2}(-[A-Z]{2})?\./,
      /messages\./,
      /locale\./,
    ];

    return (
      translationExtensions.some(ext => filename.endsWith(ext)) ||
      localePatterns.some(pattern => pattern.test(filename))
    );
  }

  private static scanDirectoryForHardcodedText(
    dirPath: string,
    context: LawCheckContext
  ): boolean {
    try {
      const htmlFiles = CheckerUtils.findFilesByExtension(
        dirPath,
        CheckerUtils.getCommonExtensions().ANGULAR,
        context.config
      );

      for (const filePath of htmlFiles) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasHardcodedTextInTemplate(content)) {
            return true;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }

    return false;
  }

  private static scanDirectoryForI18nDirectives(
    dirPath: string,
    context?: LawCheckContext
  ): boolean {
    try {
      const htmlFiles = CheckerUtils.findFilesByExtension(
        dirPath,
        CheckerUtils.getCommonExtensions().ANGULAR,
        context?.config ?? FileUtils.getMinimalDefaultConfig()
      );

      for (const filePath of htmlFiles) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasI18nDirectivesInTemplate(content)) {
            return true;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }

    return false;
  }

  private static hasHardcodedTextInTemplate(content: string): boolean {
    // Simple heuristic to detect hardcoded text
    // Look for text between > and < that isn't i18n-enabled
    const textPatterns = [
      />[\s]*[A-Za-z][A-Za-z\s]{3,}[\s]*</g, // Text between tags
      /placeholder\s*=\s*["'][A-Za-z][A-Za-z\s]{3,}["']/g, // Placeholder attributes
      /title\s*=\s*["'][A-Za-z][A-Za-z\s]{3,}["']/g, // Title attributes
    ];

    return textPatterns.some(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        // Check if any matches don't have i18n attributes nearby
        return matches.some(match => !this.hasI18nMarkers(match, content));
      }
      return false;
    });
  }

  private static hasI18nDirectivesInTemplate(content: string): boolean {
    const i18nPatterns = [
      /i18n\s*=/i,
      /i18n-[a-zA-Z]+\s*=/i,
      /{{\s*['"][^'"]+['"]\s*\|\s*translate\s*}}/i,
      /\$localize/i,
    ];

    return i18nPatterns.some(pattern => pattern.test(content));
  }

  private static hasI18nMarkers(match: string, fullContent: string): boolean {
    const matchIndex = fullContent.indexOf(match);
    if (matchIndex === -1) return false;

    // Check surrounding context for i18n markers
    const contextStart = Math.max(0, matchIndex - 100);
    const contextEnd = Math.min(
      fullContent.length,
      matchIndex + match.length + 100
    );
    const context = fullContent.slice(contextStart, contextEnd);

    return /i18n[-=\s]/i.test(context) || /translate/i.test(context);
  }

  private static hasLocaleRegistration(content: string): boolean {
    const localePatterns = [
      /registerLocaleData/i,
      /LOCALE_ID/i,
      /provideI18nSupport/i,
      /@angular\/common\/locales/i,
    ];

    return localePatterns.some(pattern => pattern.test(content));
  }

  private static generateMessage(
    violationCount: number,
    i18nConfig: { hasI18nConfig: boolean; configQuality: string }
  ): string {
    if (violationCount === 0) {
      return `✅ i18n Compliance: ${i18nConfig.configQuality} configuration`;
    }

    return '⚠️ i18n Compliance: Missing internationalization setup';
  }

  private static hasProjectI18nConfig(project: AngularProject): boolean {
    if (project.i18n || project.architect?.build?.configurations) {
      const buildConfigs = project.architect?.build?.configurations;
      if (buildConfigs) {
        for (const configName in buildConfigs) {
          const config = buildConfigs[configName];
          if (config?.aot !== undefined || config?.localize !== undefined) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
