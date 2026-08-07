/**
 * Shared TODO analysis result container
 * Used by both analyzeTODOs and processFileForTodos to avoid duplication
 */
export interface TodoAnalysisResult {
  totalCount: number;
  properlyFormatted: number;
  vagueTodos: number;
  needsGitHubConversion: number;
  staleTodos: number;
  todoDetails: Array<{
    file: string;
    line: number;
    content: string;
    isProperlyFormatted: boolean;
    isVague: boolean;
    isStale: boolean;
  }>;
}

/**
 * Helper class to initialize TODO analysis result containers
 */
export class TodoAnalysisResultBuilder {
  /**
   * Create an empty TODO analysis result with all counters and arrays initialized
   */
  static createEmpty(): TodoAnalysisResult {
    return {
      totalCount: 0,
      properlyFormatted: 0,
      vagueTodos: 0,
      needsGitHubConversion: 0,
      staleTodos: 0,
      todoDetails: [],
    };
  }

  /**
   * Merge multiple TODO analysis results into one
   */
  static merge(...results: TodoAnalysisResult[]): TodoAnalysisResult {
    const merged = this.createEmpty();

    for (const result of results) {
      merged.totalCount += result.totalCount;
      merged.properlyFormatted += result.properlyFormatted;
      merged.vagueTodos += result.vagueTodos;
      merged.needsGitHubConversion += result.needsGitHubConversion;
      merged.staleTodos += result.staleTodos;
      merged.todoDetails.push(...result.todoDetails);
    }

    return merged;
  }
}
