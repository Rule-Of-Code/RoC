/**
 * Shared Licensing Interfaces and Types
 * Common types used across all licensing analyzers
 */

/**
 * Standard interface for package.json license checking
 * Used by both project and dependency license analyzers
 */
export interface PackageJsonLicense {
  license?: string;
  licenses?: Array<{ type: string; url?: string }>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]:
    | Record<string, string>
    | unknown[]
    | object
    | string
    | undefined;
}
