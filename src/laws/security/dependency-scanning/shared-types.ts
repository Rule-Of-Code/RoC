/**
 * Shared types for dependency scanning checkers
 * Consolidates common interface definitions
 */

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  license?: string;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}
