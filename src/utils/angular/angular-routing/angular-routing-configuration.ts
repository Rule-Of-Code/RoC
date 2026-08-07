/**
 * Angular Routing Configuration
 * Centralized configuration for routing analysis patterns and validation messages
 * Meta-dogfooding: Centralizes hardcoded constants and routing patterns
 */
import { SignalConfigurationBase } from '../signal-configuration-base';

export class AngularRoutingConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularRoutingConfiguration;

  /**
   * Routing detection and analysis patterns
   */
  static readonly ROUTING_PATTERNS = {
    LAZY_LOADING_INDICATORS: ['loadChildren', '() => import('],
    EAGER_LOADING_INDICATORS: ['component:'],
    LAZY_LOADING_SYNTAX: ['() => import('],
    STRING_BASED_LAZY_PATTERN: /loadChildren:\s*['"][^'"]*#[^'"]*['"]/,
    ROUTER_CONFIG: ['RouterModule.forRoot'],
    // `preloadingStrategy` is the NgModule RouterModule.forRoot form; withPreloading
    // is the standalone provideRouter form. Recognising only the former told a
    // correct standalone app to add a preloading strategy it already had.
    PRELOADING_INDICATORS: [
      'preloadingStrategy',
      'withPreloading',
      'PreloadAllModules',
    ],
    TRACING_INDICATORS: ['enableTracing: true'],
    ROUTE_GUARDS: ['canActivate', 'canLoad', 'canDeactivate'],
    ROUTE_DATA: ['data:', 'resolve:'],
    ACTIVATED_ROUTE: ['ActivatedRoute'],
    ROUTING_FILE_EXTENSIONS: ['-routing.module.ts', '.routing.ts'],
  } as const;

  /**
   * Validation messages for routing analysis
   */
  static readonly VALIDATION_MESSAGES = {
    NO_ROUTING_MODULES_SUGGESTION:
      'Create routing modules for application navigation',
    NO_LAZY_LOADING_VIOLATION:
      'No lazy loading configuration found in {fileName}',
    LAZY_LOADING_SUGGESTION:
      'Consider using loadChildren for lazy loading in {fileName}',
    STRING_BASED_LAZY_VIOLATION:
      'String-based lazy loading is deprecated in {fileName}',
    STRING_BASED_LAZY_SUGGESTION:
      "Use dynamic imports: () => import('./module') in {fileName}",
    IMPROPER_LAZY_SYNTAX_VIOLATION:
      'Improper lazy loading syntax in {fileName}',
    IMPROPER_LAZY_SYNTAX_SUGGESTION:
      'Use () => import() syntax for lazy loading in {fileName}',
    PRELOADING_STRATEGY_SUGGESTION:
      'Consider adding preloading strategy in {fileName}',
    TRACING_PRODUCTION_VIOLATION:
      'Router tracing should be disabled in production in {fileName}',
    TRACING_PRODUCTION_SUGGESTION:
      'Set enableTracing: false for production builds in {fileName}',
    ROUTE_GUARDS_SUGGESTION:
      'Consider adding route guards for lazy loaded modules in {fileName}',
    ACTIVATED_ROUTE_SUGGESTION:
      'Import ActivatedRoute to access route data in {fileName}',
  } as const;

  /**
   * Analyze routing patterns in content
   * RULE 2: Optimized to eliminate duplicate pattern checks via array caching
   */
  static analyzeRoutingPatterns(content: string): {
    hasLazyLoading: boolean;
    hasEagerLoading: boolean;
    hasLoadChildren: boolean;
    hasStringBasedLazy: boolean;
    hasDynamicImportSyntax: boolean;
    hasRouterForRoot: boolean;
    hasPreloadingStrategy: boolean;
    hasTracingEnabled: boolean;
    hasRouteGuards: boolean;
    hasRouteData: boolean;
    hasActivatedRoute: boolean;
  } {
    // Cache pattern arrays for reuse
    const lazyIndicators = this.ROUTING_PATTERNS.LAZY_LOADING_INDICATORS;
    const eagerIndicators = this.ROUTING_PATTERNS.EAGER_LOADING_INDICATORS;
    const lazyLoadingSyntax = this.ROUTING_PATTERNS.LAZY_LOADING_SYNTAX;
    const routerConfig = this.ROUTING_PATTERNS.ROUTER_CONFIG;
    const preloadingIndicators = this.ROUTING_PATTERNS.PRELOADING_INDICATORS;
    const tracingIndicators = this.ROUTING_PATTERNS.TRACING_INDICATORS;
    const routeGuards = this.ROUTING_PATTERNS.ROUTE_GUARDS;
    const routeData = this.ROUTING_PATTERNS.ROUTE_DATA;
    const activatedRoute = this.ROUTING_PATTERNS.ACTIVATED_ROUTE;

    const hasLazyLoading = lazyIndicators.some(indicator =>
      content.includes(indicator)
    );

    const hasEagerLoading =
      eagerIndicators.some(indicator => content.includes(indicator)) &&
      !content.includes('loadChildren');

    const hasLoadChildren = content.includes('loadChildren');

    const hasStringBasedLazy =
      this.ROUTING_PATTERNS.STRING_BASED_LAZY_PATTERN.test(content);

    const hasDynamicImportSyntax = lazyLoadingSyntax.some(syntax =>
      content.includes(syntax)
    );

    const hasRouterForRoot = routerConfig.some(config =>
      content.includes(config)
    );

    const hasPreloadingStrategy = preloadingIndicators.some(indicator =>
      content.includes(indicator)
    );

    const hasTracingEnabled = tracingIndicators.some(indicator =>
      content.includes(indicator)
    );

    const hasRouteGuards = routeGuards.some(guard => content.includes(guard));

    const hasRouteData = routeData.some(data => content.includes(data));

    const hasActivatedRoute = activatedRoute.some(route =>
      content.includes(route)
    );

    return {
      hasLazyLoading,
      hasEagerLoading,
      hasLoadChildren,
      hasStringBasedLazy,
      hasDynamicImportSyntax,
      hasRouterForRoot,
      hasPreloadingStrategy,
      hasTracingEnabled,
      hasRouteGuards,
      hasRouteData,
      hasActivatedRoute,
    };
  }
}
