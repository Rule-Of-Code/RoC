/**
 * @fileoverview Tests for NgRxStateNormalizationMandateLaw
 * @description Comprehensive tests for the main NgRx State Normalization Mandate Law
 */
import { NgRxStateNormalizationMandateLaw } from '../../../src/laws/angular/ngrx-state-normalization-mandate';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxStateNormalizationMandateLaw', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-state-norm-law-test-');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const createContext = (projectRoot: string): LawCheckContext => ({
    projectRoot,
    config: FileUtils.getMinimalDefaultConfig(),
  });

  describe('check()', () => {
    describe('entity usage check', () => {
      it('should fail when @ngrx/entity is not installed', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@angular/core': '^17.0.0',
            '@ngrx/store': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.violations).toContain(
          '@ngrx/entity adapters are not being used'
        );
        expect(result.suggestions).toContain('Use @ngrx/entity EntityAdapter');
      });

      it('should pass when @ngrx/entity is installed', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
            '@ngrx/store': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            '@ngrx/entity adapters are not being used'
          )
        ).toBe(false);
      });

      it('should detect @ngrx/entity in devDependencies', async () => {
        const packageJson = {
          name: 'test-project',
          devDependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            '@ngrx/entity adapters are not being used'
          )
        ).toBe(false);
      });
    });

    describe('normalization patterns check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );
      });

      it('should fail when no state files exist', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.violations).toContain(
          'Normalization patterns are not implemented'
        );
        expect(result.suggestions).toContain(
          'Implement flat, normalized state'
        );
      });

      it('should pass when state.ts exists', async () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        const stateFile = `
export interface AppState {
  ids: string[];
  entities: { [id: string]: Entity };
}
`;
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          stateFile
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'Normalization patterns are not implemented'
          )
        ).toBe(false);
      });

      it('should pass when reducer.ts exists', async () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        const reducerFile = `
import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';

export const adapter = createEntityAdapter<User>();
export const initialState: EntityState<User> = adapter.getInitialState();
`;
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'counter.reducer.ts'),
          reducerFile
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'Normalization patterns are not implemented'
          )
        ).toBe(false);
      });
    });

    describe('nested state check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          'export interface AppState {}'
        );
      });

      it('should pass when no nested state detected', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes('Nested state detected')
        ).toBe(false);
      });
    });

    describe('state consistency check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          'export interface AppState {}'
        );
      });

      it('should pass when state shapes are consistent', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes('Inconsistent state shapes')
        ).toBe(false);
      });
    });

    describe('selector composition check', () => {
      beforeEach(() => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          'export interface AppState {}'
        );
      });

      it('should pass when selectors follow best practices', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            'Selectors do not follow best practices'
          )
        ).toBe(false);
      });

      it('should handle missing src directory gracefully', async () => {
        // Remove src directory
        FileUtils.deleteDirectory(PathOperations.join(tempDir, 'src'));

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('score calculation', () => {
      it('should deduct 30 points when no entity adapter', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {},
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.score).toBeLessThanOrEqual(70);
      });

      it('should return 100 when fully compliant', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        const stateFile = `
import { EntityState } from '@ngrx/entity';

export interface AppState extends EntityState<User> {
  loading: boolean;
}
`;
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          stateFile
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.score).toBe(100);
        expect(result.passed).toBe(true);
      });

      it('should never return negative score', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
      });

      it('should accumulate deductions for multiple violations', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        // Should have deductions for entity adapter and normalization patterns
        expect(result.score).toBeLessThanOrEqual(50);
      });
    });

    describe('result structure', () => {
      it('should return complete LawResult structure', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('fixable');
        expect(result).toHaveProperty('config');
      });

      it('should always be fixable', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.fixable).toBe(true);
      });

      it('should include violations and suggestions in details', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.details).toEqual(
          expect.arrayContaining([
            ...(result.violations ?? []),
            ...(result.suggestions ?? []),
          ])
        );
      });

      it('should include config in result', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.config).toEqual(context.config);
      });
    });

    describe('message generation', () => {
      it('should generate success message when compliant', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          'export interface AppState {}'
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.message).toBe('State normalization OK');
      });

      it('should list issues when violations exist', async () => {
        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result.message).toContain('Issues found');
      });
    });

    describe('projectRoot handling', () => {
      it('should use context.projectRoot when provided', async () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const context = createContext(tempDir);
        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(
          (result.violations ?? []).includes(
            '@ngrx/entity adapters are not being used'
          )
        ).toBe(false);
      });

      it('should handle empty projectRoot gracefully', async () => {
        const context: LawCheckContext = {
          projectRoot: '',
          config: FileUtils.getMinimalDefaultConfig(),
        };

        const result = await NgRxStateNormalizationMandateLaw.check(context);

        expect(result).toBeDefined();
        expect(result.passed).toBe(false);
      });
    });

    describe('named export', () => {
      it('should be exported as NgRxStateNormalizationMandateLaw', async () => {
        const module =
          await import('../../../src/laws/angular/ngrx-state-normalization-mandate');

        expect(module.NgRxStateNormalizationMandateLaw).toBeDefined();
        expect(typeof module.NgRxStateNormalizationMandateLaw.check).toBe(
          'function'
        );
      });
    });
  });
});
