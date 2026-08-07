import type { RuleOfCodeConfig } from '../../../../config/types';
import { AngularComponentFiles } from '../../../../utils/angular-component-files';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { FileUtils } from '../../../../utils/file-utils';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { ImageOptimizationResult } from '../constants/types';

export class ImageOptimizationAnalyzerService {
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): ImageOptimizationResult {
    const optimizations: string[] = [];

    // Check for WebP images
    const webpCount = this.getWebpImageCount(projectRoot, config);
    if (webpCount > 0) {
      optimizations.push(`WebP images found: ${webpCount}`);
    }

    // Check for lazy loading implementation
    if (this.hasLazyLoadingImplementation(projectRoot, config)) {
      optimizations.push('Lazy loading implementation detected');
    }

    return {
      isOptimized: optimizations.length >= 1,
      optimizations,
    };
  }

  private static getWebpImageCount(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): number {
    try {
      const webpFiles = CheckerUtils.findFilesByExtension(
        projectRoot,
        ['webp'],
        config
      );
      return webpFiles.length;
    } catch {
      return 0;
    }
  }

  private static hasLazyLoadingImplementation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): boolean {
    const componentFiles = AngularComponentFiles.find(projectRoot, config);

    for (const file of componentFiles) {
      try {
        // file is already an absolute path from CheckerUtils.findFilesByExtension
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        if (
          content.includes(Checks.IMAGE_KEYWORDS.LOADING_LAZY) ||
          content.includes(Checks.IMAGE_KEYWORDS.INTERSECTION_OBSERVER)
        ) {
          return true;
        }
      } catch {
        // Ignore file read errors
      }
    }

    return false;
  }
}
