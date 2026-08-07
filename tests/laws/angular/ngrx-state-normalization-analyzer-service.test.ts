/**
 * @fileoverview Tests for NgRxStateNormalizationAnalyzerService
 * @description Comprehensive tests for the NgRx state normalization analyzer service
 */
import { NgRxStateNormalizationAnalyzerService } from '../../../src/laws/angular/ngrx-state-normalization-mandate/services/normalization-analyzer.service';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxStateNormalizationAnalyzerService', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'ngrx-normalization-analyzer-test-'
    );
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('checkNormalizationPatterns()', () => {
    describe('result structure', () => {
      it('should return complete normalization pattern result', async () => {
        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result).toHaveProperty('followsPatterns');
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('issueCount');
      });

      it('should return boolean for followsPatterns', async () => {
        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(typeof result.followsPatterns).toBe('boolean');
      });

      it('should return array for violations', async () => {
        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should return number for issueCount', async () => {
        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(typeof result.issueCount).toBe('number');
      });
    });

    describe('state file detection', () => {
      it('should pass when state.ts exists', async () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          'export interface AppState {}'
        );

        const result =
          await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result.followsPatterns).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should pass when reducer.ts exists', async () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        FileUtils.writeFile(
          PathOperations.join(storeDir, 'counter.reducer.ts'),
          'export const reducer = createReducer();'
        );

        const result =
          await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result.followsPatterns).toBe(true);
      });

      it('should fail when no state files exist', async () => {
        const result =
          await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result.followsPatterns).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should fail when src/app/store directory is missing', async () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        const result =
          await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result.followsPatterns).toBe(false);
      });
    });

    describe('issueCount', () => {
      it('should match violations length', async () => {
        const result =
          await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result.issueCount).toBe(result.violations.length);
      });

      it('should be 0 when patterns are followed', async () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        FileUtils.writeFile(
          PathOperations.join(storeDir, 'app.state.ts'),
          'export interface AppState {}'
        );

        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            tempDir
          );

        expect(result.issueCount).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', async () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            nonExistentPath
          );

        expect(result.followsPatterns).toBe(false);
      });

      it('should handle empty string path', async () => {
        const result =
          await await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
            ''
          );

        expect(result).toBeDefined();
      });
    });
  });

  describe('checkNestedStateAntiPatterns()', () => {
    describe('result structure', () => {
      it('should return complete nested state result', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            tempDir
          );

        expect(result).toHaveProperty('hasNestedState');
        expect(result).toHaveProperty('examples');
        expect(result).toHaveProperty('severity');
      });

      it('should return boolean for hasNestedState', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            tempDir
          );

        expect(typeof result.hasNestedState).toBe('boolean');
      });

      it('should return array for examples', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            tempDir
          );

        expect(Array.isArray(result.examples)).toBe(true);
      });

      it('should return valid severity value', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            tempDir
          );

        expect(['low', 'medium', 'high', 'critical']).toContain(
          result.severity
        );
      });
    });

    describe('default behavior', () => {
      it('should return no nested state by default', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            tempDir
          );

        expect(result.hasNestedState).toBe(false);
        expect(result.examples).toHaveLength(0);
      });

      it('should return low severity when no examples', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            tempDir
          );

        expect(result.severity).toBe('low');
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', async () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
            nonExistentPath
          );

        expect(result).toBeDefined();
        expect(result.hasNestedState).toBe(false);
      });
    });
  });

  describe('checkStateShapeConsistency()', () => {
    describe('result structure', () => {
      it('should return complete state consistency result', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            tempDir
          );

        expect(result).toHaveProperty('isConsistent');
        expect(result).toHaveProperty('inconsistencies');
        expect(result).toHaveProperty('stateShapeCount');
      });

      it('should return boolean for isConsistent', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            tempDir
          );

        expect(typeof result.isConsistent).toBe('boolean');
      });

      it('should return array for inconsistencies', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            tempDir
          );

        expect(Array.isArray(result.inconsistencies)).toBe(true);
      });

      it('should return number for stateShapeCount', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            tempDir
          );

        expect(typeof result.stateShapeCount).toBe('number');
      });
    });

    describe('default behavior', () => {
      it('should return consistent by default', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            tempDir
          );

        expect(result.isConsistent).toBe(true);
        expect(result.inconsistencies).toHaveLength(0);
      });

      it('should return 0 state shape count by default', async () => {
        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            tempDir
          );

        expect(result.stateShapeCount).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', async () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
            nonExistentPath
          );

        expect(result).toBeDefined();
        expect(result.isConsistent).toBe(true);
      });
    });
  });

  describe('integration', () => {
    it('should correctly analyze a well-structured NgRx store', async () => {
      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      // Create state file
      const stateContent = `
import { EntityState } from '@ngrx/entity';

export interface UserState extends EntityState<User> {
  loading: boolean;
  error: string | null;
}
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.state.ts'),
        stateContent
      );

      // Create reducer file
      const reducerContent = `
import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter } from '@ngrx/entity';

export const adapter = createEntityAdapter<User>();
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'counter.reducer.ts'),
        reducerContent
      );

      const normalizationResult =
        await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
          tempDir
        );
      const nestedStateResult =
        NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
          tempDir
        );
      const consistencyResult =
        NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
          tempDir
        );

      expect(normalizationResult.followsPatterns).toBe(true);
      expect(nestedStateResult.hasNestedState).toBe(false);
      expect(consistencyResult.isConsistent).toBe(true);
    });
  });
});
