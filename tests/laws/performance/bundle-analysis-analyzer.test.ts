/**
 * Tests for BundleAnalysisAnalyzerService
 *
 * Tests for bundle analysis tools configuration detection.
 */
import { BundleAnalysisAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/bundle-analysis.analyzer';
import { ProjectTypeDetectorValidation } from '../../../src/utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../src/utils/file-utils';

describe('BundleAnalysisAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('bundle-analysis-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return isSetup false when no bundle analysis tools are found', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({});

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(false);
      expect(result.tools).toHaveLength(0);
    });

    it('should detect webpack-bundle-analyzer dependency', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'webpack-bundle-analyzer': '^4.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({});

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('webpack-bundle-analyzer');
    });

    it('should detect bundlesize dependency', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          bundlesize: '^1.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({});

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('bundlesize');
    });

    it('should detect bundle-buddy dependency', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'bundle-buddy': '^1.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({});

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('bundle-buddy');
    });

    it('should detect source-map-explorer dependency', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'source-map-explorer': '^2.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({});

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('source-map-explorer');
    });

    it('should detect multiple bundle analysis tools', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'webpack-bundle-analyzer': '^4.0.0',
          'source-map-explorer': '^2.0.0',
          bundlesize: '^1.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({});

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('webpack-bundle-analyzer');
      expect(result.tools).toContain('source-map-explorer');
      expect(result.tools).toContain('bundlesize');
    });

    it('should detect bundle analysis script in package.json', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          analyze: 'webpack-bundle-analyzer dist/stats.json',
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('Bundle analysis script in npm scripts');
    });

    it('should detect bundle keyword in script value', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          build: 'ng build',
          'analyze-bundle':
            'npx source-map-explorer dist/**/*.js && bundle report',
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      // The 'bundle' pattern must be in the script VALUE
      expect(result.isSetup).toBe(true);
    });

    it('should detect only when bundle is in script value not key', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          build: 'ng build',
          'analyze:bundle': 'npx source-map-explorer dist/**/*.js',
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      // Script key has 'bundle' but value does not contain 'bundle'
      expect(result.isSetup).toBe(false);
    });

    it('should add script message only once with multiple bundle scripts', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          'bundle:analyze': 'bundle analyze script',
          'bundle:report': 'bundle report script',
          'view-bundle': 'view bundle script',
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      // Only one script message should be added regardless of how many scripts have 'bundle'
      const scriptMessages = result.tools.filter(
        t => t === 'Bundle analysis script in npm scripts'
      );
      expect(scriptMessages.length).toBe(1);
    });

    it('should handle null scripts gracefully', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue(null as unknown as Record<string, string>);

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(false);
      expect(result.tools).toHaveLength(0);
    });

    it('should combine dependencies and scripts', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          'webpack-bundle-analyzer': '^4.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          analyze: 'bundle-analyzer dist/',
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(true);
      expect(result.tools).toContain('webpack-bundle-analyzer');
      expect(result.tools).toContain('Bundle analysis script in npm scripts');
    });

    it('should ignore non-bundle related dependencies', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({
          lodash: '^4.0.0',
          rxjs: '^7.0.0',
          '@angular/core': '^15.0.0',
        });
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          build: 'ng build',
          test: 'ng test',
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(false);
      expect(result.tools).toHaveLength(0);
    });

    it('should skip non-string script values', () => {
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getProjectDependencies')
        .mockReturnValue({});
      jest
        .spyOn(ProjectTypeDetectorValidation, 'getPackageScripts')
        .mockReturnValue({
          build: 'ng build',
          invalid: 123 as unknown as string,
        });

      const result = BundleAnalysisAnalyzerService.analyze(tempDir);

      expect(result.isSetup).toBe(false);
    });
  });
});
