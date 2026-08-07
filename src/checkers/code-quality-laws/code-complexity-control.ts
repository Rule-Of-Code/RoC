/**
 * Code Complexity Control Law
 * Enforces cyclomatic complexity limits and maintainable code structure
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class CodeComplexityControlLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for complexity analysis tools
    const complexityTools = this.checkComplexityTools(context.projectRoot);
    violations.push(...complexityTools.violations);
    suggestions.push(...complexityTools.suggestions);

    // Analyze source code complexity
    const codeAnalysis = this.analyzeCodeComplexity(
      context.projectRoot,
      context.config
    );
    violations.push(...codeAnalysis.violations);
    suggestions.push(...codeAnalysis.suggestions);

    // Check for architectural complexity
    const architecturalComplexity = this.checkArchitecturalComplexity(
      context.projectRoot,
      context.config
    );
    suggestions.push(...architecturalComplexity.suggestions);

    return {
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Code complexity under control'
          : `${violations.length} complexity violations found`,
      violations,
      suggestions: violations.length > 0 ? suggestions : [],
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      fixable: violations.length > 0,
      config: context.config,
    };
  }

  private static checkComplexityTools(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    try {
      const packageJson =
        ProjectTypeDetectorValidation.getPackageJson(projectRoot);
      if (!packageJson || typeof packageJson !== 'object') {
        return { violations, suggestions };
      }

      const pkg = packageJson as Record<string, unknown>;
      const devDependencies = (pkg.devDependencies ?? {}) as Record<
        string,
        unknown
      >;

      // Check for ESLint complexity rules
      if (devDependencies.eslint) {
        const eslintConfig = this.findESLintConfig(projectRoot);
        if (eslintConfig && !this.hasComplexityRules(eslintConfig)) {
          violations.push('ESLint complexity rules not configured');
          suggestions.push(
            'Configure ESLint complexity rules (complexity, max-lines, max-depth)'
          );
        }
      } else {
        suggestions.push('Install ESLint for automated complexity checking');
      }

      // Check for complexity analysis tools
      const complexityTools = ['complexity-report', 'plato', 'jscpd', 'madge'];

      const hasComplexityTool = complexityTools.some(
        tool => devDependencies[tool]
      );
      if (!hasComplexityTool) {
        suggestions.push(
          'Consider adding complexity analysis tools (plato, madge, jscpd)'
        );
      }
    } catch (_error) {
      // Continue if dependencies can't be read
    }

    return { violations, suggestions };
  }

  private static analyzeCodeComplexity(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find TypeScript/JavaScript files
    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    let complexFilesFound = 0;

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const complexity = this.calculateFileComplexity(content);

        const maxFileLines = config.thresholds?.codeQuality?.maxFileLines ?? 300;
        if (complexity.lines > maxFileLines) {
          complexFilesFound++;
          violations.push(
            `File too long: ${PathOperations.getRelative(projectRoot, file)} (${
              complexity.lines
            } lines, max ${maxFileLines})`
          );
        }

        const maxFunctions =
          config.thresholds?.codeQuality?.maxComplexity ?? 20;
        if (complexity.functions > maxFunctions) {
          violations.push(
            `Too many functions in ${PathOperations.getRelative(projectRoot, file)} (${complexity.functions}, max ${maxFunctions})`
          );
        }

        const maxCyclomatic =
          config.thresholds?.codeQuality?.minFunctionComplexity ?? 10;
        if (complexity.cyclomaticEstimate > maxCyclomatic) {
          violations.push(
            `High complexity estimated in ${PathOperations.getRelative(projectRoot, file)} (estimated ${complexity.cyclomaticEstimate}, max ${maxCyclomatic})`
          );
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    if (complexFilesFound > 0) {
      suggestions.push('Break down large files into smaller, focused modules');
      suggestions.push('Extract reusable functions and components');
    }

    return { violations, suggestions };
  }

  private static checkArchitecturalComplexity(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const suggestions: string[] = [];

    // Check for deep directory nesting
    const maxDepth = this.calculateDirectoryDepth(projectRoot, config);
    if (maxDepth > 6) {
      suggestions.push(
        'Consider flattening deep directory structures for better navigation'
      );
    }

    // Check for circular dependencies
    try {
      const dependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      const maxDeps = config.thresholds?.codeQuality?.maxDependencies ?? 50;
      if (Object.keys(dependencies).length > maxDeps) {
        suggestions.push(
          `Large number of dependencies detected (${Object.keys(dependencies).length} > ${maxDeps}) - consider dependency consolidation`
        );
      }
    } catch (_error) {
      // Continue if dependencies can't be read
    }

    return { violations: [], suggestions };
  }
  private static calculateFileComplexity(content: string): {
    lines: number;
    functions: number;
    conditionals: number;
    cyclomaticEstimate: number;
  } {
    const lines = content.split('\n').length;

    // Count over code with comments removed so keywords in prose/JSDoc don't
    // inflate the estimate ("if you want, for example" must not score if + for).
    const code = content
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

    // Function declarations + arrow functions. `\bfunction\b` is word-bounded so
    // the substring "function" inside an identifier does not count.
    const functions = (code.match(/\bfunction\b|=>/g) ?? []).length;

    // Decision points (a cyclomatic proxy). Keywords are word-bounded so
    // identifiers like `forEach`, `notify`, `classifier`, `switchboard` no longer
    // count as for/if/case/switch. Boolean operators add branches. The ternary is
    // matched ONLY as a real `?` — optional chaining `?.`, nullish `??`, and
    // optional members/params `x?:` are excluded (these were the bulk of the old
    // regex's false inflation). `else`/`switch` themselves are dropped: `else if`
    // is already counted by `if`, and each `case` is the real branch.
    const decisionPatterns = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /(?<!\?)\?(?![.?:])/g,
    ];
    const conditionals = decisionPatterns.reduce(
      (sum, pattern) => sum + (code.match(pattern) ?? []).length,
      0
    );

    const cyclomaticEstimate = conditionals + functions;

    return { lines, functions, conditionals, cyclomaticEstimate };
  }

  private static calculateDirectoryDepth(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): number {
    // Use CheckerUtils to find deepest file path instead of manual scanning
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['ts', 'js', 'tsx', 'jsx'],
      config
    );

    let maxDepth = 0;
    for (const file of allFiles) {
      const relativePath = PathOperations.getRelative(projectRoot, file);
      const depth = relativePath.split('/').length - 1;
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }
}
