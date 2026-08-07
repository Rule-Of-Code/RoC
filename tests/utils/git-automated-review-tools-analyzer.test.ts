/**
 * Git Automated Review Tools Analyzer Tests
 * Tests for AutomatedReviewToolsAnalyzer, AutomatedReviewToolsAnalyzerConfiguration,
 * and AutomatedReviewToolsAnalyzerValidation classes
 */
import { DEFAULT_CONFIG } from '../../src/config/types';
import { ProjectTypeDetectorValidation } from '../../src/utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../src/utils/file-utils';
import {
  AutomatedReviewToolsAnalyzer,
  AutomatedReviewToolsAnalyzerConfiguration,
  AutomatedReviewToolsAnalyzerValidation,
} from '../../src/utils/git/automated-review-tools-analyzer';
import { PathOperations } from '../../src/utils/path-operations';

// Workspace root which is a real repository with CI/CD configurations
const WORKSPACE_ROOT = PathOperations.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..'
);

describe('AutomatedReviewToolsAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('art-analyzer-test-');
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // AutomatedReviewToolsAnalyzerConfiguration Tests
  // ============================================
  describe('AutomatedReviewToolsAnalyzerConfiguration', () => {
    describe('getLintingToolsPatterns()', () => {
      it('should return an object with tools array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();

        expect(result).toBeDefined();
        expect(Array.isArray(result.tools)).toBe(true);
        expect(result.tools.length).toBeGreaterThan(0);
      });

      it('should include eslint in tools', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();

        expect(result.tools).toContain('eslint');
      });

      it('should include prettier in tools', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();

        expect(result.tools).toContain('prettier');
      });

      it('should have violation message', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();

        expect(typeof result.violationMessage).toBe('string');
        expect(result.violationMessage.length).toBeGreaterThan(0);
      });

      it('should have suggestion message', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();

        expect(typeof result.suggestionMessage).toBe('string');
        expect(result.suggestionMessage.length).toBeGreaterThan(0);
      });
    });

    describe('getCodeQualityToolsPatterns()', () => {
      it('should return an object with tools array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCodeQualityToolsPatterns();

        expect(result).toBeDefined();
        expect(Array.isArray(result.tools)).toBe(true);
        expect(result.tools.length).toBeGreaterThan(0);
      });

      it('should include jest in tools', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCodeQualityToolsPatterns();

        expect(result.tools).toContain('jest');
      });

      it('should include codecov in tools', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCodeQualityToolsPatterns();

        expect(result.tools).toContain('codecov');
      });

      it('should have suggestion message', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCodeQualityToolsPatterns();

        expect(typeof result.suggestionMessage).toBe('string');
        expect(result.suggestionMessage.length).toBeGreaterThan(0);
      });
    });

    describe('getCICDPatterns()', () => {
      it('should return an object with configPaths array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(result).toBeDefined();
        expect(Array.isArray(result.configPaths)).toBe(true);
        expect(result.configPaths.length).toBeGreaterThan(0);
      });

      it('should include GitHub workflows path', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(result.configPaths).toContain('.github/workflows');
      });

      it('should include GitLab CI path', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(result.configPaths).toContain('.gitlab-ci.yml');
      });

      it('should have noCICDMessage', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(typeof result.noCICDMessage).toBe('string');
        expect(result.noCICDMessage.length).toBeGreaterThan(0);
      });

      it('should have noReviewChecksMessage', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(typeof result.noReviewChecksMessage).toBe('string');
        expect(result.noReviewChecksMessage.length).toBeGreaterThan(0);
      });

      it('should have cicdSuggestion', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(typeof result.cicdSuggestion).toBe('string');
        expect(result.cicdSuggestion.length).toBeGreaterThan(0);
      });

      it('should have reviewChecksSuggestion', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

        expect(typeof result.reviewChecksSuggestion).toBe('string');
        expect(result.reviewChecksSuggestion.length).toBeGreaterThan(0);
      });
    });

    describe('getReviewKeywords()', () => {
      it('should return an array of keywords', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getReviewKeywords();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should include lint keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getReviewKeywords();

        expect(result).toContain('lint');
      });

      it('should include test keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getReviewKeywords();

        expect(result).toContain('test');
      });

      it('should include quality keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getReviewKeywords();

        expect(result).toContain('quality');
      });

      it('should include review keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getReviewKeywords();

        expect(result).toContain('review');
      });
    });

    describe('getPreCommitHooksPatterns()', () => {
      it('should return an object with hookPaths array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getPreCommitHooksPatterns();

        expect(result).toBeDefined();
        expect(Array.isArray(result.hookPaths)).toBe(true);
        expect(result.hookPaths.length).toBeGreaterThan(0);
      });

      it('should include .husky path', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getPreCommitHooksPatterns();

        expect(result.hookPaths).toContain('.husky');
      });

      it('should have suggestions array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getPreCommitHooksPatterns();

        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('getDependencyUpdatersPatterns()', () => {
      it('should return an object with updaterPaths array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getDependencyUpdatersPatterns();

        expect(result).toBeDefined();
        expect(Array.isArray(result.updaterPaths)).toBe(true);
        expect(result.updaterPaths.length).toBeGreaterThan(0);
      });

      it('should include dependabot path', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getDependencyUpdatersPatterns();

        expect(result.updaterPaths).toContain('.github/dependabot.yml');
      });

      it('should include renovate path', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getDependencyUpdatersPatterns();

        expect(result.updaterPaths).toContain('renovate.json');
      });

      it('should have suggestion message', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getDependencyUpdatersPatterns();

        expect(typeof result.suggestionMessage).toBe('string');
        expect(result.suggestionMessage.length).toBeGreaterThan(0);
      });
    });

    describe('getCoverageReportingPatterns()', () => {
      it('should return an object with coverageConfigs array', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCoverageReportingPatterns();

        expect(result).toBeDefined();
        expect(Array.isArray(result.coverageConfigs)).toBe(true);
        expect(result.coverageConfigs.length).toBeGreaterThan(0);
      });

      it('should include coveralls config', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCoverageReportingPatterns();

        expect(result.coverageConfigs).toContain('.coveralls.yml');
      });

      it('should have suggestion message', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getCoverageReportingPatterns();

        expect(typeof result.suggestionMessage).toBe('string');
        expect(result.suggestionMessage.length).toBeGreaterThan(0);
      });
    });

    describe('getPackageJsonConfig()', () => {
      it('should return an object with fileName', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getPackageJsonConfig();

        expect(result).toBeDefined();
        expect(result.fileName).toBe('package.json');
      });
    });

    describe('getFileUtilsConfig()', () => {
      it('should return an object with includePattern', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getFileUtilsConfig();

        expect(result).toBeDefined();
        expect(typeof result.includePattern).toBe('string');
      });

      it('should return an object with excludePattern', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getFileUtilsConfig();

        expect(typeof result.excludePattern).toBe('string');
      });
    });

    describe('getFileReadingOptions()', () => {
      it('should return an object with encoding', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getFileReadingOptions();

        expect(result).toBeDefined();
        expect(result.encoding).toBe('utf8');
      });

      it('should return an object with flag', () => {
        const result =
          AutomatedReviewToolsAnalyzerConfiguration.getFileReadingOptions();

        expect(typeof result.flag).toBe('string');
      });
    });
  });

  // ============================================
  // AutomatedReviewToolsAnalyzerValidation Tests
  // ============================================
  describe('AutomatedReviewToolsAnalyzerValidation', () => {
    describe('analyzeProjectTools()', () => {
      it('should return analysis results object', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        expect(result).toBeDefined();
        expect(typeof result.hasLinting).toBe('boolean');
        expect(typeof result.hasCodeQualityTools).toBe('boolean');
      });

      it('should detect linting tools when package.json has eslint', () => {
        // Create package.json with eslint
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              eslint: '^8.0.0',
            },
          })
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        expect(result.hasLinting).toBe(true);
      });

      it('should detect code quality tools when package.json has jest', () => {
        // Create package.json with jest
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              jest: '^29.0.0',
            },
          })
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        expect(result.hasCodeQualityTools).toBe(true);
      });

      it('should return false for empty project', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        expect(result.hasLinting).toBe(false);
        expect(result.hasCodeQualityTools).toBe(false);
        expect(result.packageJson).toBeNull();
      });

      it('should return packageJson object when package.json exists with dependencies', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            devDependencies: {
              eslint: '^8.0.0',
            },
          })
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        expect(result.packageJson).not.toBeNull();
      });

      it('should return null packageJson when no dependencies', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            devDependencies: {},
          })
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        // Returns null because getProjectDependencies returns empty object
        expect(result.packageJson).toBeNull();
      });

      it('should return null packageJson when getPackageJson returns non-object', () => {
        // Mock getPackageJson to return a non-object value
        jest
          .spyOn(ProjectTypeDetectorValidation, 'getPackageJson')
          .mockReturnValueOnce('invalid' as any);

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeProjectTools(tempDir);

        expect(result.packageJson).toBeNull();
      });
    });

    describe('checkLintingTools()', () => {
      it('should add violations when no linting tools found', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkLintingTools(
          { hasLinting: false, hasCodeQualityTools: false },
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add violations when linting tools found', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkLintingTools(
          { hasLinting: true, hasCodeQualityTools: true },
          violations,
          suggestions
        );

        expect(violations.length).toBe(0);
      });

      it('should add suggestions when no code quality tools', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkLintingTools(
          { hasLinting: true, hasCodeQualityTools: false },
          violations,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('analyzeCIConfiguration()', () => {
      it('should return hasCICD false for empty project', () => {
        const ciConfigPaths = ['.github/workflows', '.gitlab-ci.yml'];

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeCIConfiguration(
            tempDir,
            ciConfigPaths
          );

        expect(result.hasCICD).toBe(false);
        expect(result.hasReviewChecks).toBe(false);
      });

      it('should detect GitHub workflows directory', () => {
        // Create .github/workflows directory with a workflow file
        const workflowsDir = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowsDir);
        FileUtils.writeFile(
          PathOperations.join(workflowsDir, 'ci.yml'),
          'name: CI\njobs:\n  lint:\n    runs-on: ubuntu-latest'
        );

        const ciConfigPaths = ['.github/workflows', '.gitlab-ci.yml'];

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeCIConfiguration(
            tempDir,
            ciConfigPaths
          );

        expect(result.hasCICD).toBe(true);
        expect(result.hasReviewChecks).toBe(true);
      });

      it('should detect GitLab CI file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.gitlab-ci.yml'),
          'stages:\n  - test\n  - lint'
        );

        const ciConfigPaths = ['.gitlab-ci.yml'];

        const result =
          AutomatedReviewToolsAnalyzerValidation.analyzeCIConfiguration(
            tempDir,
            ciConfigPaths
          );

        expect(result.hasCICD).toBe(true);
        expect(result.hasReviewChecks).toBe(true);
      });
    });

    describe('checkForReviewAutomation()', () => {
      it('should return false for non-existent path', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.checkForReviewAutomation(
            PathOperations.join(tempDir, 'non-existent')
          );

        expect(result).toBe(false);
      });

      it('should check workflow directory for review automation', () => {
        const workflowsDir = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowsDir);
        FileUtils.writeFile(
          PathOperations.join(workflowsDir, 'ci.yml'),
          'name: CI\njobs:\n  test:\n    runs-on: ubuntu-latest'
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkForReviewAutomation(
            workflowsDir
          );

        expect(result).toBe(true);
      });

      it('should check single config file for review automation', () => {
        const ciFilePath = PathOperations.join(tempDir, '.gitlab-ci.yml');
        FileUtils.writeFile(ciFilePath, 'stages:\n  - lint\n  - quality');

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkForReviewAutomation(
            ciFilePath
          );

        expect(result).toBe(true);
      });
    });

    describe('checkWorkflowDirectory()', () => {
      it('should return true when workflow has review keywords', () => {
        const workflowsDir = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowsDir);
        FileUtils.writeFile(
          PathOperations.join(workflowsDir, 'lint.yml'),
          'name: Lint\njobs:\n  lint:\n    runs-on: ubuntu-latest'
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkWorkflowDirectory(
            workflowsDir
          );

        expect(result).toBe(true);
      });

      it('should return false for empty workflow directory', () => {
        const workflowsDir = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowsDir);

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkWorkflowDirectory(
            workflowsDir
          );

        expect(result).toBe(false);
      });

      it('should skip directories in workflow directory', () => {
        const workflowsDir = PathOperations.join(
          tempDir,
          '.github',
          'workflows'
        );
        FileUtils.createDirectory(workflowsDir);

        // Create ONLY a subdirectory (no files - should return false)
        const subDir = PathOperations.join(workflowsDir, 'templates');
        FileUtils.createDirectory(subDir);

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkWorkflowDirectory(
            workflowsDir
          );

        // Should return false since directory is skipped and no files exist
        expect(result).toBe(false);
      });
    });

    describe('checkSingleConfigFile()', () => {
      it('should return true when file contains review keywords', () => {
        const configPath = PathOperations.join(tempDir, 'ci-config.yml');
        FileUtils.writeFile(configPath, 'stages:\n  - test\n  - lint');

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkSingleConfigFile(
            configPath
          );

        expect(result).toBe(true);
      });

      it('should return false when file has no review keywords', () => {
        const configPath = PathOperations.join(tempDir, 'ci-config.yml');
        FileUtils.writeFile(configPath, 'stages:\n  - deploy\n  - build');

        const result =
          AutomatedReviewToolsAnalyzerValidation.checkSingleConfigFile(
            configPath
          );

        expect(result).toBe(false);
      });
    });

    describe('hasReviewKeywords()', () => {
      it('should return true for content with lint keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.hasReviewKeywords(
            'run lint checks'
          );
        expect(result).toBe(true);
      });

      it('should return true for content with test keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.hasReviewKeywords(
            'run test suite'
          );
        expect(result).toBe(true);
      });

      it('should return true for content with quality keyword', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.hasReviewKeywords(
            'code quality check'
          );
        expect(result).toBe(true);
      });

      it('should return true for content with review keyword', () => {
        const result = AutomatedReviewToolsAnalyzerValidation.hasReviewKeywords(
          'code review automation'
        );
        expect(result).toBe(true);
      });

      it('should return false for content without keywords', () => {
        const result = AutomatedReviewToolsAnalyzerValidation.hasReviewKeywords(
          'deploy to production'
        );
        expect(result).toBe(false);
      });
    });

    describe('checkPreCommitHooks()', () => {
      it('should not add suggestions when husky is configured', () => {
        // Create .husky directory
        FileUtils.createDirectory(PathOperations.join(tempDir, '.husky'));

        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkPreCommitHooks(
          tempDir,
          violations,
          suggestions
        );

        // Should not add pre-commit suggestions when husky exists
        const preCommitSuggestions = suggestions.filter(
          s =>
            s.toLowerCase().includes('hook') ||
            s.toLowerCase().includes('husky')
        );
        expect(preCommitSuggestions.length).toBe(0);
      });

      it('should add suggestions when no pre-commit hooks configured', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkPreCommitHooks(
          tempDir,
          violations,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('detectPreCommitHooks()', () => {
      it('should return true when .husky directory exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, '.husky'));

        const result =
          AutomatedReviewToolsAnalyzerValidation.detectPreCommitHooks(tempDir);

        expect(result).toBe(true);
      });

      it('should return false when no pre-commit hooks configured', () => {
        const result =
          AutomatedReviewToolsAnalyzerValidation.detectPreCommitHooks(tempDir);

        expect(result).toBe(false);
      });

      it('should return true when pre-commit config exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.pre-commit-config.yaml'),
          'repos:\n  - repo: local'
        );

        const result =
          AutomatedReviewToolsAnalyzerValidation.detectPreCommitHooks(tempDir);

        expect(result).toBe(true);
      });
    });

    describe('checkCodeQualityIntegration()', () => {
      it('should add suggestions when no dependency updaters found', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCodeQualityIntegration(
          tempDir,
          violations,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add dependency updater suggestions when configured', () => {
        // Create dependabot config
        FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.github', 'dependabot.yml'),
          'version: 2\nupdates:\n  - package-ecosystem: npm'
        );
        // Also create coverage config to avoid those suggestions
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'codecov.yml'),
          'coverage:\n  precision: 2'
        );

        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCodeQualityIntegration(
          tempDir,
          violations,
          suggestions
        );

        // Should have fewer suggestions since some tools are configured
        expect(suggestions.length).toBeLessThanOrEqual(2);
      });
    });

    describe('checkDependencyUpdaters()', () => {
      it('should add suggestion when no dependency updater found', () => {
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkDependencyUpdaters(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(1);
      });

      it('should not add suggestion when dependabot configured', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.github', 'dependabot.yml'),
          'version: 2'
        );

        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkDependencyUpdaters(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should not add suggestion when renovate configured', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'renovate.json'),
          '{}'
        );

        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkDependencyUpdaters(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });
    });

    describe('checkCoverageReporting()', () => {
      it('should add suggestion when no coverage reporting found', () => {
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCoverageReporting(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(1);
      });

      it('should not add suggestion when coveralls configured', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.coveralls.yml'),
          'repo_token: test'
        );

        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCoverageReporting(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should not add suggestion when codecov configured', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'codecov.yml'),
          'coverage:\n  precision: 2'
        );

        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCoverageReporting(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });
    });

    describe('checkCIConfiguration()', () => {
      it('should add violation when no CI/CD configured', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCIConfiguration(
          tempDir,
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should add violation when CI exists but no review checks', () => {
        // Create CI file without review keywords
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.travis.yml'),
          'language: node_js\nscript: npm run build'
        );

        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCIConfiguration(
          tempDir,
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
      });

      it('should not add violation when CI has review checks', () => {
        // Create CI file with review keywords
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.travis.yml'),
          'language: node_js\nscript:\n  - npm run lint\n  - npm run test'
        );

        const violations: string[] = [];
        const suggestions: string[] = [];

        AutomatedReviewToolsAnalyzerValidation.checkCIConfiguration(
          tempDir,
          violations,
          suggestions
        );

        expect(violations.length).toBe(0);
      });
    });

    describe('executeAutomatedReviewToolsAnalysisWorkflow()', () => {
      it('should return violations and suggestions arrays', () => {
        const config = DEFAULT_CONFIG;

        const result =
          AutomatedReviewToolsAnalyzerValidation.executeAutomatedReviewToolsAnalysisWorkflow(
            tempDir,
            config
          );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should detect issues in empty project', () => {
        const config = DEFAULT_CONFIG;

        const result =
          AutomatedReviewToolsAnalyzerValidation.executeAutomatedReviewToolsAnalysisWorkflow(
            tempDir,
            config
          );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should work with real workspace', () => {
        const config = DEFAULT_CONFIG;

        const result =
          AutomatedReviewToolsAnalyzerValidation.executeAutomatedReviewToolsAnalysisWorkflow(
            WORKSPACE_ROOT,
            config
          );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });
  });

  // ============================================
  // AutomatedReviewToolsAnalyzer Tests
  // ============================================
  describe('AutomatedReviewToolsAnalyzer', () => {
    describe('checkAutomatedReviewTools()', () => {
      it('should return violations and suggestions', () => {
        const config = DEFAULT_CONFIG;

        const result = AutomatedReviewToolsAnalyzer.checkAutomatedReviewTools(
          tempDir,
          config
        );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should detect missing tools in empty project', () => {
        const config = DEFAULT_CONFIG;

        const result = AutomatedReviewToolsAnalyzer.checkAutomatedReviewTools(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should work with real workspace', () => {
        const config = DEFAULT_CONFIG;

        const result = AutomatedReviewToolsAnalyzer.checkAutomatedReviewTools(
          WORKSPACE_ROOT,
          config
        );

        expect(result).toBeDefined();
      });
    });

    describe('detectPreCommitHooks()', () => {
      it('should return true when .husky exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, '.husky'));

        const result =
          AutomatedReviewToolsAnalyzer.detectPreCommitHooks(tempDir);

        expect(result).toBe(true);
      });

      it('should return false when no hooks configured', () => {
        const result =
          AutomatedReviewToolsAnalyzer.detectPreCommitHooks(tempDir);

        expect(result).toBe(false);
      });

      it('should delegate to validation class', () => {
        const analyzerResult =
          AutomatedReviewToolsAnalyzer.detectPreCommitHooks(tempDir);
        const validationResult =
          AutomatedReviewToolsAnalyzerValidation.detectPreCommitHooks(tempDir);

        expect(analyzerResult).toBe(validationResult);
      });
    });
  });
});
