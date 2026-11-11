import type { RuleOfCodeConfig } from '../../../../config/types';
import { AngularComponentFiles } from '../../../../utils/angular-component-files';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { FileUtils } from '../../../../utils/file-utils';
import type { ReactPerformanceEvidence } from '../../../../utils/react/react-performance-source';
import type { BundlerReport } from '../../../../utils/react/web-bundler-config';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { ImageOptimizationResult } from '../constants/types';

export class ImageOptimizationAnalyzerService {
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig,
    react?: ReactPerformanceEvidence,
    bundler?: BundlerReport
  ): ImageOptimizationResult {
    const optimizations: string[] = [];

    // React/Next, read from .tsx/.jsx rather than Angular component files:
    // `<Image>` through Next's optimizer (served as WebP by default), and lazy
    // `<Image>` / `<img loading="lazy">`.
    const nextOptimizerOn = (bundler?.apps ?? []).some(
      app => app.kind === 'next' && app.builds && !app.imagesUnoptimized
    );
    if (react && nextOptimizerOn && react.optimizedImages.length > 0) {
      optimizations.push(`next/image optimizer: ${react.optimizedImages[0]}`);
    }
    if (react && react.lazyImages.length > 0) {
      optimizations.push(`Lazy images: ${react.lazyImages[0]}`);
    }

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
