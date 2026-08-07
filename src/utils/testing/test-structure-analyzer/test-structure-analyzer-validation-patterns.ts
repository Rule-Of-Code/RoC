import { FileUtils } from '../../file-utils';
import type { TestAnalysisResult } from './test-structure-analyzer-configuration';
import { TestStructureAnalyzerConfiguration } from './test-structure-analyzer-configuration';

/**
 * Test Structure Analyzer Validation Patterns
 * Orchestrates test structure validation using centralized Configuration (RULE 2: Optimize internals)
 * Replaces duplicated detection logic with configuration-driven analysis
 */
export class TestStructureAnalyzerValidationPatterns {
  /**
   * Count tests without assertions using centralized patterns
   */
  static countTestsWithoutAssertions(content: string): number {
    const testBlocks =
      TestStructureAnalyzerConfiguration.getTestBlocksSkippingFirst(content);
    let testsWithoutAssertions = 0;

    testBlocks.forEach(block => {
      const blockEnd =
        TestStructureAnalyzerConfiguration.findMatchingBrace(block);
      const testContent = block.substring(0, blockEnd);

      if (!TestStructureAnalyzerConfiguration.hasAssertion(testContent)) {
        testsWithoutAssertions++;
      }
    });

    return testsWithoutAssertions;
  }

  /**
   * Check if content has repeated setup using centralized patterns
   * RULE 2: Configuration-driven iteration for setup patterns
   */
  static hasRepeatedSetup(content: string): boolean {
    const testBlocks =
      TestStructureAnalyzerConfiguration.splitTestBlocks(content);
    if (testBlocks.length < 3) return false;

    const setupCounts = new Map<string, number>();
    const setupPatterns = Object.values(
      TestStructureAnalyzerConfiguration.SETUP_PATTERNS
    );

    TestStructureAnalyzerConfiguration.getTestBlocksSkippingFirst(
      content
    ).forEach(block => {
      setupPatterns.forEach(pattern => {
        const matches = TestStructureAnalyzerConfiguration.countSetupPatterns(
          block,
          pattern as string
        );
        setupCounts.set(
          pattern as string,
          (setupCounts.get(pattern as string) ?? 0) + matches
        );
      });
    });

    return Array.from(setupCounts.values()).some(
      count =>
        count >
        testBlocks.length *
          TestStructureAnalyzerConfiguration.REPEATED_SETUP_RATIO
    );
  }

  /**
   * Count poor test names using centralized configuration
   * RULE 2: Configuration-driven iteration replaces duplicate checks
   */
  static countPoorTestNames(content: string): number {
    const testMatches =
      TestStructureAnalyzerConfiguration.getTestBlockMatches(content);
    let poorNames = 0;

    testMatches.forEach(match => {
      const description =
        TestStructureAnalyzerConfiguration.extractDescription(match);

      for (const config of TestStructureAnalyzerConfiguration.TEST_NAME_QUALITY_CONFIGS) {
        if (config.checker(description)) {
          poorNames++;
          break;
        }
      }
    });

    return poorNames;
  }

  /**
   * Analyze test file using centralized Configuration
   */
  static async analyzeTestFile(testFile: string): Promise<TestAnalysisResult> {
    return new Promise((resolve, _reject) => {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        const testMatches =
          TestStructureAnalyzerConfiguration.getTestBlockMatches(content);

        resolve({
          hasDescribeBlocks:
            TestStructureAnalyzerConfiguration.hasDescribeBlocks(content),
          hasDescribeableTestNames:
            TestStructureAnalyzerConfiguration.hasDescriptiveNames(testMatches),
          testsWithoutAssertions: this.countTestsWithoutAssertions(content),
          hasRepeatedSetup: this.hasRepeatedSetup(content),
          needsTeardown:
            TestStructureAnalyzerConfiguration.requiresTeardown(content),
          hasSharedState:
            TestStructureAnalyzerConfiguration.hasSharedState(content),
          poorTestNames: this.countPoorTestNames(content),
        });
      } catch (_error) {
        resolve(TestStructureAnalyzerConfiguration.getDefaultAnalysisResult());
      }
    });
  }

  /**
   * Get test structure recommendations from centralized configuration
   * RULE 1: Single source of truth for recommendations
   */
  static getTestStructureRecommendations(): readonly string[] {
    return TestStructureAnalyzerConfiguration.TEST_STRUCTURE_RECOMMENDATIONS;
  }
}
