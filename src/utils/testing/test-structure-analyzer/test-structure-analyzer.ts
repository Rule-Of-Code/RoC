import type { TestAnalysisResult } from './test-structure-analyzer-configuration';
import { TestStructureAnalyzerValidationPatterns } from './test-structure-analyzer-validation-patterns';

/**
 * Test Structure Analyzer
 * Facade for analyzing test structure and organization patterns
 * Delegates all logic to utility classes (RULE 2: Centralized validation)
 */
export class TestStructureAnalyzer {
  static async analyzeTestFile(testFile: string): Promise<TestAnalysisResult> {
    return TestStructureAnalyzerValidationPatterns.analyzeTestFile(testFile);
  }

  static getTestStructureRecommendations(): string[] {
    return Array.from(
      TestStructureAnalyzerValidationPatterns.getTestStructureRecommendations()
    );
  }
}
