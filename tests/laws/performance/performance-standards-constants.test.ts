/**
 * Tests for Performance Standards Constants
 *
 * Covers:
 * - BundleOptimizationConstants
 * - CachingStrategyConstants
 * - CoreWebVitalsConstants
 * - ImageOptimizationConstants
 * - LighthouseConstants
 * - PerformanceBudgetsConstants
 */

import { BundleOptimizationConstants } from '../../../src/laws/performance/performance-standards/constants/bundle-optimization.constants';
import { CachingStrategyConstants } from '../../../src/laws/performance/performance-standards/constants/caching-strategy.constants';
import { CoreWebVitalsConstants } from '../../../src/laws/performance/performance-standards/constants/core-web-vitals.constants';
import { ImageOptimizationConstants } from '../../../src/laws/performance/performance-standards/constants/image-optimization.constants';
import { LighthouseConstants } from '../../../src/laws/performance/performance-standards/constants/lighthouse.constants';
import { PerformanceBudgetsConstants } from '../../../src/laws/performance/performance-standards/constants/performance-budgets.constants';

describe('BundleOptimizationConstants', () => {
  describe('ANGULAR_OPTIMIZATION_PATTERNS', () => {
    it('should include optimization true pattern', () => {
      expect(BundleOptimizationConstants.ANGULAR_OPTIMIZATION_PATTERNS).toContain(
        '"optimization": true'
      );
    });

    it('should include buildOptimizer true pattern', () => {
      expect(BundleOptimizationConstants.ANGULAR_OPTIMIZATION_PATTERNS).toContain(
        '"buildOptimizer": true'
      );
    });
  });

  describe('WEBPACK_OPTIMIZATION_MARKERS', () => {
    it('should include optimization', () => {
      expect(BundleOptimizationConstants.WEBPACK_OPTIMIZATION_MARKERS).toContain('optimization');
    });

    it('should include minimize', () => {
      expect(BundleOptimizationConstants.WEBPACK_OPTIMIZATION_MARKERS).toContain('minimize');
    });

    it('should include minimizer', () => {
      expect(BundleOptimizationConstants.WEBPACK_OPTIMIZATION_MARKERS).toContain('minimizer');
    });
  });

  describe('hasAngularOptimization', () => {
    it('should return true when optimization is enabled', () => {
      const content = '{ "optimization": true }';
      expect(BundleOptimizationConstants.hasAngularOptimization(content)).toBe(true);
    });

    it('should return true when buildOptimizer is enabled', () => {
      const content = '{ "buildOptimizer": true }';
      expect(BundleOptimizationConstants.hasAngularOptimization(content)).toBe(true);
    });

    it('should return false when no optimization patterns found', () => {
      const content = '{ "optimization": false }';
      expect(BundleOptimizationConstants.hasAngularOptimization(content)).toBe(false);
    });
  });

  describe('hasWebpackOptimization', () => {
    it('should return true when optimization is present', () => {
      const content = 'module.exports = { optimization: {} }';
      expect(BundleOptimizationConstants.hasWebpackOptimization(content)).toBe(true);
    });

    it('should return true when minimize is present', () => {
      const content = 'module.exports = { minimize: true }';
      expect(BundleOptimizationConstants.hasWebpackOptimization(content)).toBe(true);
    });

    it('should return false when no optimization patterns found', () => {
      const content = 'module.exports = {}';
      expect(BundleOptimizationConstants.hasWebpackOptimization(content)).toBe(false);
    });
  });
});

describe('CachingStrategyConstants', () => {
  describe('SERVICE_WORKER_PATHS', () => {
    it('should include src/sw.js', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_PATHS).toContain('src/sw.js');
    });

    it('should include src/service-worker.js', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_PATHS).toContain('src/service-worker.js');
    });

    it('should include public/sw.js', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_PATHS).toContain('public/sw.js');
    });
  });

  describe('SERVICE_WORKER_FILE_PATTERNS', () => {
    it('should include sw.js pattern', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_FILE_PATTERNS).toContain('sw.js');
    });

    it('should include service-worker.js pattern', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_FILE_PATTERNS).toContain('service-worker.js');
    });
  });

  describe('SERVICE_WORKER_MARKERS', () => {
    it('should include serviceWorker', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_MARKERS).toContain('serviceWorker');
    });

    it('should include cache.put', () => {
      expect(CachingStrategyConstants.SERVICE_WORKER_MARKERS).toContain('cache.put');
    });
  });

  describe('isServiceWorkerFile', () => {
    it('should return true for sw.js file', () => {
      expect(CachingStrategyConstants.isServiceWorkerFile('src/sw.js')).toBe(true);
    });

    it('should return true for service-worker.js file', () => {
      expect(CachingStrategyConstants.isServiceWorkerFile('src/service-worker.js')).toBe(true);
    });

    it('should return false for regular js file', () => {
      expect(CachingStrategyConstants.isServiceWorkerFile('src/main.js')).toBe(false);
    });
  });

  describe('hasServiceWorkerConfig', () => {
    it('should return true when serviceWorker is present', () => {
      const content = '{ "serviceWorker": true }';
      expect(CachingStrategyConstants.hasServiceWorkerConfig(content)).toBe(true);
    });

    it('should return true when @angular/service-worker is present', () => {
      const content = 'import { ServiceWorkerModule } from "@angular/service-worker"';
      expect(CachingStrategyConstants.hasServiceWorkerConfig(content)).toBe(true);
    });

    it('should return false when no service worker patterns found', () => {
      const content = 'import { Component } from "@angular/core"';
      expect(CachingStrategyConstants.hasServiceWorkerConfig(content)).toBe(false);
    });
  });
});

describe('CoreWebVitalsConstants', () => {
  describe('static properties', () => {
    it('should have VIOLATION_MESSAGE', () => {
      expect(CoreWebVitalsConstants.VIOLATION_MESSAGE).toBe(
        'Core Web Vitals monitoring not implemented'
      );
    });

    it('should have INTEGRATION_VIOLATION_MESSAGE', () => {
      expect(CoreWebVitalsConstants.INTEGRATION_VIOLATION_MESSAGE).toBe(
        'Core Web Vitals library not integrated in main application files'
      );
    });

    it('should have VITALS_LIBRARY', () => {
      expect(CoreWebVitalsConstants.VITALS_LIBRARY).toBe('web-vitals');
    });

    it('should have VITALS_DEPENDENCY same as VITALS_LIBRARY', () => {
      expect(CoreWebVitalsConstants.VITALS_DEPENDENCY).toBe(CoreWebVitalsConstants.VITALS_LIBRARY);
    });
  });

  describe('VITALS_IMPORTS', () => {
    it('should include web-vitals', () => {
      expect(CoreWebVitalsConstants.VITALS_IMPORTS).toContain('web-vitals');
    });

    it('should include getCLS', () => {
      expect(CoreWebVitalsConstants.VITALS_IMPORTS).toContain('getCLS');
    });

    it('should include getFID', () => {
      expect(CoreWebVitalsConstants.VITALS_IMPORTS).toContain('getFID');
    });

    it('should include getLCP', () => {
      expect(CoreWebVitalsConstants.VITALS_IMPORTS).toContain('getLCP');
    });
  });

  describe('VITALS_USAGE_PATTERNS', () => {
    it('should include getCLS pattern', () => {
      expect(CoreWebVitalsConstants.VITALS_USAGE_PATTERNS).toContain('getCLS(');
    });

    it('should include getLCP pattern', () => {
      expect(CoreWebVitalsConstants.VITALS_USAGE_PATTERNS).toContain('getLCP(');
    });
  });

  describe('hasWebVitalsDependency', () => {
    it('should return true when web-vitals in dependencies', () => {
      const content = '{ "dependencies": { "web-vitals": "^3.0.0" } }';
      expect(CoreWebVitalsConstants.hasWebVitalsDependency(content)).toBe(true);
    });

    it('should return true when web-vitals in devDependencies', () => {
      const content = '{ "devDependencies": { "web-vitals": "^3.0.0" } }';
      expect(CoreWebVitalsConstants.hasWebVitalsDependency(content)).toBe(true);
    });

    it('should return false when web-vitals not in package.json', () => {
      const content = '{ "dependencies": { "lodash": "^4.0.0" } }';
      expect(CoreWebVitalsConstants.hasWebVitalsDependency(content)).toBe(false);
    });
  });

  describe('usesWebVitals', () => {
    it('should return true when getCLS is used', () => {
      const content = 'getCLS(console.log)';
      expect(CoreWebVitalsConstants.usesWebVitals(content)).toBe(true);
    });

    it('should return true when getLCP is used', () => {
      const content = 'getLCP(console.log)';
      expect(CoreWebVitalsConstants.usesWebVitals(content)).toBe(true);
    });

    it('should return false when web-vitals not used', () => {
      const content = 'console.log("test")';
      expect(CoreWebVitalsConstants.usesWebVitals(content)).toBe(false);
    });
  });
});

describe('ImageOptimizationConstants', () => {
  describe('static properties', () => {
    it('should have VIOLATION_MESSAGE', () => {
      expect(ImageOptimizationConstants.VIOLATION_MESSAGE).toBe(
        'Image optimization strategy not implemented'
      );
    });
  });

  describe('IMAGE_TOOLS', () => {
    it('should include sharp', () => {
      expect(ImageOptimizationConstants.IMAGE_TOOLS).toContain('sharp');
    });

    it('should include imagemin', () => {
      expect(ImageOptimizationConstants.IMAGE_TOOLS).toContain('imagemin');
    });

    it('should include squoosh', () => {
      expect(ImageOptimizationConstants.IMAGE_TOOLS).toContain('squoosh');
    });

    it('should include @angular/common', () => {
      expect(ImageOptimizationConstants.IMAGE_TOOLS).toContain('@angular/common');
    });
  });

  describe('IMAGE_OPTIMIZATION_MARKERS', () => {
    it('should include provideImageOptimization', () => {
      expect(ImageOptimizationConstants.IMAGE_OPTIMIZATION_MARKERS).toContain(
        'provideImageOptimization'
      );
    });

    it('should include NgOptimizedImage', () => {
      expect(ImageOptimizationConstants.IMAGE_OPTIMIZATION_MARKERS).toContain('NgOptimizedImage');
    });
  });

  describe('hasImageOptimizationTools', () => {
    it('should return true when sharp is in dependencies', () => {
      const content = '{ "dependencies": { "sharp": "^0.32.0" } }';
      expect(ImageOptimizationConstants.hasImageOptimizationTools(content)).toBe(true);
    });

    it('should return true when imagemin is in dependencies', () => {
      const content = '{ "dependencies": { "imagemin": "^8.0.0" } }';
      expect(ImageOptimizationConstants.hasImageOptimizationTools(content)).toBe(true);
    });

    it('should return false when no image tools', () => {
      const content = '{ "dependencies": { "lodash": "^4.0.0" } }';
      expect(ImageOptimizationConstants.hasImageOptimizationTools(content)).toBe(false);
    });
  });

  describe('hasImageOptimizationConfig', () => {
    it('should return true when provideImageOptimization is present', () => {
      const content = 'provideImageOptimization()';
      expect(ImageOptimizationConstants.hasImageOptimizationConfig(content)).toBe(true);
    });

    it('should return true when NgOptimizedImage is present', () => {
      const content = 'import { NgOptimizedImage } from "@angular/common"';
      expect(ImageOptimizationConstants.hasImageOptimizationConfig(content)).toBe(true);
    });

    it('should return false when no image optimization config', () => {
      const content = 'import { Component } from "@angular/core"';
      expect(ImageOptimizationConstants.hasImageOptimizationConfig(content)).toBe(false);
    });
  });
});

describe('LighthouseConstants', () => {
  describe('CONFIG_PATHS', () => {
    it('should include lighthouse.config.js', () => {
      expect(LighthouseConstants.CONFIG_PATHS).toContain('lighthouse.config.js');
    });

    it('should include .lighthouserc.json', () => {
      expect(LighthouseConstants.CONFIG_PATHS).toContain('.lighthouserc.json');
    });

    it('should include config/lighthouse.config.js', () => {
      expect(LighthouseConstants.CONFIG_PATHS).toContain('config/lighthouse.config.js');
    });
  });

  describe('PERFORMANCE_THRESHOLD', () => {
    it('should be 90', () => {
      expect(LighthouseConstants.PERFORMANCE_THRESHOLD).toBe(90);
    });
  });

  describe('PERFORMANCE_THRESHOLD_DECIMAL', () => {
    it('should be 0.9', () => {
      expect(LighthouseConstants.PERFORMANCE_THRESHOLD_DECIMAL).toBe(0.9);
    });
  });

  describe('isLighthouseConfig', () => {
    it('should return true for lighthouse.config.js', () => {
      expect(LighthouseConstants.isLighthouseConfig('lighthouse.config.js')).toBe(true);
    });

    it('should return true for .lighthouserc.json', () => {
      expect(LighthouseConstants.isLighthouseConfig('.lighthouserc.json')).toBe(true);
    });

    it('should return false for regular config file', () => {
      expect(LighthouseConstants.isLighthouseConfig('webpack.config.js')).toBe(false);
    });
  });

  describe('hasPerformanceThreshold', () => {
    it('should return true when performance is present', () => {
      const content = '{ "performance": 0.9 }';
      expect(LighthouseConstants.hasPerformanceThreshold(content)).toBe(true);
    });

    it('should return true when 90 threshold is present', () => {
      const content = '{ "threshold": 90 }';
      expect(LighthouseConstants.hasPerformanceThreshold(content)).toBe(true);
    });

    it('should return false when no performance patterns', () => {
      const content = '{ "accessibility": 0.8 }';
      expect(LighthouseConstants.hasPerformanceThreshold(content)).toBe(false);
    });
  });
});

describe('PerformanceBudgetsConstants', () => {
  describe('ANGULAR_BUDGET_PATTERNS', () => {
    it('should include budgets', () => {
      expect(PerformanceBudgetsConstants.ANGULAR_BUDGET_PATTERNS).toContain('budgets');
    });

    it('should include maximumError', () => {
      expect(PerformanceBudgetsConstants.ANGULAR_BUDGET_PATTERNS).toContain('maximumError');
    });
  });

  describe('WEBPACK_PERFORMANCE_PATTERNS', () => {
    it('should include performance', () => {
      expect(PerformanceBudgetsConstants.WEBPACK_PERFORMANCE_PATTERNS).toContain('performance');
    });

    it('should include maxAssetSize', () => {
      expect(PerformanceBudgetsConstants.WEBPACK_PERFORMANCE_PATTERNS).toContain('maxAssetSize');
    });
  });

  describe('ANGULAR_BUDGET_MARKERS', () => {
    it('should include budgets', () => {
      expect(PerformanceBudgetsConstants.ANGULAR_BUDGET_MARKERS).toContain('budgets');
    });

    it('should include maximumWarning', () => {
      expect(PerformanceBudgetsConstants.ANGULAR_BUDGET_MARKERS).toContain('maximumWarning');
    });
  });

  describe('WEBPACK_BUDGET_MARKERS', () => {
    it('should include maxEntrypointSize', () => {
      expect(PerformanceBudgetsConstants.WEBPACK_BUDGET_MARKERS).toContain('maxEntrypointSize');
    });
  });

  describe('hasAngularBudgets', () => {
    it('should return true when budgets is present', () => {
      const content = '{ "budgets": [] }';
      expect(PerformanceBudgetsConstants.hasAngularBudgets(content)).toBe(true);
    });

    it('should return true when maximumError is present', () => {
      const content = '{ "maximumError": "5mb" }';
      expect(PerformanceBudgetsConstants.hasAngularBudgets(content)).toBe(true);
    });

    it('should return false when no budget patterns', () => {
      const content = '{ "optimization": true }';
      expect(PerformanceBudgetsConstants.hasAngularBudgets(content)).toBe(false);
    });
  });

  describe('hasWebpackPerformance', () => {
    it('should return true when performance is present', () => {
      const content = 'module.exports = { performance: {} }';
      expect(PerformanceBudgetsConstants.hasWebpackPerformance(content)).toBe(true);
    });

    it('should return true when maxAssetSize is present', () => {
      const content = 'module.exports = { maxAssetSize: 500000 }';
      expect(PerformanceBudgetsConstants.hasWebpackPerformance(content)).toBe(true);
    });

    it('should return false when no webpack performance patterns', () => {
      const content = 'module.exports = { entry: "./src" }';
      expect(PerformanceBudgetsConstants.hasWebpackPerformance(content)).toBe(false);
    });
  });
});
