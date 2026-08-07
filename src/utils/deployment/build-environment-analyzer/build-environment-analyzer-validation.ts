import type {
  BuildConsistency,
  DockerAnalysis,
  EnvironmentDetection,
} from '../../../types';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { PythonSatisfaction } from '../../python-satisfaction';
import { BuildEnvironmentAnalyzerConfiguration } from './build-environment-analyzer-configuration';

/**
 * Build Environment Analyzer Validation
 * Specialized validation utilities for build environment analysis
 */
export class BuildEnvironmentAnalyzerValidation {
  /**
   * Validate build consistency
   */
  static validateBuildConsistency(projectRoot: string): BuildConsistency {
    const buildKeywords = BuildEnvironmentAnalyzerConfiguration.BUILD_KEYWORDS;
    const envBuildKeywords =
      BuildEnvironmentAnalyzerConfiguration.ENV_BUILD_KEYWORDS;
    const testKeywords = BuildEnvironmentAnalyzerConfiguration.TEST_KEYWORDS;
    const messages =
      BuildEnvironmentAnalyzerConfiguration.BUILD_CONSISTENCY_MESSAGES;
    const configFiles =
      BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_FILES;
    const configMessages =
      BuildEnvironmentAnalyzerConfiguration.BUILD_CONFIG_MESSAGES;
    const paths =
      BuildEnvironmentAnalyzerConfiguration.getProjectFilePaths(projectRoot);
    const fileConfig =
      BuildEnvironmentAnalyzerConfiguration.FILE_READING_CONFIG;

    let packageJson: Record<string, unknown>;

    try {
      const packageContent = FileUtils.readFile(paths.packageJsonPath, {
        encoding: fileConfig.encoding,
      });
      packageJson = JSON.parse(packageContent);
    } catch (_error) {
      // A Python service has no package.json — that is not a parse ERROR, and
      // "Error parsing package.json" is a claim about a file they never wrote.
      // Their build system is a PEP 517 backend or a container image.
      if (PythonSatisfaction.isPython(projectRoot)) {
        const hasPythonBuild =
          PythonSatisfaction.hasPythonBuildSystem(projectRoot);
        const hasPythonTests = PythonSatisfaction.hasTestFramework(projectRoot);
        return {
          hasBuildScripts: hasPythonBuild,
          hasEnvironmentSpecificBuilds: hasPythonBuild,
          hasTestScripts: hasPythonTests,
          hasBuildConfig: hasPythonBuild,
          violations: hasPythonBuild
            ? []
            : ['No build system declared ([build-system] in pyproject.toml)'],
          suggestions: hasPythonBuild
            ? []
            : [
                'Declare a PEP 517 build backend in pyproject.toml, or build a container image',
              ],
        };
      }

      return {
        hasBuildScripts: false,
        hasEnvironmentSpecificBuilds: false,
        hasTestScripts: false,
        hasBuildConfig: false,
        violations: [messages.parseErrorMessage],
        suggestions: [messages.addBuildScripts],
      };
    }

    const scripts = packageJson.scripts ?? {};
    const scriptNames = Object.keys(scripts);

    const hasBuildScripts = scriptNames.some(script =>
      buildKeywords.some(keyword => script.includes(keyword))
    );

    const hasEnvironmentSpecificBuilds = scriptNames.some(
      script =>
        envBuildKeywords.some(env => script.includes(env)) &&
        buildKeywords.some(keyword => script.includes(keyword))
    );

    const hasTestScripts = scriptNames.some(script =>
      testKeywords.some(keyword => script.includes(keyword))
    );

    const hasBuildConfig = configFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    const violations = [];
    const suggestions = [];

    if (!hasBuildScripts) {
      violations.push(messages.noBuildMessage);
      suggestions.push(messages.addBuildScripts);
    }

    if (!hasEnvironmentSpecificBuilds) {
      suggestions.push(messages.addEnvBuilds);
      suggestions.push(messages.addEnvBuildExamples);
    }

    if (!hasTestScripts) {
      violations.push(messages.noTestMessage);
      suggestions.push(messages.addTestScripts);
    }

    if (!hasBuildConfig) {
      violations.push(configMessages.violationMessage);
      suggestions.push(configMessages.suggestionMessage);
    }

    return {
      hasBuildScripts,
      hasEnvironmentSpecificBuilds,
      hasTestScripts,
      hasBuildConfig,
      violations,
      suggestions,
    };
  }

  /**
   * Validate environment detection
   */
  static validateEnvironmentDetection(
    projectRoot: string
  ): EnvironmentDetection {
    const mainFilePaths = BuildEnvironmentAnalyzerConfiguration.MAIN_FILE_PATHS;
    const envPatterns = BuildEnvironmentAnalyzerConfiguration.ENV_PATTERNS;
    const configPaths = BuildEnvironmentAnalyzerConfiguration.ENV_CONFIG_PATHS;
    const messages =
      BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES;

    let hasEnvironmentDetection = false;
    const violations = [];
    const suggestions = [];

    // Check main files for environment detection
    const mainFiles = mainFilePaths
      .map(file => PathOperations.join(projectRoot, file))
      .filter(file => FileUtils.exists(file));

    for (const filePath of mainFiles) {
      try {
        const content = FileUtils.readFile(filePath, { encoding: 'utf8' });

        const hasEnvDetection = envPatterns.some(pattern =>
          pattern.test(content)
        );

        if (hasEnvDetection) {
          hasEnvironmentDetection = true;
          break;
        }
      } catch (_error) {
        continue;
      }
    }

    // Check config directories
    if (!hasEnvironmentDetection) {
      for (const configPath of configPaths) {
        const fullPath = PathOperations.join(projectRoot, configPath);
        if (FileUtils.exists(fullPath)) {
          hasEnvironmentDetection = true;
          break;
        }
      }
    }

    // Python reads its environment with os.environ / os.getenv, pydantic
    // BaseSettings, python-decouple or django.conf.settings. Telling a Flask
    // service to "use process.env.NODE_ENV" is advice it cannot take.
    if (
      !hasEnvironmentDetection &&
      PythonSatisfaction.hasPythonEnvironmentDetection(projectRoot)
    ) {
      hasEnvironmentDetection = true;
    }

    if (!hasEnvironmentDetection) {
      violations.push(messages.noDetection);
      suggestions.push(...this.environmentDetectionAdvice(projectRoot));
    }

    return {
      hasEnvironmentDetection,
      violations,
      suggestions,
    };
  }

  /** Advice the project can actually take, in the language it speaks. */
  private static environmentDetectionAdvice(projectRoot: string): string[] {
    const messages =
      BuildEnvironmentAnalyzerConfiguration.ENV_DETECTION_MESSAGES;

    if (PythonSatisfaction.isPython(projectRoot)) {
      return [
        'Read configuration from the environment (os.environ / pydantic BaseSettings) instead of hardcoding per-environment values',
      ];
    }

    return [
      messages.implementNodeEnv,
      messages.useProcessEnv,
      messages.createConfigManagement,
      messages.useEnvConfigs,
    ];
  }

  /**
   * Validate Docker environments
   */
  static validateDockerEnvironments(projectRoot: string): DockerAnalysis {
    const dockerEnvKeywords =
      BuildEnvironmentAnalyzerConfiguration.DOCKER_ENV_KEYWORDS;
    const dockerComposeEnvKeywords =
      BuildEnvironmentAnalyzerConfiguration.DOCKER_COMPOSE_ENV_KEYWORDS;
    const violationMessages =
      BuildEnvironmentAnalyzerConfiguration.DOCKER_VIOLATION_MESSAGES;
    const suggestionMessages =
      BuildEnvironmentAnalyzerConfiguration.DOCKER_SUGGESTION_MESSAGES;
    const paths =
      BuildEnvironmentAnalyzerConfiguration.getProjectFilePaths(projectRoot);

    let hasDockerfile = false;
    let dockerfileHandlesEnv = false;
    let hasDockerCompose = false;
    let dockerComposeHandlesEnv = false;
    const violations = [];
    const suggestions = [];

    // Check Dockerfile
    if (FileUtils.exists(paths.dockerfilePath)) {
      hasDockerfile = true;

      try {
        const dockerfileContent = FileUtils.readFile(paths.dockerfilePath, {
          encoding: 'utf8',
        });

        dockerfileHandlesEnv = dockerEnvKeywords.some(keyword =>
          dockerfileContent.includes(keyword)
        );

        if (!dockerfileHandlesEnv) {
          violations.push(violationMessages.noEnvVars);
          suggestions.push(suggestionMessages.useEnvArgs);
          suggestions.push(suggestionMessages.multiStage);
        }
      } catch (_error) {
        violations.push(violationMessages.readDockerfile);
      }
    }

    // Check docker-compose.yml
    if (FileUtils.exists(paths.dockerComposePath)) {
      hasDockerCompose = true;

      try {
        const dockerComposeContent = FileUtils.readFile(
          paths.dockerComposePath,
          { encoding: 'utf8' }
        );

        dockerComposeHandlesEnv = dockerComposeEnvKeywords.some(keyword =>
          dockerComposeContent.includes(keyword)
        );

        if (!dockerComposeHandlesEnv) {
          violations.push(violationMessages.noDockerComposeEnv);
          suggestions.push(suggestionMessages.useEnvFile);
          suggestions.push(suggestionMessages.separateServices);
        }
      } catch (_error) {
        violations.push(violationMessages.readDockerCompose);
      }
    }

    if (!hasDockerfile && !hasDockerCompose) {
      suggestions.push(suggestionMessages.considerDocker);
      suggestions.push(suggestionMessages.dockerParity);
    }

    return {
      hasDockerfile,
      dockerfileHandlesEnv,
      hasDockerCompose,
      dockerComposeHandlesEnv,
      violations,
      suggestions,
    };
  }
}
