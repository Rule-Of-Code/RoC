/**
 * Tests for Deployment Types
 *
 * Tests interfaces for build consistency, environment detection, and Docker analysis.
 */
import {
  BuildConsistency,
  DockerAnalysis,
  EnvironmentDetection,
} from '../../src/types/deployment';

describe('DeploymentTypes', () => {
  describe('BuildConsistency interface', () => {
    it('should require hasBuildScripts boolean property', () => {
      const build: BuildConsistency = {
        hasBuildScripts: true,
        hasEnvironmentSpecificBuilds: false,
        hasTestScripts: true,
        hasBuildConfig: true,
        violations: [],
        suggestions: [],
      };
      expect(typeof build.hasBuildScripts).toBe('boolean');
    });

    it('should require hasEnvironmentSpecificBuilds boolean property', () => {
      const build: BuildConsistency = {
        hasBuildScripts: true,
        hasEnvironmentSpecificBuilds: true,
        hasTestScripts: false,
        hasBuildConfig: true,
        violations: [],
        suggestions: [],
      };
      expect(typeof build.hasEnvironmentSpecificBuilds).toBe('boolean');
    });

    it('should require hasTestScripts boolean property', () => {
      const build: BuildConsistency = {
        hasBuildScripts: true,
        hasEnvironmentSpecificBuilds: true,
        hasTestScripts: true,
        hasBuildConfig: true,
        violations: [],
        suggestions: [],
      };
      expect(build.hasTestScripts).toBe(true);
    });

    it('should require hasBuildConfig boolean property', () => {
      const build: BuildConsistency = {
        hasBuildScripts: false,
        hasEnvironmentSpecificBuilds: false,
        hasTestScripts: false,
        hasBuildConfig: false,
        violations: [],
        suggestions: [],
      };
      expect(build.hasBuildConfig).toBe(false);
    });

    it('should require violations array', () => {
      const build: BuildConsistency = {
        hasBuildScripts: false,
        hasEnvironmentSpecificBuilds: false,
        hasTestScripts: false,
        hasBuildConfig: false,
        violations: ['Missing build script'],
        suggestions: [],
      };
      expect(Array.isArray(build.violations)).toBe(true);
      expect(build.violations.length).toBe(1);
    });

    it('should require suggestions array', () => {
      const build: BuildConsistency = {
        hasBuildScripts: false,
        hasEnvironmentSpecificBuilds: false,
        hasTestScripts: false,
        hasBuildConfig: false,
        violations: [],
        suggestions: ['Add build script', 'Configure CI/CD'],
      };
      expect(Array.isArray(build.suggestions)).toBe(true);
      expect(build.suggestions.length).toBe(2);
    });

    it('should allow all flags to be true', () => {
      const build: BuildConsistency = {
        hasBuildScripts: true,
        hasEnvironmentSpecificBuilds: true,
        hasTestScripts: true,
        hasBuildConfig: true,
        violations: [],
        suggestions: [],
      };
      expect(build.hasBuildScripts).toBe(true);
      expect(build.hasEnvironmentSpecificBuilds).toBe(true);
      expect(build.hasTestScripts).toBe(true);
      expect(build.hasBuildConfig).toBe(true);
    });
  });

  describe('EnvironmentDetection interface', () => {
    it('should require hasEnvironmentDetection boolean property', () => {
      const envDetection: EnvironmentDetection = {
        hasEnvironmentDetection: true,
        violations: [],
        suggestions: [],
      };
      expect(typeof envDetection.hasEnvironmentDetection).toBe('boolean');
    });

    it('should require violations array', () => {
      const envDetection: EnvironmentDetection = {
        hasEnvironmentDetection: false,
        violations: ['No environment detection'],
        suggestions: [],
      };
      expect(Array.isArray(envDetection.violations)).toBe(true);
    });

    it('should require suggestions array', () => {
      const envDetection: EnvironmentDetection = {
        hasEnvironmentDetection: false,
        violations: [],
        suggestions: ['Add NODE_ENV detection'],
      };
      expect(envDetection.suggestions[0]).toBe('Add NODE_ENV detection');
    });

    it('should allow clean state with detection', () => {
      const envDetection: EnvironmentDetection = {
        hasEnvironmentDetection: true,
        violations: [],
        suggestions: [],
      };
      expect(envDetection.hasEnvironmentDetection).toBe(true);
      expect(envDetection.violations.length).toBe(0);
    });
  });

  describe('DockerAnalysis interface', () => {
    it('should require hasDockerfile boolean property', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: true,
        dockerfileHandlesEnv: true,
        hasDockerCompose: false,
        dockerComposeHandlesEnv: false,
        violations: [],
        suggestions: [],
      };
      expect(typeof docker.hasDockerfile).toBe('boolean');
    });

    it('should require dockerfileHandlesEnv boolean property', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: true,
        dockerfileHandlesEnv: false,
        hasDockerCompose: false,
        dockerComposeHandlesEnv: false,
        violations: [],
        suggestions: [],
      };
      expect(docker.dockerfileHandlesEnv).toBe(false);
    });

    it('should require hasDockerCompose boolean property', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: true,
        dockerfileHandlesEnv: true,
        hasDockerCompose: true,
        dockerComposeHandlesEnv: false,
        violations: [],
        suggestions: [],
      };
      expect(docker.hasDockerCompose).toBe(true);
    });

    it('should require dockerComposeHandlesEnv boolean property', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: true,
        dockerfileHandlesEnv: true,
        hasDockerCompose: true,
        dockerComposeHandlesEnv: true,
        violations: [],
        suggestions: [],
      };
      expect(docker.dockerComposeHandlesEnv).toBe(true);
    });

    it('should require violations array', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: false,
        dockerfileHandlesEnv: false,
        hasDockerCompose: false,
        dockerComposeHandlesEnv: false,
        violations: ['No Dockerfile found'],
        suggestions: [],
      };
      expect(docker.violations.length).toBe(1);
    });

    it('should require suggestions array', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: false,
        dockerfileHandlesEnv: false,
        hasDockerCompose: false,
        dockerComposeHandlesEnv: false,
        violations: [],
        suggestions: ['Create Dockerfile', 'Add docker-compose.yml'],
      };
      expect(docker.suggestions.length).toBe(2);
    });

    it('should allow fully configured Docker setup', () => {
      const docker: DockerAnalysis = {
        hasDockerfile: true,
        dockerfileHandlesEnv: true,
        hasDockerCompose: true,
        dockerComposeHandlesEnv: true,
        violations: [],
        suggestions: [],
      };
      expect(docker.hasDockerfile).toBe(true);
      expect(docker.dockerfileHandlesEnv).toBe(true);
      expect(docker.hasDockerCompose).toBe(true);
      expect(docker.dockerComposeHandlesEnv).toBe(true);
    });
  });
});
