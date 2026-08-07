/**
 * Package.json type definitions
 */

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  keywords?: string[];
  author?:
    | string
    | {
        name: string;
        email?: string;
        url?: string;
      };
  license?: string;
  repository?:
    | string
    | {
        type: string;
        url: string;
      };
  bugs?:
    | string
    | {
        url: string;
        email?: string;
      };
  homepage?: string;
  engines?: Record<string, string>;
  files?: string[];
  private?: boolean;
  workspaces?: string[];
  [key: string]: unknown;
}
