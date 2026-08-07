import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
// Interfaces for TODO analysis
interface TodoFormattingAnalysis {
  properlyFormattedCount: number;
  improperlFormattedCount: number;
  outdatedCount: number;
  totalCount: number;
  violations: string[];
  suggestions: string[];
}

/**
 * TODO Management Standards Law
 *
 * Validates proper TODO management and formatting standards:
 * - All TODOs properly formatted with JIRA/GitHub references
 * - TODO completion dates and tracking
 * - TODO sprint assignment and planning
 * - Proper TODO categorization and prioritization
 * - Outdated TODO identification and cleanup
 * - TODO migration to issue tracking systems
 * - Code comment TODO consistency
 * - Documentation TODO maintenance
 *
 * Professional implementation following TODO management best practices
 */
export class TodoManagementStandardsLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;

    // Initialize configurable thresholds
    const thresholds = {
      improperFormattingDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.improperFormattingDeduction ?? 5,
      maxImproperFormattingDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.maxImproperFormattingDeduction ?? 30,
      noReferenceDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.noReferenceDeduction ?? 3,
      maxNoReferenceDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.maxNoReferenceDeduction ?? 25,
      outdatedDeduction:
        config.thresholds?.documentation?.todoManagement?.outdatedDeduction ??
        2,
      maxOutdatedDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.maxOutdatedDeduction ?? 20,
      uncategorizedDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.uncategorizedDeduction ?? 1,
      maxUncategorizedDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.maxUncategorizedDeduction ?? 15,
      migrationCandidateDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.migrationCandidateDeduction ?? 1,
      maxMigrationCandidateDeduction:
        config.thresholds?.documentation?.todoManagement
          ?.maxMigrationCandidateDeduction ?? 10,
      longDescriptionLength:
        config.thresholds?.documentation?.todoManagement
          ?.longDescriptionLength ?? 100,
    };

    // 1. Find all TODO comments in codebase
    const todoAnalysis = this.analyzeTODOComments(projectRoot);
    if (todoAnalysis.totalTodos === 0) {
      return {
        passed: true,
        message: '✅ TODO Management: No TODOs found to validate',
        details: ['No TODO comments found in codebase'],
        violations: [],
        suggestions: [],
        score: 100,
        fixable: false,
        config: context.config,
      };
    }

    // 2. Check TODO formatting standards
    const formattingAnalysis = this.analyzeTODOFormatting(todoAnalysis.todos);
    if (formattingAnalysis.improperlFormattedCount > 0) {
      violations.push(
        `${formattingAnalysis.improperlFormattedCount} TODOs with improper formatting`
      );
      suggestions.push(
        'Format TODOs as: TODO (JIRA-123): Description or TODO (Sprint X): Description'
      );
      score -= Math.min(
        thresholds.maxImproperFormattingDeduction,
        formattingAnalysis.improperlFormattedCount *
          thresholds.improperFormattingDeduction
      );
    }

    // 3. Check for JIRA/GitHub references
    const referenceAnalysis = this.analyzeTODOReferences(todoAnalysis.todos);
    if (referenceAnalysis.withoutReferencesCount > 0) {
      violations.push(
        `${referenceAnalysis.withoutReferencesCount} TODOs without JIRA/GitHub references`
      );
      suggestions.push(
        'Add JIRA ticket or GitHub issue references to all TODOs'
      );
      score -= Math.min(
        thresholds.maxNoReferenceDeduction,
        referenceAnalysis.withoutReferencesCount *
          thresholds.noReferenceDeduction
      );
    }

    // 4. Check for outdated TODOs
    const outdatedAnalysis = this.analyzeOutdatedTODOs(todoAnalysis.todos);
    if (outdatedAnalysis.outdatedCount > 0) {
      // Checks 4-6 are advisory: a suggestion, no violation, and therefore no
      // score deduction. They used to drag the score to ~55 while the law
      // reported passed:true and printed "TODOs properly managed".
      suggestions.push(
        `${outdatedAnalysis.outdatedCount} TODOs appear outdated - review for cleanup`
      );
    }

    // 5. Check TODO categorization
    const categorizationAnalysis = this.analyzeTODOCategorization(
      todoAnalysis.todos
    );
    if (categorizationAnalysis.uncategorizedCount > 0) {
      suggestions.push(
        `${categorizationAnalysis.uncategorizedCount} TODOs without clear categorization`
      );
    }

    // 6. Check for TODO migration opportunities
    const migrationAnalysis = this.analyzeTODOMigrationOpportunities(
      todoAnalysis.todos,
      thresholds.longDescriptionLength
    );
    if (migrationAnalysis.migrationCandidates > 0) {
      suggestions.push(
        `${migrationAnalysis.migrationCandidates} TODOs should be migrated to issue tracking`
      );
    }

    return Promise.resolve({
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        todoAnalysis.totalTodos,
        formattingAnalysis
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    });
  }

  private static analyzeTODOComments(projectRoot: string): {
    todos: TODOComment[];
    totalTodos: number;
  } {
    const todos: TODOComment[] = [];
    this.scanDirectoryForTODOs(projectRoot, todos);

    return {
      todos,
      totalTodos: todos.length,
    };
  }

  private static scanDirectoryForTODOs(
    dirPath: string,
    todos: TODOComment[]
  ): void {
    try {
      const allFiles = CheckerUtils.findFilesByExtension(
        dirPath,
        [
          ...CheckerUtils.getCommonExtensions().ALL_CODE,
          '.html',
          '.scss',
          '.css',
          '.md',
        ],
        ConfigFileUtils.getMinimalDefaultConfig()
      );

      for (const filePath of allFiles) {
        if (this.isCodeFile(PathOperations.getBasename(filePath))) {
          this.extractTODOsFromFile(filePath, todos);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  private static isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.ts',
      '.js',
      '.tsx',
      '.jsx',
      '.html',
      '.css',
      '.scss',
      '.sass',
      '.md',
      '.json',
      '.yml',
      '.yaml',
      '.xml',
      '.sql',
      '.py',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.rb',
      '.go',
      '.rs',
    ];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  private static extractTODOsFromFile(
    filePath: string,
    todos: TODOComment[]
  ): void {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line) {
          const todoMatch = this.findTODOInLine(line);

          if (todoMatch) {
            todos.push({
              file: filePath,
              line: i + 1,
              content: todoMatch.content,
              type: todoMatch.type,
              fullLine: line.trim(),
            });
          }
        }
      }
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  private static findTODOInLine(
    line: string
  ): { content: string; type: string } | null {
    const todoPatterns = [
      { pattern: /TODO[\s:]+(.+)/i, type: 'ActionItem' },

      { pattern: /FIXME[\s:]+(.+)/i, type: 'BugFix' },

      { pattern: /HACK[\s:]+(.+)/i, type: 'Temporary' },
      { pattern: /XXX[\s:]+(.+)/i, type: 'XXX' },
      { pattern: /NOTE[\s:]+(.+)/i, type: 'NOTE' },
    ];

    for (const { pattern, type } of todoPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return {
          content: match[1].trim(),
          type,
        };
      }
    }

    return null;
  }

  private static analyzeTODOFormatting(
    todos: TODOComment[]
  ): TodoFormattingAnalysis {
    let properlyFormattedCount = 0;
    let improperlFormattedCount = 0;
    let outdatedCount = 0;

    const validFormats = [
      /\(JIRA-\d+\):/i, // (JIRA-123):
      /\(Sprint \d+\):/i, // (Sprint 5):
      /\(Issue #\d+\):/i, // (Issue #42):
      /\(GH-\d+\):/i, // (GH-123):
      /\(Ticket \d+\):/i, // (Ticket 456):
    ];

    for (const todo of todos) {
      const hasValidFormat = validFormats.some(format =>
        format.test(todo.content)
      );
      if (hasValidFormat) {
        properlyFormattedCount++;
      } else {
        improperlFormattedCount++;
      }

      // Check if TODO seems outdated (simple heuristic)
      if (
        todo.content.toLowerCase().includes('old') ||
        todo.content.toLowerCase().includes('legacy')
      ) {
        outdatedCount++;
      }
    }

    return {
      properlyFormattedCount,
      improperlFormattedCount,
      outdatedCount,
      totalCount: todos.length,
      violations:
        improperlFormattedCount > 0 ? ['Improper TODO formatting'] : [],
      suggestions:
        improperlFormattedCount > 0
          ? ['Use proper TODO formatting with ticket references']
          : [],
    };
  }

  private static analyzeTODOReferences(todos: TODOComment[]): {
    withReferencesCount: number;
    withoutReferencesCount: number;
    percentageWithReferences: number;
  } {
    let withReferencesCount = 0;
    let withoutReferencesCount = 0;

    const referencePatterns = [
      /JIRA-\d+/i,
      /Issue #\d+/i,
      /GH-\d+/i,
      /Ticket \d+/i,
      /#\d+/,
      /http[s]?:\/\/[^\s)]+/i,
    ];

    for (const todo of todos) {
      const hasReference = referencePatterns.some(pattern =>
        pattern.test(todo.content)
      );
      if (hasReference) {
        withReferencesCount++;
      } else {
        withoutReferencesCount++;
      }
    }

    const totalTodos = withReferencesCount + withoutReferencesCount;
    const percentageWithReferences =
      totalTodos > 0 ? (withReferencesCount / totalTodos) * 100 : 0;

    return {
      withReferencesCount,
      withoutReferencesCount,
      percentageWithReferences,
    };
  }

  private static analyzeOutdatedTODOs(todos: TODOComment[]): {
    outdatedCount: number;
  } {
    let outdatedCount = 0;

    const outdatedIndicators = [
      /\b(19|20)\d{2}\b/, // Year references
      /last year/i,
      /next sprint/i,
      /soon/i,
      /asap/i,
      /urgent/i,
      /temporary/i,
      /quick fix/i,
    ];

    for (const todo of todos) {
      const isOutdated = outdatedIndicators.some(pattern =>
        pattern.test(todo.content)
      );
      if (isOutdated) {
        outdatedCount++;
      }
    }

    return { outdatedCount };
  }

  private static analyzeTODOCategorization(todos: TODOComment[]): {
    categorizedCount: number;
    uncategorizedCount: number;
  } {
    let categorizedCount = 0;
    let uncategorizedCount = 0;

    const categoryIndicators = [
      /refactor/i,
      /performance/i,
      /security/i,
      /testing/i,
      /documentation/i,
      /optimization/i,
      /cleanup/i,
      /enhancement/i,
      /bug/i,
      /feature/i,
    ];

    for (const todo of todos) {
      const isCategorized = categoryIndicators.some(pattern =>
        pattern.test(todo.content)
      );
      if (isCategorized) {
        categorizedCount++;
      } else {
        uncategorizedCount++;
      }
    }

    return {
      categorizedCount,
      uncategorizedCount,
    };
  }

  private static analyzeTODOMigrationOpportunities(
    todos: TODOComment[],
    longDescriptionLength: number
  ): {
    migrationCandidates: number;
    urgentCandidates: number;
  } {
    let migrationCandidates = 0;

    const migrationIndicators = [
      /major/i,
      /complex/i,
      /redesign/i,
      /architecture/i,
      /breaking change/i,
      /milestone/i,
      /epic/i,
      /requires discussion/i,
    ];

    for (const todo of todos) {
      const shouldMigrate =
        migrationIndicators.some(pattern => pattern.test(todo.content)) ||
        todo.content.length > longDescriptionLength;
      if (shouldMigrate) {
        migrationCandidates++;
      }
    }

    // Count urgent candidates (subset of migration candidates with urgent indicators)
    let urgentCandidates = 0;
    const urgentIndicators = [/urgent/i, /critical/i, /blocking/i];

    for (const todo of todos) {
      if (urgentIndicators.some(indicator => indicator.test(todo.content))) {
        urgentCandidates++;
      }
    }

    return { migrationCandidates, urgentCandidates };
  }

  private static generateMessage(
    violationCount: number,
    totalTodos: number,
    formattingAnalysis: TodoFormattingAnalysis
  ): string {
    if (violationCount === 0) {
      return `✅ TODO Management: ${totalTodos} TODOs properly managed`;
    }

    return `⚠️ TODO Management: ${formattingAnalysis.improperlFormattedCount}/${totalTodos} TODOs need formatting`;
  }
}

interface TODOComment {
  file: string;
  line: number;
  content: string;
  type: string;
  fullLine: string;
}
