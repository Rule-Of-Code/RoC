import {
  CheckerUtils,
  ConfigFileUtils,
  FileUtils,
  PathOperations,
} from '../../../../utils';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { PythonSatisfaction } from '../../../../utils/python-satisfaction';
import { SASTConstants } from '../constants/sast';
import { SecurityTestFileConstants } from '../constants/test-file';

/**
 * SASTAnalyzerService
 *
 * Analyzes Static Application Security Testing (SAST) implementation.
 * Responsibilities:
 * - Check package.json for SAST tools
 * - Check ESLint configuration
 * - Check GitHub workflows for security scanning
 */
export class SASTAnalyzerService {
  /**
   * Analyze SAST implementation
   */
  static analyze(projectRoot: string): {
    configured: boolean;
    tools: string[];
  } {
    try {
      const tools: string[] = [];

      if (this.checkPackageJsonForSASTTools(projectRoot, tools)) {
        return { configured: true, tools };
      }

      if (this.checkESLintConfiguration(projectRoot, tools)) {
        return { configured: true, tools };
      }

      if (this.checkGitHubWorkflows(projectRoot, tools)) {
        return { configured: true, tools };
      }

      if (this.checkPythonSast(projectRoot, tools)) {
        return { configured: true, tools };
      }

      return { configured: false, tools };
    } catch {
      return { configured: false, tools: [] };
    }
  }

  /**
   * SAST, the Python way. The three checks above look for SAST in JS/TS only:
   * npm dependencies, ESLint configs, GitHub workflow filenames. A Python
   * project running bandit from its pre-commit gate, configured in
   * `pyproject.toml`, was told "SAST not configured" — a claim about our
   * vocabulary reported as a fact about their security posture (a backend consumer).
   */
  private static checkPythonSast(
    projectRoot: string,
    detectedTools: string[]
  ): boolean {
    if (!PythonSatisfaction.isPython(projectRoot)) return false;
    if (!PythonSatisfaction.hasPythonSast(projectRoot)) return false;

    const found = PythonSatisfaction.detectPythonSastTools(projectRoot);
    detectedTools.push(...(found.length > 0 ? found : ['Python SAST']));
    return true;
  }

  /**
   * Check package.json for SAST tools
   */
  private static checkPackageJsonForSASTTools(
    projectRoot: string,
    detectedTools: string[]
  ): boolean {
    const deps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    if (Object.keys(deps).length === 0) return false;

    const found = SASTConstants.detectTools(deps);
    detectedTools.push(...found);
    return found.length > 0;
  }

  /**
   * Check ESLint configuration
   */
  private static checkESLintConfiguration(
    projectRoot: string,
    detectedTools: string[]
  ): boolean {
    const eslintConfigPaths = SASTConstants.CONFIG_FILES.map(config =>
      PathOperations.join(projectRoot, config)
    );

    for (const configPath of eslintConfigPaths) {
      if (this.checkSingleESLintConfig(configPath, detectedTools)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check a single ESLint config file for security configuration
   */
  private static checkSingleESLintConfig(
    configPath: string,
    detectedTools: string[]
  ): boolean {
    if (!FileUtils.exists(configPath)) {
      return false;
    }

    try {
      const content = FileUtils.readFile(configPath, { encoding: 'utf8' });
      if (!SASTConstants.hasSecurityConfig(content)) {
        return false;
      }
      if (!detectedTools.includes('ESLint Security Rules')) {
        detectedTools.push('ESLint Security Rules');
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check GitHub workflows for security scanning
   */
  private static checkGitHubWorkflows(
    projectRoot: string,
    detectedTools: string[]
  ): boolean {
    const githubWorkflowPath = PathOperations.join(
      projectRoot,
      SecurityTestFileConstants.GITHUB_WORKFLOWS_PATH
    );

    if (!FileUtils.exists(githubWorkflowPath)) return false;

    try {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const workflows = CheckerUtils.findFilesByExtension(
        githubWorkflowPath,
        ['yml', 'yaml'],
        config
      );

      for (const workflow of workflows) {
        const fileName = PathOperations.getBasename(workflow);
        if (SASTConstants.isSecurityWorkflow(fileName)) {
          if (!detectedTools.includes('GitHub Security Workflow')) {
            detectedTools.push('GitHub Security Workflow');
          }
          return true;
        }
      }
    } catch {
      // Ignore directory read errors
    }

    return false;
  }
}
