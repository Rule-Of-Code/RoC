import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { TodoAnalysisResult } from './todo-analysis-result';
import { TodoAnalysisResultBuilder } from './todo-analysis-result';
/**
 * TODO Management Constitutional Requirements Law
 *
 * Constitutional law for proper TODO management that checks for:
 * - TODO count limits (maximum 30 TODOs in codebase)
 * - Proper TODO format with sprint reference: TODO (Sprint X): Description
 * - Descriptive TODO content (not vague or incomplete)
 * - GitHub issue conversion for old TODOs
 * - TODO categorization and prioritization
 * - Sprint-based TODO tracking and completion
 * - Removal of completed/obsolete TODOs
 * - TODO documentation standards
 *
 * Professional implementation following TODO management best practices
 * Status: Constitutional requirement for codebase hygiene
 */
export class TodoManagementLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Find all source files and analyze TODOs
    const sourceFiles = this.findSourceFiles(projectRoot);
    const todoAnalysis = this.analyzeTODOs(sourceFiles, context.config);

    // 2. Check TODO count limits
    const maxTodoCount =
      context.config.thresholds?.documentation?.maxTodoCount ?? 30;
    if (todoAnalysis.totalCount > maxTodoCount) {
      violations.push(
        `${todoAnalysis.totalCount} TODOs found (limit: ${maxTodoCount})`
      );
      suggestions.push(
        'Convert excess TODOs to GitHub Issues or remove obsolete ones'
      );
      score -= Math.min(40, ((todoAnalysis.totalCount - 30) / 30) * 40);
    }

    // 3. Check TODO format compliance
    const formatCompliance =
      (todoAnalysis.properlyFormatted / todoAnalysis.totalCount) * 100 || 0;
    if (formatCompliance < 80 && todoAnalysis.totalCount > 0) {
      violations.push(
        `${Math.round(100 - formatCompliance)}% of TODOs improperly formatted`
      );
      suggestions.push('Use format: TODO (Sprint X): Description');
      score -= 25;
    }

    // 4. Check for descriptive TODOs
    if (todoAnalysis.vagueTodos > 0) {
      violations.push(`${todoAnalysis.vagueTodos} vague or incomplete TODOs`);
      suggestions.push('Make TODOs descriptive with clear action items');
      score -= 15;
    }

    // 5. Check for GitHub issue references
    if (todoAnalysis.needsGitHubConversion > 0) {
      violations.push(
        `${todoAnalysis.needsGitHubConversion} TODOs should be converted to GitHub Issues`
      );
      suggestions.push(
        'Convert complex TODOs to GitHub Issues with proper tracking'
      );
      score -= 10;
    }

    // 6. Check for old/stale TODOs
    if (todoAnalysis.staleTodos > 0) {
      violations.push(
        `${todoAnalysis.staleTodos} potentially stale TODOs (old sprint references)`
      );
      suggestions.push(
        'Review and update old sprint TODOs or mark as completed'
      );
      score -= 10;
    }

    // Calculate compliance metrics
    const overallCompliance = Math.round(
      (todoAnalysis.properlyFormatted / Math.max(todoAnalysis.totalCount, 1)) *
        100
    );

    return Promise.resolve({
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? `TODO management compliant: ${todoAnalysis.totalCount} TODOs, ${overallCompliance}% properly formatted`
          : `TODO management violations: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    });
  }

  private static findSourceFiles(projectRoot: string): string[] {
    const sourceFiles: string[] = [];
    const extensions = [
      '.ts',
      '.js',
      '.tsx',
      '.jsx',
      '.html',
      '.scss',
      '.css',
      '.md',
    ];

    const searchDirectory = (dir: string): void => {
      if (!FileUtils.exists(dir)) return;

      try {
        const entries = CheckerUtils.safeReadDir(
          dir,

          FileUtils.getMinimalDefaultConfig()
        );

        for (const entry of entries) {
          const fullPath = PathOperations.join(dir, entry);
          this.processFileSystemEntry(
            fullPath,
            entry,
            extensions,
            sourceFiles,
            searchDirectory
          );
        }
      } catch (_error) {
        // Skip directories we can't access
      }
    };

    searchDirectory(projectRoot);
    return sourceFiles;
  }

  private static analyzeTODOs(
    sourceFiles: string[],
    config: RuleOfCodeConfig
  ): TodoAnalysisResult {
    const result = TodoAnalysisResultBuilder.createEmpty();

    for (const file of sourceFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const fileResult = this.processFileForTodos(content, file, config);

        result.totalCount += fileResult.totalCount;
        result.properlyFormatted += fileResult.properlyFormatted;
        result.vagueTodos += fileResult.vagueTodos;
        result.needsGitHubConversion += fileResult.needsGitHubConversion;
        result.staleTodos += fileResult.staleTodos;
        result.todoDetails.push(...fileResult.todoDetails);
      } catch (_error) {
        // Skip files we can't read
      }
    }

    return result;
  }

  private static isTodoVague(
    todoContent: string,
    config: RuleOfCodeConfig
  ): boolean {
    // Check for vague patterns
    const vaguePatterns = [
      /TODO:?\s*fix/i,
      /TODO:?\s*refactor/i,
      /TODO:?\s*improve/i,
      /TODO:?\s*update/i,
      /TODO:?\s*change/i,
      /TODO:?\s*review/i,
      /TODO:?\s*check/i,
      /TODO:?\s*remove/i,
      /TODO:?\s*add/i,
      /TODO:?\s*implement/i,
    ];

    // Check if content is too short
    const minLength =
      config.thresholds?.documentation?.minTodoDescriptionLength ?? 20;
    const contentAfterTodo = todoContent.replace(/.*TODO:?\s*/i, '').trim();
    if (contentAfterTodo.length < minLength) {
      return true;
    }

    // Check for vague patterns
    return vaguePatterns.some(pattern => pattern.test(todoContent));
  }

  private static needsGitHubConversion(
    todoContent: string,
    config: RuleOfCodeConfig
  ): boolean {
    // Check for indicators that suggest GitHub Issue conversion
    const maxLength =
      config.thresholds?.documentation?.maxTodoContentLength ?? 100;
    const lengthIndicator = todoContent.length > maxLength; // Long TODOs
    const patternIndicators = [
      /implement\s+.*feature/i.test(todoContent), // Feature implementations
      /refactor\s+.*architecture/i.test(todoContent), // Architecture changes
      /major\s+.*change/i.test(todoContent), // Major changes
      /breaking\s+change/i.test(todoContent), // Breaking changes
      /epic|story|requirement/i.test(todoContent), // Epic-level work
      /multiple\s+(files?|components?|modules?)/i.test(todoContent), // Multi-file changes
    ];

    return lengthIndicator || patternIndicators.some(indicator => indicator);
  }

  private static isTodoStale(todoContent: string): boolean {
    // Extract sprint number from TODO
    const sprintMatch = todoContent.match(/Sprint\s+(\d+)/i);
    if (!sprintMatch?.[1]) {
      return false; // Not sprint-formatted, can't determine staleness
    }

    const sprintNumber = parseInt(sprintMatch[1], 10);
    if (isNaN(sprintNumber)) {
      return false;
    }

    // Consider current date and estimate current sprint
    // Assuming sprints started in December 2024 and are weekly
    const now = new Date();
    const sprintStartDate = new Date('2024-12-01'); // Approximate start
    const weeksSinceStart = Math.floor(
      (now.getTime() - sprintStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const estimatedCurrentSprint = Math.max(1, weeksSinceStart);

    // Consider TODOs more than 4 sprints old as potentially stale
    return sprintNumber < estimatedCurrentSprint - 4;
  }

  /**
   * Process a single file system entry during directory traversal
   */
  private static processFileSystemEntry(
    fullPath: string,
    entry: string,
    extensions: string[],
    sourceFiles: string[],
    searchDirectory: (dir: string) => void
  ): void {
    try {
      const stat = FileUtils.getFileStats(fullPath);

      if (stat?.isDirectory()) {
        // Skip common directories that don't need TODO tracking
        if (this.shouldSkipDirectory(entry)) {
          return;
        }
        searchDirectory(fullPath);
      } else if (stat?.isFile()) {
        const ext = PathOperations.getExtension(entry);
        if (extensions.includes(ext)) {
          sourceFiles.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip files we can't access
    }
  }

  /**
   * Check if directory should be skipped during TODO analysis
   */
  private static shouldSkipDirectory(entry: string): boolean {
    const skipDirectories = [
      'node_modules',
      '.git',
      '.angular',
      'dist',
      'coverage',
      '.nx',
      'tmp',
      'android',
      'ios',
    ];
    return skipDirectories.includes(entry);
  }

  /**
   * Analyze a single TODO comment
   */
  private static analyzeSingleTodo(
    todoContent: string,
    file: string,
    lineNumber: number,
    config: RuleOfCodeConfig
  ): {
    isProperlyFormatted: boolean;
    isVague: boolean;
    needsConversion: boolean;
    isStale: boolean;
    details: {
      file: string;
      line: number;
      content: string;
      isProperlyFormatted: boolean;
      isVague: boolean;
      isStale: boolean;
    };
  } {
    // Check if properly formatted: TODO (Sprint X): Description
    const isProperlyFormatted = /TODO\s*\(Sprint\s+\d+\):/i.test(todoContent);

    // Check if vague (too short, no description, generic)
    const isVague = this.isTodoVague(todoContent, config);

    // Check if needs GitHub conversion (complex, long-term)
    const needsConversion = this.needsGitHubConversion(todoContent, config);

    // Check if stale (references old sprints)
    const isStale = this.isTodoStale(todoContent);

    const details = {
      file: PathOperations.getRelative(process.cwd(), file),
      line: lineNumber,
      content: todoContent,
      isProperlyFormatted,
      isVague,
      isStale,
    };

    return {
      isProperlyFormatted,
      isVague,
      needsConversion,
      isStale,
      details,
    };
  }

  /**
   * Process a single file for TODO comments
   */
  private static processFileForTodos(
    content: string,
    file: string,
    config: RuleOfCodeConfig
  ): TodoAnalysisResult {
    const result = TodoAnalysisResultBuilder.createEmpty();
    // Blank string/template-literal CONTENTS first (comments are KEPT — that is
    // where a real TODO marker lives). A `// TODO` inside a display or captured
    // string (e.g. an example of what a TODO looks like) is text, not a real
    // TODO; scanning raw source counted it. Newlines are preserved so line
    // numbers stay accurate.
    const scannable = this.blankStringLiterals(content);
    const lines = scannable.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !this.hasTodoComment(line)) continue;

      this.processTodoLine(line, file, i + 1, config, result);
    }

    return result;
  }

  /**
   * Check if a line contains a TODO comment
   */
  private static hasTodoComment(line: string): boolean {
    const todoPatterns = [
      /\/\/\s*TODO/gi,
      /<!--\s*TODO/gi,
      /\/\*\s*TODO/gi,
      /#\s*TODO/gi,
    ];
    return todoPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Blank string/template-literal CONTENTS, keeping comments and newlines, so a
   * TODO marker that only appears inside a string (a captured or display string
   * showing what a TODO looks like) is not counted as a real TODO.
   */
  private static blankStringLiterals(content: string): string {
    return content.replace(
      /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
      match => match.replace(/[^\n]/g, ' ')
    );
  }

  /**
   * Process a single line containing a TODO comment
   */
  private static processTodoLine(
    line: string,
    file: string,
    lineNumber: number,
    config: RuleOfCodeConfig,
    result: TodoAnalysisResult
  ): void {
    result.totalCount++;

    const todoContent = line.trim();
    const analysis = this.analyzeSingleTodo(
      todoContent,
      file,
      lineNumber,
      config
    );

    this.updateResultCounters(analysis, result);
    result.todoDetails.push(analysis.details);
  }

  /**
   * Update result counters based on TODO analysis
   */
  private static updateResultCounters(
    analysis: ReturnType<typeof TodoManagementLaw.analyzeSingleTodo>,
    result: TodoAnalysisResult
  ): void {
    if (analysis.isProperlyFormatted) result.properlyFormatted++;
    if (analysis.isVague) result.vagueTodos++;
    if (analysis.needsConversion) result.needsGitHubConversion++;
    if (analysis.isStale) result.staleTodos++;
  }
}
