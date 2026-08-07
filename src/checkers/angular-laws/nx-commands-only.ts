/**
 * Nx Commands Only Law
 * Enforces use of Nx commands instead of direct Angular CLI
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from './shared-imports';
import {
  AngularLawBase,
  CheckerUtils,
  FileUtils,
  PathOperations,
  ProjectTypeDetector,
} from './shared-imports';
export class NxCommandsOnlyLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const violations: string[] = [];

    // Check package.json scripts for direct ng usage
    const scripts = ProjectTypeDetector.getPackageScripts(projectRoot);
    if (scripts) {
      Object.entries(scripts).forEach(([scriptName, scriptCommand]) => {
        const command = String(scriptCommand);

        // Check for direct Angular CLI usage instead of Nx
        if (command.includes(' ng ') || command.startsWith('ng ')) {
          if (!command.includes('nx ')) {
            violations.push(
              `Package script "${scriptName}" uses Angular CLI directly: ${command}`
            );
          }
        }
      });
    }

    // Check documentation files for ng usage examples
    const docFiles = this.findDocumentationFiles(projectRoot, config);

    for (const file of docFiles) {
      try {
        const content = FileUtils.readFile(file);
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for ng command (word boundary before ng, space after)
          // Excludes: "planning ", "booking ", etc.
          const ngCommandPattern = /\bng\s+/;
          const nxCommandPattern = /\bnx\s+/;

          if (ngCommandPattern.test(line) && !nxCommandPattern.test(line)) {
            const relativePath = PathOperations.getRelative(projectRoot, file);
            violations.push(
              `Direct ng command in documentation ${relativePath}:${
                index + 1
              }: ${line.trim()}`
            );
          }
        });
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    // Check for nx.json presence
    const nxConfigPath = PathOperations.join(projectRoot, 'nx.json');
    if (!FileUtils.exists(nxConfigPath)) {
      violations.push(
        'nx.json configuration file missing - Nx workspace required'
      );
    }

    // Check workspace.json or angular.json for Nx configuration
    if (ProjectTypeDetector.hasAngularConfigWithoutNx(projectRoot)) {
      violations.push(
        'Using angular.json instead of workspace.json - migrate to Nx workspace'
      );
    }

    return this.createResult(
      violations,
      'Nx Commands Only',
      'ANGULAR_LAW',
      [
        'Replace ng commands with nx commands',
        'Update package.json scripts to use nx',
        'Update documentation to show nx usage',
        'Configure proper Nx workspace',
      ],
      context
    );
  }

  private static findDocumentationFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const docFiles: string[] = [];
    const searchDirs = ['docs', 'README.md', '.'];

    for (const searchDir of searchDirs) {
      const searchPath = PathOperations.join(projectRoot, searchDir);
      if (FileUtils.exists(searchPath)) {
        if (FileUtils.isFile(searchPath) && searchPath.endsWith('.md')) {
          docFiles.push(searchPath);
        } else if (FileUtils.isDirectory(searchPath)) {
          this.findMarkdownFiles(searchPath, docFiles, config);
        }
      }
    }

    return docFiles;
  }

  private static findMarkdownFiles(
    dir: string,
    results: string[],
    config: RuleOfCodeConfig
  ): void {
    const { FileUtils } = require('../../utils/file-utils');

    // Skip ignored directories
    if (FileUtils.shouldIgnoreFile(dir, config, 'nx-commands-only')) {
      return;
    }

    try {
      const items = CheckerUtils.findFilesByExtension(
        dir,
        ['ts', 'js', 'json'],
        config
      );

      for (const item of items) {
        const fullPath = item; // CheckerUtils already returns full paths
        // Process the file directly since CheckerUtils handles directory traversal
        if (
          fullPath.endsWith('.md') ||
          fullPath.endsWith('.txt') ||
          fullPath.endsWith('.rst')
        ) {
          if (
            !FileUtils.shouldIgnoreFile(fullPath, config, 'nx-commands-only')
          ) {
            results.push(fullPath);
          }
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }
}
