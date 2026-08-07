/**
 * Unit Test Quality Law
 * Ensures high quality unit tests with proper structure and coverage
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ConfigHelper } from '../../utils/config-helper';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AsyncTestAnalyzer } from '../../utils/testing/async-test-analyzer';
import { TestCoverageAnalyzer } from '../../utils/testing/test-coverage-analyzer';
import { TestStructureAnalyzer } from '../../utils/testing/test-structure-analyzer';
import { TestingLawBase } from './testing-law-base';

export class UnitTestQualityLaw extends TestingLawBase {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const config = ConfigHelper.getConfigFromContext(context);
    const testFiles = this.getTestFiles(context.projectRoot, config);

    if (testFiles.length === 0) {
      violations.push('No test files found');
      suggestions.push('Create unit tests for your application');
      return TestingLawBase.createResult(
        violations,
        'Unit Test Quality',
        'TESTING',
        suggestions,
        context
      );
    }

    // Analyze test quality
    const qualityAnalysis = await this.analyzeTestQuality(testFiles);
    violations.push(...qualityAnalysis.violations);
    suggestions.push(...qualityAnalysis.suggestions);

    // Real-data mode: drop the checks that REQUIRE mocking / forbid inline real
    // data — they oppose an integration-first (no-mocks) testing philosophy.
    const realDataMode = config.thresholds?.testing?.realDataMode === true;
    const finalViolations = realDataMode
      ? violations.filter(
          (v) => !/no mocking detected|hardcoded test data/i.test(v)
        )
      : violations;

    const result = TestingLawBase.createResult(
      finalViolations,
      'Unit Test Quality',
      'TESTING',
      Array.from(new Set(suggestions)), // Remove duplicates
      context
    );

    // Add additional metrics to the result
    result.details = result.details ?? [];
    result.details.push(
      `Total test files: ${testFiles.length}`,
      `Total tests: ${qualityAnalysis.totalTests}`,
      `Average tests per file: ${qualityAnalysis.averageTestsPerFile}`,
      `Quality score: ${qualityAnalysis.qualityScore}`,
      `Files without tests: ${qualityAnalysis.filesWithoutTests}`
    );

    return result;
  }

  private static async analyzeTestQuality(testFiles: string[]): Promise<{
    violations: string[];
    suggestions: string[];
    totalTests: number;
    averageTestsPerFile: number;
    qualityScore: number;
    filesWithoutTests: number;
  }> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let totalTests = 0;
    let qualityScore = 0;
    let filesWithoutTests = 0;

    for (const file of testFiles) {
      try {
        const content = FileUtils.readFile(file);

        // Test structure analysis
        const structureAnalysis = await TestStructureAnalyzer.analyzeTestFile(file);
        const structViolations = this.extractViolations(structureAnalysis);
        violations.push(...structViolations);
        const structSuggestions = this.extractSuggestions(structureAnalysis);
        suggestions.push(...structSuggestions);

        // Async test analysis
        const asyncAnalysis = AsyncTestAnalyzer.analyzeAsyncPatterns(content);
        const asyncViolations = asyncAnalysis.asyncIssues;
        violations.push(...asyncViolations);
        const asyncSuggestions = asyncAnalysis.recommendations;
        suggestions.push(...asyncSuggestions);

        // Coverage analysis
        const coverageAnalysis = TestCoverageAnalyzer.analyzeCoverage(
          content,
          file
        );
        const coverageViolations = this.extractViolations(coverageAnalysis);
        violations.push(...coverageViolations);
        const coverageSuggestions = this.extractSuggestions(coverageAnalysis);
        suggestions.push(...coverageSuggestions);

        // Count tests in this file
        const testCount = this.countTestsInFile(content);
        totalTests += testCount;

        if (testCount === 0) {
          filesWithoutTests++;
        }

        // Calculate quality score for this file
        qualityScore += this.calculateFileQualityScore(
          structureAnalysis,
          asyncAnalysis,
          coverageAnalysis
        );
      } catch (_error) {
        violations.push(
          `Could not analyze test file ${PathOperations.getBasename(file)}`
        );
      }
    }

    const averageTestsPerFile =
      testFiles.length > 0 ? totalTests / testFiles.length : 0;
    const finalQualityScore =
      testFiles.length > 0 ? qualityScore / testFiles.length : 0;

    return {
      violations,
      suggestions,
      totalTests,
      averageTestsPerFile: Math.round(averageTestsPerFile * 100) / 100,
      qualityScore: Math.round(finalQualityScore * 100) / 100,
      filesWithoutTests,
    };
  }

  private static countTestsInFile(content: string): number {
    const testPatterns = [/\bit\s*\(/g, /\btest\s*\(/g, /\bdescribe\s*\(/g];

    let count = 0;
    for (const pattern of testPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  private static calculateFileQualityScore(
    structureAnalysis: unknown,
    asyncAnalysis: unknown,
    coverageAnalysis: unknown
  ): number {
    // Simple quality scoring based on violation counts
    const structureViolations = this.extractViolations(structureAnalysis);
    const asyncAnalysisObj = asyncAnalysis as Record<string, unknown>;
    const asyncViolations = asyncAnalysisObj.asyncIssues as string[];
    const coverageViolations = this.extractViolations(coverageAnalysis);

    const structureScore = Math.max(0, 10 - structureViolations.length);
    const asyncScore = Math.max(0, 10 - asyncViolations.length);
    const coverageScore = Math.max(0, 10 - coverageViolations.length);

    return (structureScore + asyncScore + coverageScore) / 3;
  }

  private static extractViolations(analysis: unknown): string[] {
    if (typeof analysis === 'object' && analysis !== null) {
      const analysisObj = analysis as Record<string, unknown>;
      return (analysisObj.violations ?? analysisObj.issues ?? []) as string[];
    }
    return [];
  }

  private static extractSuggestions(analysis: unknown): string[] {
    if (typeof analysis === 'object' && analysis !== null) {
      const analysisObj = analysis as Record<string, unknown>;
      return (analysisObj.suggestions ??
        analysisObj.recommendations ??
        []) as string[];
    }
    return [];
  }
}
