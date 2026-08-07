import { FileSystemOperations } from '../../../../utils';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { AngularProject, CdnCheckResult } from '../constants/types';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

export class CdnAnalyzerService extends PerformanceAnalyzerBase {
  static analyze(projectRoot: string): CdnCheckResult {
    return {
      configured:
        this.hasFirebaseCDNConfig(projectRoot) ||
        this.hasAngularCDNConfig(projectRoot) ||
        this.hasCDNEnvironmentConfig(projectRoot),
    };
  }

  private static hasFirebaseCDNConfig(projectRoot: string): boolean {
    const firebaseJsonPath = PathOperations.join(
      projectRoot,
      FileDiscovery.CONFIG_FILES.FIREBASE_JSON
    );
    if (!FileUtils.exists(firebaseJsonPath)) {
      return false;
    }

    try {
      const firebaseJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          firebaseJsonPath
        );
      return !!(
        firebaseJson.hosting &&
        typeof firebaseJson.hosting === 'object' &&
        'headers' in (firebaseJson.hosting as Record<string, unknown>)
      );
    } catch {
      return false;
    }
  }

  private static hasAngularCDNConfig(projectRoot: string): boolean {
    const content = this.readAngularJsonContent(projectRoot);
    if (!content) {
      return false;
    }

    try {
      if (!content.includes('deployUrl') && !content.includes('baseHref')) {
        return false;
      }

      const angularJsonPath = PathOperations.join(
        projectRoot,
        FileDiscovery.CONFIG_FILES.ANGULAR_JSON
      );
      const angularJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          angularJsonPath
        );
      const projects = angularJson.projects as
        | Record<string, unknown>
        | undefined;
      if (!projects) return false;

      for (const project of Object.values(projects)) {
        const angularProject = project as AngularProject;
        const buildOptions = angularProject.architect?.build?.options;
        if (buildOptions && (buildOptions.deployUrl || buildOptions.baseHref)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private static hasCDNEnvironmentConfig(projectRoot: string): boolean {
    const envFilePaths = FileDiscovery.getEnvFilePaths(projectRoot);

    for (const envFile of envFilePaths) {
      if (FileUtils.exists(envFile)) {
        try {
          const content = FileUtils.readFile(envFile, { encoding: 'utf8' });
          if (this.hasCDNKeywords(content)) {
            return true;
          }
        } catch {
          // Ignore file read errors
        }
      }
    }

    return false;
  }

  private static hasCDNKeywords(content: string): boolean {
    const cdnProviders = ['cloudflare', 'cloudfront', 'firebase', 'cdn'];
    const cdnKeywords = [...cdnProviders, 'assets', 'CDN'];

    return cdnKeywords.some((keyword: string) =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}
