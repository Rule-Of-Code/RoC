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

        // Per FUNCTION — which is what this threshold has always been named and
        // defaulted for. It used to be compared against the whole file's sum.
        const maxCyclomatic =
          config.thresholds?.codeQuality?.minFunctionComplexity ?? 10;
        if (complexity.worstFunction > maxCyclomatic) {
          violations.push(
            `Function complexity too high in ${PathOperations.getRelative(projectRoot, file)} (worst function ${complexity.worstFunction}, max ${maxCyclomatic})`
          );
        }

        // The file aggregate keeps its own name and its own, much higher default,
        // so "this file is a lot" and "this function is a lot" stop being the same
        // number. Opt-in: absent config means the old aggregate never fails a file
        // that has no over-complex function in it.
        const maxFileComplexity =
          config.thresholds?.codeQuality?.maxFileComplexity;
        if (
          maxFileComplexity !== undefined &&
          complexity.cyclomaticEstimate > maxFileComplexity
        ) {
          violations.push(
            `File complexity too high in ${PathOperations.getRelative(projectRoot, file)} (estimated ${complexity.cyclomaticEstimate}, max ${maxFileComplexity})`
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
    worstFunction: number;
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

    // File aggregate, kept for the file-level knob. It is deliberately NOT what a
    // per-function threshold is compared against — see worstFunctionComplexity.
    const cyclomaticEstimate = conditionals + functions;

    return {
      lines,
      functions,
      conditionals,
      cyclomaticEstimate,
      worstFunction: this.worstFunctionComplexity(code),
    };
  }

  /**
   * Cyclomatic complexity of the single worst FUNCTION in the file.
   *
   * The threshold this feeds is called `minFunctionComplexity`, defaults to 10,
   * and 10 is the classic per-function cyclomatic limit — but the number being
   * compared against it used to be the whole file's decision points PLUS one per
   * function. Two consequences, both wrong:
   *
   *  - a module of eight tiny branch-free helpers scored 8 before doing anything,
   *    so well-factored code failed and the rule pushed toward one function per
   *    file;
   *  - a genuinely gnarly 400-line function alone in its file scored fine.
   *
   * We now measure each function's own body and report the worst. Bodies are
   * found by brace matching, which means an arrow function with an expression
   * body (`x => x + 1`) is not measured — it has no branches worth counting — and
   * an arrow inside a TYPE (`readonly load: () => Promise<T>`) is correctly not a
   * function at all. Both limits are declared on the law.
   */
  private static worstFunctionComplexity(code: string): number {
    // A `(` preceded by one of these is control flow, not a callable signature.
    const CONTROL = /\b(?:if|for|while|switch|catch|do|return|typeof)\s*$/;
    // A TypeScript signature carries a return type between the `)` and the `{`
    // (`): string {`, `): Promise<T> => {`), so the brace is not adjacent to the
    // parameter list. Allow an annotation that contains no brace — a return type
    // written as an inline object literal is not matched, and that limit is
    // declared on the law rather than guessed at.
    const starts = /\)\s*(?::\s*[^{};=]+?)?\s*(?:=>\s*)?\{/g;

    let worst = 0;
    let match: RegExpExecArray | null;
    while ((match = starts.exec(code)) !== null) {
      const openBrace = code.indexOf('{', match.index);
      if (openBrace < 0) continue;

      // Look back past the parameter list to see what kind of construct this is.
      const parenStart = this.matchingOpenParen(code, match.index);
      if (parenStart < 0) continue;
      if (CONTROL.test(code.slice(Math.max(0, parenStart - 12), parenStart))) {
        continue;
      }

      const body = this.bracedBody(code, openBrace);
      if (body === null) continue;

      worst = Math.max(worst, this.decisionPoints(body) + 1);
    }
    return worst;
  }

  /** Index of the `(` that opens the parameter list ending at/just before `from`. */
  private static matchingOpenParen(code: string, from: number): number {
    const closeParen = code.lastIndexOf(')', from + 1);
    if (closeParen < 0) return -1;
    let depth = 0;
    for (let i = closeParen; i >= 0; i--) {
      const ch = code[i];
      if (ch === ')') depth++;
      else if (ch === '(') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  /** The text between a `{` and its matching `}`, or null when unbalanced. */
  private static bracedBody(code: string, openBrace: number): string | null {
    let depth = 0;
    for (let i = openBrace; i < code.length; i++) {
      const ch = code[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return code.slice(openBrace + 1, i);
      }
    }
    return null;
  }

  /** Decision points in a body — the same proxy, without counting functions. */
  private static decisionPoints(body: string): number {
    const patterns = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /(?<!\?)\?(?![.?:])/g,
    ];
    return patterns.reduce(
      (sum, pattern) => sum + (body.match(pattern) ?? []).length,
      0
    );
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
