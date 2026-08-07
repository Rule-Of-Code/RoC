/**
 * Audit Engine Tests
 * Tests for RuleOfCodeAuditor class - synchronous tests only
 * Uses REAL ConfigLoader and ModularLawsRegistry - NO MOCKS
 */

import { PathOperations } from '../../src/utils/path-operations';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

// Real project root with real config
const REAL_PROJECT_ROOT = PathOperations.resolve(__dirname, '..', '..');

describe('RuleOfCodeAuditor', () => {
  let consoleSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with custom project root', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with suggest exceptions enabled', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT, true);
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with full mode', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'full'
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with pre-commit mode', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'pre-commit'
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with pre-push mode', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'pre-push'
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with custom options', () => {
      const options = {
        parallel: false,
        maxConcurrent: 5,
        timeout: 60000,
      };
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'fast',
        options
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with parallel disabled', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'fast',
        {
          parallel: false,
        }
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with custom timeout', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'fast',
        {
          timeout: 120000,
        }
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });

    it('should create instance with maxConcurrent setting', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT,
        false,
        'fast',
        {
          maxConcurrent: 8,
        }
      );
      expect(auditor).toBeInstanceOf(RuleOfCodeAuditor);
    });
  });

  describe('static create', () => {
    it('should be a function', () => {
      expect(typeof RuleOfCodeAuditor.create).toBe('function');
    });

    it('should return a promise', () => {
      const realConfig = ConfigFileUtils.getMinimalDefaultConfig();
      const result = RuleOfCodeAuditor.create({
        projectRoot: REAL_PROJECT_ROOT,
        config: realConfig,
      });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('instance methods', () => {
    it('should have audit method', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      expect(typeof auditor.audit).toBe('function');
    });

    it('should have exportResults method', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      expect(typeof auditor.exportResults).toBe('function');
    });
  });

  describe('chunkArray helper', () => {
    it('should chunk array correctly', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      const chunkArray = (
        auditor as unknown as {
          chunkArray: <T>(arr: T[], size: number) => T[][];
        }
      ).chunkArray;

      const result = chunkArray.call(auditor, [1, 2, 3, 4, 5], 2);

      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      const chunkArray = (
        auditor as unknown as {
          chunkArray: <T>(arr: T[], size: number) => T[][];
        }
      ).chunkArray;

      const result = chunkArray.call(auditor, [], 2);

      expect(result).toEqual([]);
    });

    it('should handle array smaller than chunk size', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      const chunkArray = (
        auditor as unknown as {
          chunkArray: <T>(arr: T[], size: number) => T[][];
        }
      ).chunkArray;

      const result = chunkArray.call(auditor, [1, 2], 5);

      expect(result).toEqual([[1, 2]]);
    });

    it('should handle single element array', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      const chunkArray = (
        auditor as unknown as {
          chunkArray: <T>(arr: T[], size: number) => T[][];
        }
      ).chunkArray;

      const result = chunkArray.call(auditor, [1], 3);

      expect(result).toEqual([[1]]);
    });

    it('should handle chunk size of 1', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      const chunkArray = (
        auditor as unknown as {
          chunkArray: <T>(arr: T[], size: number) => T[][];
        }
      ).chunkArray;

      const result = chunkArray.call(auditor, [1, 2, 3], 1);

      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should handle exact division', () => {
      const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
      const chunkArray = (
        auditor as unknown as {
          chunkArray: <T>(arr: T[], size: number) => T[][];
        }
      ).chunkArray;

      const result = chunkArray.call(auditor, [1, 2, 3, 4], 2);

      expect(result).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  describe('severity resolution and attachment', () => {
    type Resolver = {
      resolveLawSeverity: (law: {
        name?: string;
        id?: string;
        severity?: 'error' | 'info' | 'warning';
      }) => 'error' | 'info' | 'warning';
      config: { laws: Record<string, unknown> };
      executeSingleLaw: (law: unknown) => Promise<{ severity?: string; passed?: boolean }>;
      isWarningResult: (r: { passed?: boolean; severity?: string }) => boolean;
      options: { failOnWarnings?: boolean };
    };

    it('uses the registry severity when no config override exists', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      expect(
        auditor.resolveLawSeverity({ name: 'Some Law', severity: 'warning' })
      ).toBe('warning');
    });

    it('defaults to error when the law carries no severity (safe default)', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      expect(auditor.resolveLawSeverity({ name: 'Some Law' })).toBe('error');
    });

    it('honours a config override keyed by exact law name', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      auditor.config.laws.severity = { 'Module Size': 'error' };
      expect(
        auditor.resolveLawSeverity({ name: 'Module Size', severity: 'warning' })
      ).toBe('error');
    });

    it('honours a config override keyed by law id', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      auditor.config.laws.severity = { abc12345: 'info' };
      expect(
        auditor.resolveLawSeverity({
          id: 'abc12345',
          name: 'Some Law',
          severity: 'error',
        })
      ).toBe('info');
    });

    it('attaches the resolved severity to the law result', async () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      const result = await auditor.executeSingleLaw({
        id: 'x1',
        name: 'Warn Law',
        severity: 'warning',
        check: async () => ({ passed: false, violations: ['v'], score: 0 }),
      });
      expect(result.severity).toBe('warning');
    });

    it('attaches severity on the crashed-check path too', async () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      const result = await auditor.executeSingleLaw({
        id: 'x2',
        name: 'Warn Law',
        severity: 'warning',
        check: async () => {
          throw new Error('boom');
        },
      });
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('attaches severity on the no-check fallback path', async () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      const result = await auditor.executeSingleLaw({
        id: 'x3',
        name: 'Info Law',
        severity: 'info',
      });
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('isWarningResult honours failOnWarnings from options', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      expect(
        auditor.isWarningResult({ passed: false, severity: 'warning' })
      ).toBe(true);
      auditor.options.failOnWarnings = true;
      expect(
        auditor.isWarningResult({ passed: false, severity: 'warning' })
      ).toBe(false);
    });

    it('matches a severity override keyed by the printed slug', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Resolver;
      auditor.config.laws.severity = { 'module-size': 'error' };
      expect(
        auditor.resolveLawSeverity({ name: 'Module Size', severity: 'warning' })
      ).toBe('error');
    });

    it('matches a severity override keyed by legacyId', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as (Resolver & {
        resolveLawSeverity: (law: {
          name?: string;
          legacyId?: number;
          severity?: string;
        }) => string;
      });
      auditor.config.laws.severity = { '225': 'error' };
      expect(
        auditor.resolveLawSeverity({
          name: 'Module Size',
          legacyId: 225,
          severity: 'warning',
        })
      ).toBe('error');
    });
  });

  describe('failOnWarnings config wiring', () => {
    const baseConfig = () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      return config as unknown as Record<string, unknown> & {
        laws: Record<string, unknown>;
      };
    };
    type WithOptions = { options: { failOnWarnings?: boolean } };

    it('reads laws.failOnWarnings from an injected config', () => {
      const config = baseConfig();
      config.laws.failOnWarnings = true;
      const auditor = new RuleOfCodeAuditor(
        config,
        REAL_PROJECT_ROOT
      ) as unknown as WithOptions;
      expect(auditor.options.failOnWarnings).toBe(true);
    });

    it('reads top-level failOnWarnings from an injected config', () => {
      const config = baseConfig();
      config.failOnWarnings = true;
      const auditor = new RuleOfCodeAuditor(
        config,
        REAL_PROJECT_ROOT
      ) as unknown as WithOptions;
      expect(auditor.options.failOnWarnings).toBe(true);
    });

    it('defaults failOnWarnings to false', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as WithOptions;
      expect(auditor.options.failOnWarnings).toBe(false);
    });

    it('CLI option overrides the config value', async () => {
      const config = baseConfig();
      config.laws.failOnWarnings = true;
      const auditor = (await RuleOfCodeAuditor.create({
        projectRoot: REAL_PROJECT_ROOT,
        config: config as never,
        failOnWarnings: false,
      })) as unknown as WithOptions;
      expect(auditor.options.failOnWarnings).toBe(false);
    });

    it('uses the injected config instead of reloading from disk', () => {
      const config = baseConfig();
      config.laws.failOnWarnings = true;
      const auditor = new RuleOfCodeAuditor(
        config,
        REAL_PROJECT_ROOT
      ) as unknown as { config: unknown };
      expect(auditor.config).toBe(config);
    });
  });

  describe('displayName', () => {
    it('prefers the canonical registry title over the checker-local name', () => {
      expect(
        RuleOfCodeAuditor.displayName({
          lawTitle: 'Branch Governance Standards',
          lawName: 'branch-governance',
        })
      ).toBe('Branch Governance Standards');
    });

    it('falls back to lawName, then Unknown Law', () => {
      expect(RuleOfCodeAuditor.displayName({ lawName: 'module-size' })).toBe(
        'module-size'
      );
      expect(RuleOfCodeAuditor.displayName({})).toBe('Unknown Law');
    });
  });

  describe('fail-closed audit refusal', () => {
    it('refuses to report compliance when the law selection is empty', async () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      (config as { laws: Record<string, unknown> }).laws = {
        paretoMode: false,
        severity: {},
        enabled: {}, // unmatchable allowlist → empty selection
      };
      const auditor = new RuleOfCodeAuditor(config, REAL_PROJECT_ROOT);
      const result = await auditor.audit();

      expect(result.passed).toBe(false);
      expect(result.totalLaws).toBe(0);
    });
  });

  describe('validateSeverityOverrides', () => {
    type Validator = {
      config: { laws: Record<string, unknown> };
      validateSeverityOverrides: () => void;
    };

    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('warns for a severity key that matches no law', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Validator;
      auditor.config.laws.severity = { 'no-such-law-xyz': 'error' };
      auditor.validateSeverityOverrides();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("unknown law 'no-such-law-xyz'")
      );
    });

    it('accepts stack-applicable names, slugs and legacy law-N keys silently', () => {
      // Pick a universal (stack-less) law so it applies to any project type.
      const { ModularLawsRegistry } = jest.requireActual(
        '../../src/registry/modular-laws-registry'
      );
      const universal = ModularLawsRegistry.getAll().find(
        (l: { stack?: string }) => !l.stack
      );
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Validator;
      auditor.config.laws.severity = {
        [universal.name]: 'error',
        [universal.name.toLowerCase().replace(/\s+/g, '-')]: 'error',
        'law-12': 'warning',
      };
      auditor.validateSeverityOverrides();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('reports a stack-gated key as informational, not as unknown', () => {
      const auditor = new RuleOfCodeAuditor(
        {},
        REAL_PROJECT_ROOT
      ) as unknown as Validator;
      // Module Size is python-gated; this repo detects as a TS/Angular project.
      auditor.config.laws.severity = { 'Module Size': 'error' };
      auditor.validateSeverityOverrides();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('does not apply to this project type')
      );
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('unknown law')
      );
    });
  });
});
