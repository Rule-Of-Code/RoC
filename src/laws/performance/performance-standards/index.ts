/**
 * Performance Standards
 *
 * Barrel export for performance standards modular architecture
 */

export { PerformanceStandardsLaw } from '../performance-standards';

export {
  BundleOptimizationConstants,
  CachingStrategyConstants,
  CoreWebVitalsConstants,
  ImageOptimizationConstants,
  LighthouseConstants,
  PerformanceBudgetsConstants,
} from './constants';
export {
  BundleOptimizationAnalyzer,
  CachingStrategyAnalyzer,
  CoreWebVitalsAnalyzer,
  ImageOptimizationAnalyzer,
  LighthouseAnalyzer,
  PerformanceAnalyzerService,
  PerformanceBudgetsAnalyzer,
} from './services';
