/**
 * Environment Files Analyzer Tests
 * Tests for DeploymentEnvironmentAnalyzer class
 */
import { DEFAULT_CONFIG } from '../../src/config/types';
import { DeploymentEnvironmentAnalyzer } from '../../src/utils/deployment/environment-files-analyzer/environment-files-analyzer';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('DeploymentEnvironmentAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('env-files-analyzer-test-');
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // getEnvironmentFiles Tests
  // ============================================
  describe('getEnvironmentFiles()', () => {
    it('should return empty array when no env files exist', () => {
      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result).toEqual([]);
    });

    it('should detect .env file', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      FileUtils.writeFile(envPath, 'API_KEY=test');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(f => f.endsWith('.env'))).toBe(true);
    });

    it('should detect .env.local file', () => {
      const envPath = PathOperations.join(tempDir, '.env.local');
      FileUtils.writeFile(envPath, 'API_KEY=test');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.endsWith('.env.local'))).toBe(true);
    });

    it('should detect .env.development file', () => {
      const envPath = PathOperations.join(tempDir, '.env.development');
      FileUtils.writeFile(envPath, 'API_KEY=dev');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.endsWith('.env.development'))).toBe(true);
    });

    it('should detect .env.staging file', () => {
      const envPath = PathOperations.join(tempDir, '.env.staging');
      FileUtils.writeFile(envPath, 'API_KEY=staging');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.endsWith('.env.staging'))).toBe(true);
    });

    it('should detect .env.production file', () => {
      const envPath = PathOperations.join(tempDir, '.env.production');
      FileUtils.writeFile(envPath, 'API_KEY=prod');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.endsWith('.env.production'))).toBe(true);
    });

    it('should detect .env.test file', () => {
      const envPath = PathOperations.join(tempDir, '.env.test');
      FileUtils.writeFile(envPath, 'API_KEY=test');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.endsWith('.env.test'))).toBe(true);
    });

    it('should detect config JSON files', () => {
      const configDir = PathOperations.join(tempDir, 'config');
      FileUtils.createDirectory(configDir);
      const devConfigPath = PathOperations.join(configDir, 'development.json');
      FileUtils.writeFile(devConfigPath, JSON.stringify({ key: 'value' }));

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.includes('development.json'))).toBe(true);
    });

    it('should detect environment TypeScript files', () => {
      const envDir = PathOperations.join(tempDir, 'environments');
      FileUtils.createDirectory(envDir);
      const envTsPath = PathOperations.join(envDir, 'environment.ts');
      FileUtils.writeFile(envTsPath, 'export const environment = {};');

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.some(f => f.includes('environment.ts'))).toBe(true);
    });

    it('should detect multiple environment files', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=1');
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.env.development'),
        'KEY=2'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.env.production'),
        'KEY=3'
      );

      const result = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
        tempDir,
        DEFAULT_CONFIG
      );

      expect(result.length).toBe(3);
    });
  });

  // ============================================
  // checkEnvironmentConsistency Tests
  // ============================================
  describe('checkEnvironmentConsistency()', () => {
    it('should return violation when insufficient files', () => {
      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency(
        []
      );

      expect(result.violations.join(' ')).toContain('No environment contract declared');
    });

    it('should return violation when only one file', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      FileUtils.writeFile(envPath, 'API_KEY=test');

      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency([
        envPath,
      ]);

      expect(result.violations.join(' ')).toContain('No environment contract declared');
    });

    it('should suggest creating separate environment files', () => {
      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency(
        []
      );

      // We ask for the CONTRACT (.env.example), never for the values: a law that
      // demands .env.production demands you commit your secrets (a backend consumer).
      expect(result.suggestions.join(' ')).toContain('.env.example');
      expect(result.suggestions.join(' ')).toMatch(/do NOT commit \.env\.production/i);
    });

    it('should check consistency between two env files', () => {
      // Note: Using JSON files because .env.development and .env.production
      // have the same basename (.env) due to getBasename returning name without extension
      const configDir = PathOperations.join(tempDir, 'config');
      FileUtils.createDirectory(configDir);

      const devPath = PathOperations.join(configDir, 'development.json');
      const prodPath = PathOperations.join(configDir, 'production.json');

      FileUtils.writeFile(
        devPath,
        JSON.stringify({ apiKey: 'dev', debug: true })
      );
      FileUtils.writeFile(prodPath, JSON.stringify({ apiKey: 'prod' }));

      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency([
        devPath,
        prodPath,
      ]);

      // Should detect debug is missing in prod
      expect(result.violations.some(v => v.includes('missing keys'))).toBe(
        true
      );
    });

    it('should handle nested JSON objects in configuration files', () => {
      const configDir = PathOperations.join(tempDir, 'config');
      FileUtils.createDirectory(configDir);

      const devPath = PathOperations.join(configDir, 'dev-nested.json');
      const prodPath = PathOperations.join(configDir, 'prod-nested.json');

      // Create JSON files with nested objects
      FileUtils.writeFile(
        devPath,
        JSON.stringify({
          api: { url: 'dev.api.com', timeout: 5000 },
          database: { host: 'localhost', port: 5432 },
        })
      );
      FileUtils.writeFile(
        prodPath,
        JSON.stringify({
          api: { url: 'prod.api.com', timeout: 5000 },
          database: { host: 'localhost', port: 5432 },
        })
      );

      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency([
        devPath,
        prodPath,
      ]);

      // No violations - both files have same nested structure
      expect(result.violations).toEqual([]);
    });

    it('should detect extra keys in secondary files', () => {
      // Note: Using JSON files because .env files have same basename issue
      const configDir = PathOperations.join(tempDir, 'config');
      FileUtils.createDirectory(configDir);

      const devPath = PathOperations.join(configDir, 'development.json');
      const prodPath = PathOperations.join(configDir, 'production.json');

      FileUtils.writeFile(devPath, JSON.stringify({ apiKey: 'dev' }));
      FileUtils.writeFile(
        prodPath,
        JSON.stringify({ apiKey: 'prod', extraKey: 'value' })
      );

      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency([
        devPath,
        prodPath,
      ]);

      expect(result.suggestions.some(s => s.includes('extra keys'))).toBe(true);
    });

    it('should handle matching environment files', () => {
      const devPath = PathOperations.join(tempDir, '.env.development');
      const prodPath = PathOperations.join(tempDir, '.env.production');

      FileUtils.writeFile(devPath, 'API_KEY=dev\nAPI_URL=http://dev.api');
      FileUtils.writeFile(prodPath, 'API_KEY=prod\nAPI_URL=http://prod.api');

      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency([
        devPath,
        prodPath,
      ]);

      // No missing or extra keys
      expect(
        result.violations.filter(v => v.includes('missing keys')).length
      ).toBe(0);
    });

    it('should check consistency across JSON config files', () => {
      const configDir = PathOperations.join(tempDir, 'config');
      FileUtils.createDirectory(configDir);

      const devConfig = PathOperations.join(configDir, 'development.json');
      const prodConfig = PathOperations.join(configDir, 'production.json');

      FileUtils.writeFile(
        devConfig,
        JSON.stringify({ apiUrl: 'dev', debug: true })
      );
      FileUtils.writeFile(prodConfig, JSON.stringify({ apiUrl: 'prod' }));

      const result = DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency([
        devConfig,
        prodConfig,
      ]);

      expect(result.violations.some(v => v.includes('missing keys'))).toBe(
        true
      );
    });
  });

  // ============================================
  // analyzeEnvFiles Tests
  // ============================================
  describe('analyzeEnvFiles()', () => {
    it('should report violation when no .env.example exists', () => {
      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.hasEnvExample).toBe(false);
      expect(result.violations).toContain('.env.example file not found');
    });

    it('should detect existing .env.example file', () => {
      const examplePath = PathOperations.join(tempDir, '.env.example');
      FileUtils.writeFile(examplePath, 'API_KEY=your_api_key');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.hasEnvExample).toBe(true);
      expect(result.violations.includes('.env.example file not found')).toBe(
        false
      );
    });

    it('should suggest creating .env.example when missing', () => {
      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.suggestions).toContain(
        'Create .env.example file with all required environment variables'
      );
    });

    it('should check if .env is in gitignore', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      const gitignorePath = PathOperations.join(tempDir, '.gitignore');

      FileUtils.writeFile(envPath, 'SECRET=value');
      FileUtils.writeFile(gitignorePath, '.env\nnode_modules');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.hasEnvInGit).toBe(false);
    });

    it('should detect .env not in gitignore', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      const gitignorePath = PathOperations.join(tempDir, '.gitignore');

      FileUtils.writeFile(envPath, 'SECRET=value');
      FileUtils.writeFile(gitignorePath, 'node_modules');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.hasEnvInGit).toBe(true);
      expect(result.violations).toContain('.env file may be tracked in git');
    });

    it('should suggest adding .env to gitignore', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      const gitignorePath = PathOperations.join(tempDir, '.gitignore');

      FileUtils.writeFile(envPath, 'SECRET=value');
      FileUtils.writeFile(gitignorePath, 'node_modules');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.suggestions).toContain(
        'Add .env to .gitignore to prevent committing secrets'
      );
    });

    it('should handle *.env pattern in gitignore', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      const gitignorePath = PathOperations.join(tempDir, '.gitignore');

      FileUtils.writeFile(envPath, 'SECRET=value');
      FileUtils.writeFile(gitignorePath, '*.env\nnode_modules');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result.hasEnvInGit).toBe(false);
    });

    it('should return complete analysis result', () => {
      const examplePath = PathOperations.join(tempDir, '.env.example');
      const gitignorePath = PathOperations.join(tempDir, '.gitignore');

      FileUtils.writeFile(examplePath, 'API_KEY=');
      FileUtils.writeFile(gitignorePath, '.env');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      expect(result).toHaveProperty('hasEnvExample');
      expect(result).toHaveProperty('hasEnvInGit');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });

    it('should handle missing gitignore file', () => {
      const envPath = PathOperations.join(tempDir, '.env');
      FileUtils.writeFile(envPath, 'SECRET=value');

      const result = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(tempDir);

      // Should assume env might be in git when no gitignore
      expect(result.hasEnvInGit).toBe(true);
    });
  });
});
