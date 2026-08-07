/**
 * DatabaseQueryOptimization Module - Export Layer
 *
 * This barrel export file provides clean access to all module components
 * following the architecture pattern: Constants → Services → Law
 */

// Constants exports
export {
  DatabaseQueryOptimizationCheckConstants,
  DatabaseQueryOptimizationFileDiscoveryConstants,
  DatabaseQueryOptimizationIndexConstants,
  type DatabaseIndex,
} from './constants';

// Services exports
export {
  DatabaseQueryOptimizationAnalyzerService,
  DatabaseQueryOptimizationFileDiscoveryService,
} from './services';
