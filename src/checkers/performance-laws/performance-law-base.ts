/**
 * Performance Law Base Class
 * Base functionality for performance-specific law implementations
 */

import type { RuleOfCodeConfig } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

export class PerformanceLawBase extends LawBase {
  protected static hasPerformanceConfig(projectRoot: string): boolean {
    const configFiles = [
      'webpack.config.js',
      'vite.config.ts',
      'rollup.config.js',
      'performance.config.js',
    ];

    return configFiles.some(configFile =>
      FileUtils.exists(PathOperations.join(projectRoot, configFile))
    );
  }

  protected static readFileContent(filePath: string): string | null {
    try {
      return FileUtils.readFile(filePath, { encoding: 'utf8' });
    } catch {
      return null;
    }
  }

  protected static fileExists(filePath: string): boolean {
    return FileUtils.exists(filePath);
  }

  protected static findJSFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const jsFiles: string[] = [];
    const srcDirs = ['src', 'lib', 'dist', 'build'];

    for (const srcDir of srcDirs) {
      const srcPath = PathOperations.join(projectRoot, srcDir);
      if (FileUtils.exists(srcPath)) {
        try {
          const files = CheckerUtils.findFilesByExtension(
            srcPath,
            CheckerUtils.getCommonExtensions().ALL_CODE,
            config
          );
          jsFiles.push(...files);
        } catch {
          // Skip directories that can't be read
        }
      }
    }

    return jsFiles;
  }
}
