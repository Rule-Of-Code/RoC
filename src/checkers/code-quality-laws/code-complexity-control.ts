/**
 * Code Complexity Control Law
 * Enforces cyclomatic complexity limits and maintainable code structure
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
  ViolationDetail,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { CodeQualityLawBase } from './code-quality-law-base';
import {
  type FileComplexity,
  measureFileComplexity,
} from './function-complexity';

/** The thresholds a file is measured against. */
interface ComplexityLimits {
  maxFileLines: number;
  maxFunctions: number;
  maxFunctionComplexity: number;
  maxFileComplexity: number | undefined;
}

export class CodeComplexityControlLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Functions and their bodies come from the parser (#430). Without it the
    // files are not read — said so, never measured with a regex instead.
    const unread = this.unreadWithoutParser(context);
    if (unread) return unread;

    // Complexity analysis tools are advice, never a condition to pass.
    suggestions.push(...this.complexityToolAdvice(context.projectRoot));

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

    // The law is the check: it measures each function itself. ESLint's
    // complexity rule is not a condition to pass — it also counts `??`,
    // optional chaining and default parameters, which this law does not, so
    // the two disagree (#594). A project that sets it is told so, as
    // information.
    const details = this.eslintRuleNote(context.projectRoot);
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
      ...(details.length > 0 ? { details } : {}),
      ...(codeAnalysis.details.length > 0
        ? { violationDetails: codeAnalysis.details }
        : {}),
    };
  }

  /** The ESLint rules that bound complexity. */
  private static readonly ESLINT_RULES = [
    'complexity',
    'max-lines',
    'max-depth',
  ] as const;

  /**
   * Information, never a finding: the ESLint complexity rules the project
   * sets, if any. A config that is missing or could not be read says nothing
   * here, because the verdict does not depend on it (#594).
   */
  private static eslintRuleNote(projectRoot: string): string[] {
    const eslint = this.readESLintConfig(projectRoot);
    if (!eslint || eslint.notRead !== undefined) return [];
    const rules = (eslint.config.rules ?? {}) as Record<string, unknown>;
    const set = this.ESLINT_RULES.filter(rule => rules[rule]);
    return set.length > 0
      ? [
          `${eslint.file} sets ${set.join(', ')} — information only: this law measures each function itself and does not require the rules; ESLint also counts ??, optional chaining and default parameters`,
        ]
      : [];
  }

  /** Advice to add a complexity analysis tool when the project has none. */
  private static complexityToolAdvice(projectRoot: string): string[] {
    try {
      const packageJson =
        ProjectTypeDetectorValidation.getPackageJson(projectRoot);
      if (!packageJson || typeof packageJson !== 'object') return [];
      const devDependencies = ((packageJson as Record<string, unknown>)
        .devDependencies ?? {}) as Record<string, unknown>;
      const complexityTools = ['complexity-report', 'plato', 'jscpd', 'madge'];
      return complexityTools.some(tool => devDependencies[tool])
        ? []
        : ['Consider adding complexity analysis tools (plato, madge, jscpd)'];
    } catch (_error) {
      // Continue if dependencies can't be read
      return [];
    }
  }

  private static analyzeCodeComplexity(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
    details: ViolationDetail[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    // The file behind each finding; each function over the limit at its line (#43).
    const details: ViolationDetail[] = [];

    // Find TypeScript/JavaScript files
    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    let complexFilesFound = 0;

    const ts = loadTypeScript(projectRoot);
    if (!ts) return { violations, suggestions, details };
    const limits = this.limitsOf(config);

    for (const file of codeFiles) {
      try {
        const complexity = measureFileComplexity(
          ts,
          FileUtils.readFile(file),
          file
        );
        const where = PathOperations.getRelative(projectRoot, file);
        const found = this.fileFindings(where, complexity, limits);
        if (found.some(v => v.startsWith('File too long'))) complexFilesFound++;
        violations.push(...found);
        details.push(...this.fileDetails(where, complexity, limits, found));
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    if (complexFilesFound > 0) {
      suggestions.push('Break down large files into smaller, focused modules');
      suggestions.push('Extract reusable functions and components');
    }

    return { violations, suggestions, details };
  }

  /**
   * What each finding of a file measured: the file for its length, function
   * count and total, and each function over the limit at its line.
   */
  private static fileDetails(
    where: string,
    file: FileComplexity,
    limits: ComplexityLimits,
    found: string[]
  ): ViolationDetail[] {
    const details: ViolationDetail[] = [];
    if (found.some(v => v.startsWith('File too long'))) {
      details.push({ file: where, message: `${file.codeLines} code lines` });
    }
    if (found.some(v => v.startsWith('Too many functions'))) {
      details.push({ file: where, message: `${file.functions} functions` });
    }
    if (found.some(v => v.startsWith('Function complexity too high'))) {
      details.push(
        ...file.functionScores
          .filter(fn => fn.score > limits.maxFunctionComplexity)
          .map(fn => ({
            file: where,
            line: fn.line,
            message: `function of complexity ${fn.score} (max ${limits.maxFunctionComplexity})`,
          }))
      );
    }
    if (found.some(v => v.startsWith('File complexity too high'))) {
      details.push({
        file: where,
        message: `estimated file complexity ${file.conditionals + file.functions}`,
      });
    }
    return details;
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
  /**
   * The law's result when there are files to measure and no parser to read
   * them with: failed, judged nothing, naming what was not read.
   */
  private static unreadWithoutParser(
    context: LawCheckContext
  ): LawResult | null {
    if (loadTypeScript(context.projectRoot)) return null;
    const files = CheckerUtils.findFilesByExtension(
      context.projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      context.config
    );
    if (files.length === 0) return null;
    return markJudgedNothing({
      passed: false,
      message: 'Code complexity not measured',
      violations: [
        `${parserUnavailable(context.projectRoot, `the ${files.length} .ts/.tsx file(s)`)} — Code Complexity Control judged nothing`,
      ],
      suggestions: [],
      score: 0,
      fixable: false,
      config: context.config,
    });
  }

  /** The thresholds, with their defaults and their older key names. */
  private static limitsOf(config: RuleOfCodeConfig): ComplexityLimits {
    const quality = config.thresholds?.codeQuality;
    return {
      maxFileLines: quality?.maxFileLines ?? 300,
      // A COUNT of functions, under a key that says so. `maxComplexity` reads
      // as cyclomatic complexity; it is still honoured as the fallback so
      // existing configs keep working, but it is not the name.
      maxFunctions:
        quality?.maxFunctionsPerFile ?? quality?.maxComplexity ?? 20,
      maxFunctionComplexity: quality?.minFunctionComplexity ?? 10,
      maxFileComplexity: quality?.maxFileComplexity,
    };
  }

  /** What one measured file is reported for. */
  private static fileFindings(
    where: string,
    file: FileComplexity,
    limits: ComplexityLimits
  ): string[] {
    const found: string[] = [];
    const tooComplex = file.worstFunction > limits.maxFunctionComplexity;

    // Lines of CODE: a comment or a blank line is not what makes a file hard
    // to hold in your head. And a file of data — a table, a registry, a list
    // of constants, at most two functions — is long because the data is; the
    // length limit is for logic, so it does not apply there.
    if (file.codeLines > limits.maxFileLines && file.functions > 2) {
      found.push(
        `File too long: ${where} (${file.codeLines} code lines, max ${limits.maxFileLines})`
      );
    }

    // Many functions are not debt on their own. A routing table, a provider
    // array, a module of small pure helpers each cost a function per entry
    // and nothing to reason about. The ceiling is for a file that has many
    // functions AND one that is too complex: then splitting is the remedy.
    if (file.functions > limits.maxFunctions && tooComplex) {
      found.push(
        `Too many functions in ${where} (${file.functions}, max ${limits.maxFunctions}) with a function of complexity ${file.worstFunction} — split it, or extract the branching`
      );
    }

    // Per FUNCTION, each on its own body: a callback inside a function is
    // its own function and is not added to the one around it.
    if (tooComplex) {
      found.push(
        `Function complexity too high in ${where} (worst function ${file.worstFunction}, max ${limits.maxFunctionComplexity})`
      );
    }

    // The file aggregate keeps its own, opt-in key: with no value set a file
    // is judged by its worst single function, never by its total.
    const fileComplexity = file.conditionals + file.functions;
    if (
      limits.maxFileComplexity !== undefined &&
      fileComplexity > limits.maxFileComplexity
    ) {
      found.push(
        `File complexity too high in ${where} (estimated ${fileComplexity}, max ${limits.maxFileComplexity})`
      );
    }
    return found;
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
