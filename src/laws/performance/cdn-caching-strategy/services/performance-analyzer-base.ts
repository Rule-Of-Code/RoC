import { FileSystemOperations } from '../../../../utils';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { AngularProject } from '../constants/types';

/**
 * Base class for Performance Analyzers
 * Consolidates common analysis patterns for CDN caching and performance optimization
 */
export class PerformanceAnalyzerBase {
  /**
   * Common file existence check with error handling
   */
  protected static safeCheckFileExists(filePath: string): boolean {
    try {
      return FileUtils.exists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Common JSON file reading with error handling
   */
  protected static safeReadJsonFile(
    filePath: string
  ): Record<string, unknown> | null {
    try {
      return FileSystemOperations.readJsonFile(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Common text file reading with error handling
   */
  protected static safeReadFile(
    filePath: string,
    encoding: BufferEncoding = 'utf8'
  ): string | null {
    try {
      return FileUtils.readFile(filePath, { encoding });
    } catch {
      return null;
    }
  }

  /**
   * Common Angular JSON config iteration helper
   * Consolidates pattern for checking build configurations across projects
   */
  protected static iterateAngularProjects(
    projectRoot: string,
    callback: (project: AngularProject, projectName: string) => boolean
  ): boolean {
    const angularJsonPath = PathOperations.join(
      projectRoot,
      FileDiscovery.CONFIG_FILES.ANGULAR_JSON
    );
    if (!this.safeCheckFileExists(angularJsonPath)) {
      return false;
    }

    const angularJson = this.safeReadJsonFile(angularJsonPath);
    if (!angularJson) {
      return false;
    }

    const projects = angularJson.projects as
      | Record<string, unknown>
      | undefined;
    if (!projects) return false;
    for (const [projectName, project] of Object.entries(projects)) {
      if (callback(project as AngularProject, projectName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Common Firebase hosting configuration check
   * Consolidates pattern for checking firebase.json hosting properties
   */
  protected static getFirebaseHostingConfig(
    projectRoot: string
  ): Record<string, unknown> | null {
    const firebaseJsonPath = PathOperations.join(
      projectRoot,
      FileDiscovery.CONFIG_FILES.FIREBASE_JSON
    );
    if (!this.safeCheckFileExists(firebaseJsonPath)) {
      return null;
    }

    const firebaseJson = this.safeReadJsonFile(firebaseJsonPath);
    if (!firebaseJson?.hosting || typeof firebaseJson.hosting !== 'object') {
      return null;
    }

    return firebaseJson.hosting as Record<string, unknown>;
  }

  /**
   * Common Angular configuration file reading
   * Consolidates pattern for reading angular.json with keyword checks
   */
  protected static readAngularJsonContent(projectRoot: string): string | null {
    const angularJsonPath = PathOperations.join(
      projectRoot,
      FileDiscovery.CONFIG_FILES.ANGULAR_JSON
    );
    if (!this.safeCheckFileExists(angularJsonPath)) {
      return null;
    }

    return this.safeReadFile(angularJsonPath, 'utf8');
  }

  /**
   * Common server configuration file reading
   * Consolidates pattern for reading server config files
   */
  protected static readServerConfigFile(
    serverConfigPath: string
  ): string | null {
    if (!this.safeCheckFileExists(serverConfigPath)) {
      return null;
    }

    return this.safeReadFile(serverConfigPath, 'utf8');
  }

  /**
   * Common Webpack configuration file reading
   * Consolidates pattern for reading webpack config files
   */
  protected static readWebpackConfigFile(
    webpackConfigPath: string
  ): string | null {
    if (!this.safeCheckFileExists(webpackConfigPath)) {
      return null;
    }

    return this.safeReadFile(webpackConfigPath, 'utf8');
  }

  /**
   * Common file reading for absolute paths
   * Used for reading files by absolute path with encoding
   */
  protected static readFileAbsolutePath(
    filePath: string,
    encoding: BufferEncoding = 'utf8'
  ): string | null {
    return this.safeReadFile(filePath, encoding);
  }

  /**
   * Check if file exists
   * Consolidated existence check with error handling
   */
  protected static fileExists(filePath: string): boolean {
    return this.safeCheckFileExists(filePath);
  }

  /**
   * Does a Firebase Hosting header entry declare any of `names`?
   *
   * Firebase's schema for `hosting.headers[].headers` is an ARRAY of
   * `{ key, value }` — that is the only shape `firebase deploy` accepts, not a
   * convention a project chose. Two analyzers read it as a dictionary
   * (`headers['Cache-Control']`, `'Link' in headers`), which is `undefined` and
   * `false` for every array no matter what it contains: no valid firebase.json
   * could satisfy either check. Both now ask this.
   *
   * A dictionary is still accepted, since other hosts do use that shape.
   */
  protected static declaresAnyHeader(
    headerFields: unknown,
    names: readonly string[]
  ): boolean {
    if (Array.isArray(headerFields)) {
      return headerFields.some(
        (pair: unknown) =>
          typeof pair === 'object' &&
          pair !== null &&
          names.includes(String((pair as { key?: unknown }).key))
      );
    }

    if (typeof headerFields === 'object' && headerFields !== null) {
      return names.some(name => name in (headerFields as object));
    }

    return false;
  }
}
