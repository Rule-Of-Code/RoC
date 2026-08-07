import type { LawCheckContext, LawResult } from '../../types/law.types';
import { LawResultBuilder } from './law-result-builder';
import {
  LicenseCheckerAnalysisService,
  LicenseCheckerConstants,
} from './license-checker/index';

/**
 * License Checker Law
 * Validates license compliance in projects
 * Responsibilities: ONLY coordination
 */
export class LicenseCheckerLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;

      // Analyze project licenses
      const licenseAnalysis = LicenseCheckerAnalysisService.analyzeLicenses(
        projectRoot,
        context
      );

      // Analyze dependency licenses
      const dependencyLicenses =
        LicenseCheckerAnalysisService.checkDependencyLicenses(projectRoot);

      // Calculate score and details
      let score = 100;
      const details: string[] = [];

      if (!licenseAnalysis.hasProjectLicense) {
        score -=
          LicenseCheckerConstants.SCORE_DEDUCTIONS.MISSING_PROJECT_LICENSE;
        details.push('Missing project license file');
      }

      if (dependencyLicenses.incompatibleLicenses.length > 0) {
        score -= LicenseCheckerConstants.SCORE_DEDUCTIONS.INCOMPATIBLE_LICENSES;
        details.push(
          `${dependencyLicenses.incompatibleLicenses.length} incompatible licenses found`
        );
      }

      if (dependencyLicenses.unknownLicenses.length > 0) {
        score -= LicenseCheckerConstants.SCORE_DEDUCTIONS.UNKNOWN_LICENSES;
        details.push(
          `${dependencyLicenses.unknownLicenses.length} dependencies with unknown licenses`
        );
      }

      if (dependencyLicenses.copyleftLicenses.length > 0) {
        score -= LicenseCheckerConstants.SCORE_DEDUCTIONS.COPYLEFT_LICENSES;
        details.push(
          `${dependencyLicenses.copyleftLicenses.length} copyleft licenses require attention`
        );
      }

      if (licenseAnalysis.filesWithoutHeaders > 0) {
        score -= LicenseCheckerConstants.SCORE_DEDUCTIONS.MISSING_HEADERS;
        details.push(
          `${licenseAnalysis.filesWithoutHeaders} source files missing license headers`
        );
      }

      const passed = score >= LicenseCheckerConstants.PASS_THRESHOLD;
      const message = passed
        ? '✅ License compliance verified'
        : `⚠️ License compliance issues: ${details.join(', ')}`;

      return LawResultBuilder.buildSuccess(
        passed,
        score,
        message,
        details,
        context
      );
    } catch (error: unknown) {
      return LawResultBuilder.buildError(
        error,
        'License checker',
        context,
        'Check license configuration and retry'
      );
    }
  }
}
