/**
 * Code Duplication Control Law
 * Detects and prevents code duplication
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class CodeDuplicationControlLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for duplication detection tools
    const toolsAnalysis = this.checkDuplicationTools(context.projectRoot);
    violations.push(...toolsAnalysis.violations);
    suggestions.push(...toolsAnalysis.suggestions);

    // Analyze code for duplication patterns
    const duplicationAnalysis = this.analyzeDuplication(
      context.projectRoot,
      context.config
    );
    violations.push(...duplicationAnalysis.violations);
    suggestions.push(...duplicationAnalysis.suggestions);

    return CodeDuplicationControlLaw.createResult(
      violations,
      'Code duplication under control',
      'CODE_QUALITY',
      suggestions,
      context
    );
  }

  private static checkDuplicationTools(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for duplication detection tools
    const duplicationTools = [
      'jscpd',
      'copy-paste-detector',
      'duplicate-code-detector',
    ];
    const missingTools = this.checkRequiredTools(projectRoot, duplicationTools);
    const hasDuplicationTool = missingTools.length < duplicationTools.length;

    if (!hasDuplicationTool) {
      violations.push('No code duplication detection tools configured');
      suggestions.push(
        'Install jscpd or similar tools for duplication detection'
      );
    }

    // Check for SonarJS rules using helper (similar tool checking pattern)
    const sonarJsTools = ['eslint-plugin-sonarjs'];
    const hasSonarJs =
      this.checkRequiredTools(projectRoot, sonarJsTools).length === 0;
    if (!hasSonarJs) {
      suggestions.push(
        'Consider eslint-plugin-sonarjs for advanced duplication detection'
      );
    }

    return { violations, suggestions };
  }

  private static analyzeDuplication(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } = this.initializeAnalysis();

    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    const codeBlocks = new Map<string, string[]>();

    // Collect code blocks for comparison
    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const blocks = this.extractCodeBlocks(content);
        const minBlockSize =
          config.thresholds?.codeQuality?.minDuplicationBlockSize ?? 50;

        for (const block of blocks) {
          if (block.length > minBlockSize) {
            // Only check substantial blocks
            const key = this.normalizeCode(block);
            this.addToCodeBlocks(
              codeBlocks,
              key,
              PathOperations.getRelative(projectRoot, file)
            );
          }
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    // Find duplicated blocks
    let duplicationCount = 0;
    codeBlocks.forEach((files, _block) => {
      if (files.length > 1) {
        duplicationCount++;
        violations.push(`Code duplication found in: ${files.join(', ')}`);
      }
    });

    if (duplicationCount > 0) {
      suggestions.push('Extract common code into shared functions or modules');
      suggestions.push('Use inheritance or composition to reduce duplication');
      suggestions.push(
        'Consider creating utility functions for repeated patterns'
      );
    }

    return { violations, suggestions };
  }

  private static extractCodeBlocks(content: string): string[] {
    const blocks: string[] = [];
    const lines = content.split('\n');

    // Extract function bodies
    let inFunction = false;
    let functionLines: string[] = [];
    let braceCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('function') || trimmed.includes('=>')) {
        inFunction = true;
        functionLines = [line];
        braceCount =
          (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length;
      } else if (inFunction) {
        functionLines.push(line);
        braceCount +=
          (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length;

        if (braceCount <= 0 && trimmed.includes('}')) {
          blocks.push(functionLines.join('\n'));
          inFunction = false;
          functionLines = [];
        }
      }
    }

    return blocks;
  }

  private static normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\b\d+\b/g, 'NUM') // Replace numbers with placeholder
      .replace(/['"`][^'"`]*['"`]/g, 'STR') // Replace strings with placeholder
      .trim();
  }

  /**
   * Add code block to map with safe access
   */
  private static addToCodeBlocks(
    codeBlocks: Map<string, string[]>,
    key: string,
    filePath: string
  ): void {
    if (!codeBlocks.has(key)) {
      codeBlocks.set(key, []);
    }
    const files = codeBlocks.get(key);
    if (files) {
      files.push(filePath);
    }
  }
}
