import type { RuleOfCodeConfig } from '../../../../types';
import { TestKeywordsConstants } from '../constants';
import { DependencyScanningAnalyzerService } from './dependency-scanning-analyzer.service';
import { SASTAnalyzerService } from './sast-analyzer.service';
import { SecurityTestContentSearchService } from './security-test-content-search.service';
import { SecurityTestFileDiscoveryService } from './security-test-file-discovery.service';

/**
 * SecurityTestingRequirementsAnalyzerService
 *
 * Pure coordinator that orchestrates security testing analysis.
 * Responsibilities:
 * - Coordinate SAST analysis
 * - Coordinate dependency scanning analysis
 * - Coordinate security test discovery
 * - Coordinate security test content search
 *
 * Delegates all implementation details to specialized services.
 */
export class SecurityTestingRequirementsAnalyzerService {
  /**
   * Analyze SAST (Static Application Security Testing) implementation
   */
  static analyzeSASTImplementation(projectRoot: string): {
    configured: boolean;
    tools: string[];
  } {
    return SASTAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze dependency vulnerability scanning setup
   */
  static analyzeDependencyScanning(projectRoot: string): {
    configured: boolean;
    configFiles: string[];
  } {
    return DependencyScanningAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze security test cases
   */
  static analyzeSecurityTestCases(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasTests: boolean;
    testFiles: string[];
  } {
    return SecurityTestFileDiscoveryService.analyze(projectRoot, config);
  }

  /**
   * Analyze authentication and authorization tests
   */
  static analyzeAuthenticationTests(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasTests: boolean;
  } {
    const hasTests = SecurityTestContentSearchService.hasTestContent(
      projectRoot,
      config,
      content => TestKeywordsConstants.hasAuthTestContent(content)
    );
    return { hasTests };
  }

  /**
   * Analyze input validation tests
   */
  static analyzeInputValidationTests(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasTests: boolean;
  } {
    const hasTests = SecurityTestContentSearchService.hasTestContent(
      projectRoot,
      config,
      content => TestKeywordsConstants.hasInputValidationTestContent(content)
    );
    return { hasTests };
  }

  /**
   * Analyze security headers tests
   */
  static analyzeSecurityHeadersTests(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasTests: boolean;
  } {
    const hasTests = SecurityTestContentSearchService.hasTestContent(
      projectRoot,
      config,
      content => TestKeywordsConstants.hasSecurityHeadersTestContent(content)
    );
    return { hasTests };
  }
}
