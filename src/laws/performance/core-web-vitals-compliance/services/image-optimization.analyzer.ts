import type { RuleOfCodeConfig } from '../../../../config/types';
import { AngularComponentFiles } from '../../../../utils/angular-component-files';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { FileUtils } from '../../../../utils/file-utils';
import {
  markupText,
  scriptText,
  VUE_EXTENSION,
} from '../../../../utils/vue/vue-sfc';
import type { ReactPerformanceEvidence } from '../../../../utils/react/react-performance-source';
import type { BundlerReport } from '../../../../utils/react/web-bundler-config';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { ImageOptimizationResult } from '../constants/types';

/**
 * Lists the image optimizations a project has; one is enough. Counted: a
 * next/image `<Image>` in a Next app whose optimizer is on, a lazy `<Image>` or
 * `<img loading="lazy">` in React source, any .webp file in the scanned tree,
 * or an Angular component using `loading="lazy"` or IntersectionObserver.
 */
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
    // Vue components too (#607): loading="lazy" read in the template, an
    // IntersectionObserver in the script. An Angular file is read as it is.
    const componentFiles = [
      ...AngularComponentFiles.find(projectRoot, config),
      ...CheckerUtils.findFilesByExtension(
        projectRoot,
        [VUE_EXTENSION],
        config
      ),
    ];

    for (const file of componentFiles) {
      try {
        // file is already an absolute path from CheckerUtils.findFilesByExtension
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        if (
          markupText(file, content).includes(
            Checks.IMAGE_KEYWORDS.LOADING_LAZY
          ) ||
          scriptText(file, content).includes(
            Checks.IMAGE_KEYWORDS.INTERSECTION_OBSERVER
          )
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
