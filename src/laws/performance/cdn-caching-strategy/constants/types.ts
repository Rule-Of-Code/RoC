export interface AngularProject {
  architect?: {
    build?: {
      options?: BuildOptions;
      configurations?: {
        production?: BuildOptions;
        [key: string]: BuildOptions | undefined;
      };
    };
  };
}

export interface BuildOptions {
  baseHref?: string;
  deployUrl?: string;
  outputHashing?: boolean | string;
  optimization?: Record<string, unknown> | boolean;
  namedChunks?: boolean;
  [key: string]:
    Record<string, unknown> | boolean | number | string | undefined;
}

export interface HeaderConfig {
  headers?: {
    'Cache-Control'?: string;
    Link?: string;
    [key: string]: string | undefined;
  };
}

export interface CdnCheckResult {
  configured: boolean;
}

export interface AssetOptimizationResult {
  optimized: boolean;
}

export interface CachingHeadersResult {
  configured: boolean;
}

export interface ServiceWorkerResult {
  implemented: boolean;
}

export interface Http2OptimizationResult {
  optimized: boolean;
}

export interface CdnCachingAnalysisResult {
  cdnConfigured: CdnCheckResult;
  assetOptimization: AssetOptimizationResult;
  cachingHeaders: CachingHeadersResult;
  serviceWorker: ServiceWorkerResult;
  http2Optimization: Http2OptimizationResult;
}
