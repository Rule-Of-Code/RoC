/**
 * Tests for TodoAnalysisResult and TodoAnalysisResultBuilder
 *
 * Tests TODO analysis interfaces and builder utilities.
 */
import {
  TodoAnalysisResult,
  TodoAnalysisResultBuilder,
} from '../../../src/laws/documentation/todo-analysis-result';

describe('TodoAnalysisResult', () => {
  describe('interface compliance', () => {
    it('should require totalCount number property', () => {
      const result: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 5,
        vagueTodos: 3,
        needsGitHubConversion: 2,
        staleTodos: 1,
        todoDetails: [],
      };
      expect(typeof result.totalCount).toBe('number');
    });

    it('should require properlyFormatted number property', () => {
      const result: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 8,
        vagueTodos: 1,
        needsGitHubConversion: 1,
        staleTodos: 0,
        todoDetails: [],
      };
      expect(typeof result.properlyFormatted).toBe('number');
    });

    it('should require vagueTodos number property', () => {
      const result: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 2,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      expect(typeof result.vagueTodos).toBe('number');
    });

    it('should require needsGitHubConversion number property', () => {
      const result: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 0,
        needsGitHubConversion: 2,
        staleTodos: 0,
        todoDetails: [],
      };
      expect(typeof result.needsGitHubConversion).toBe('number');
    });

    it('should require staleTodos number property', () => {
      const result: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 2,
        todoDetails: [],
      };
      expect(typeof result.staleTodos).toBe('number');
    });

    it('should require todoDetails array property', () => {
      const result: TodoAnalysisResult = {
        totalCount: 1,
        properlyFormatted: 1,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [
          {
            file: 'src/app.ts',
            line: 10,
            content: 'TODO: fix this',
            isProperlyFormatted: true,
            isVague: false,
            isStale: false,
          },
        ],
      };
      expect(Array.isArray(result.todoDetails)).toBe(true);
    });

    it('should have todoDetails with correct shape', () => {
      const detail = {
        file: 'src/component.ts',
        line: 25,
        content: 'TODO(user): add validation',
        isProperlyFormatted: true,
        isVague: false,
        isStale: false,
      };
      expect(typeof detail.file).toBe('string');
      expect(typeof detail.line).toBe('number');
      expect(typeof detail.content).toBe('string');
      expect(typeof detail.isProperlyFormatted).toBe('boolean');
      expect(typeof detail.isVague).toBe('boolean');
      expect(typeof detail.isStale).toBe('boolean');
    });
  });
});

describe('TodoAnalysisResultBuilder', () => {
  describe('createEmpty', () => {
    it('should return a TodoAnalysisResult object', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result).toBeDefined();
    });

    it('should have totalCount of 0', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result.totalCount).toBe(0);
    });

    it('should have properlyFormatted of 0', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result.properlyFormatted).toBe(0);
    });

    it('should have vagueTodos of 0', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result.vagueTodos).toBe(0);
    });

    it('should have needsGitHubConversion of 0', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result.needsGitHubConversion).toBe(0);
    });

    it('should have staleTodos of 0', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result.staleTodos).toBe(0);
    });

    it('should have empty todoDetails array', () => {
      const result = TodoAnalysisResultBuilder.createEmpty();
      expect(result.todoDetails).toEqual([]);
    });

    it('should return new objects on each call', () => {
      const result1 = TodoAnalysisResultBuilder.createEmpty();
      const result2 = TodoAnalysisResultBuilder.createEmpty();
      expect(result1).not.toBe(result2);
    });
  });

  describe('merge', () => {
    it('should return empty result for no arguments', () => {
      const result = TodoAnalysisResultBuilder.merge();
      expect(result.totalCount).toBe(0);
    });

    it('should return copy for single result', () => {
      const single: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 1,
        needsGitHubConversion: 1,
        staleTodos: 0,
        todoDetails: [],
      };
      const result = TodoAnalysisResultBuilder.merge(single);
      expect(result.totalCount).toBe(5);
    });

    it('should sum totalCount from multiple results', () => {
      const result1: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 1,
        needsGitHubConversion: 1,
        staleTodos: 0,
        todoDetails: [],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 8,
        vagueTodos: 2,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2);
      expect(merged.totalCount).toBe(15);
    });

    it('should sum properlyFormatted from multiple results', () => {
      const result1: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 1,
        needsGitHubConversion: 1,
        staleTodos: 0,
        todoDetails: [],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 7,
        vagueTodos: 2,
        needsGitHubConversion: 1,
        staleTodos: 0,
        todoDetails: [],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2);
      expect(merged.properlyFormatted).toBe(10);
    });

    it('should sum vagueTodos from multiple results', () => {
      const result1: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 2,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 8,
        vagueTodos: 3,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2);
      expect(merged.vagueTodos).toBe(5);
    });

    it('should sum needsGitHubConversion from multiple results', () => {
      const result1: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 0,
        needsGitHubConversion: 2,
        staleTodos: 0,
        todoDetails: [],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 8,
        vagueTodos: 0,
        needsGitHubConversion: 4,
        staleTodos: 0,
        todoDetails: [],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2);
      expect(merged.needsGitHubConversion).toBe(6);
    });

    it('should sum staleTodos from multiple results', () => {
      const result1: TodoAnalysisResult = {
        totalCount: 5,
        properlyFormatted: 3,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 1,
        todoDetails: [],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 10,
        properlyFormatted: 8,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 3,
        todoDetails: [],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2);
      expect(merged.staleTodos).toBe(4);
    });

    it('should concatenate todoDetails from multiple results', () => {
      const detail1 = {
        file: 'file1.ts',
        line: 10,
        content: 'TODO: task 1',
        isProperlyFormatted: true,
        isVague: false,
        isStale: false,
      };
      const detail2 = {
        file: 'file2.ts',
        line: 20,
        content: 'TODO: task 2',
        isProperlyFormatted: true,
        isVague: false,
        isStale: false,
      };
      const result1: TodoAnalysisResult = {
        totalCount: 1,
        properlyFormatted: 1,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [detail1],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 1,
        properlyFormatted: 1,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [detail2],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2);
      expect(merged.todoDetails.length).toBe(2);
      expect(merged.todoDetails[0]).toEqual(detail1);
      expect(merged.todoDetails[1]).toEqual(detail2);
    });

    it('should merge three or more results', () => {
      const result1: TodoAnalysisResult = {
        totalCount: 1,
        properlyFormatted: 1,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      const result2: TodoAnalysisResult = {
        totalCount: 2,
        properlyFormatted: 2,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      const result3: TodoAnalysisResult = {
        totalCount: 3,
        properlyFormatted: 3,
        vagueTodos: 0,
        needsGitHubConversion: 0,
        staleTodos: 0,
        todoDetails: [],
      };
      const merged = TodoAnalysisResultBuilder.merge(result1, result2, result3);
      expect(merged.totalCount).toBe(6);
      expect(merged.properlyFormatted).toBe(6);
    });
  });
});
