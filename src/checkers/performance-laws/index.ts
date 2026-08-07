/**
 * Performance Laws Index
 * Exports all performance-related law implementations
 */

export * from './bundle-size-optimization'; // BundleSizeAnalyzer
export * from './change-detection-optimization';
// './lazy-loading-implementation' was a DEAD duplicate of the wired
// angular-laws/lazy-loading-implementation (the registry uses that one). Having
// two classes named LazyLoadingImplementationLaw is what sent a v7.13.0 fix to
// the file the audit never runs. Removed; the real law lives under angular-laws.
export * from './memory-management';
export * from './performance-law-base';
