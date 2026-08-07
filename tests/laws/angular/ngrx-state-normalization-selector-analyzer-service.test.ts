/**
 * @fileoverview Tests for NgRxStateNormalizationSelectorAnalyzerService
 * @description Comprehensive tests for the NgRx selector composition analyzer service
 */
import { NgRxStateNormalizationSelectorAnalyzerService } from '../../../src/laws/angular/ngrx-state-normalization-mandate/services/selector-analyzer.service';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxStateNormalizationSelectorAnalyzerService', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-selector-analyzer-test-');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('checkSelectorComposition()', () => {
    describe('result structure', () => {
      it('should return complete selector composition result', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result).toHaveProperty('followsBestPractices');
        expect(result).toHaveProperty('issues');
        expect(result).toHaveProperty('issueCount');
      });

      it('should return boolean for followsBestPractices', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(typeof result.followsBestPractices).toBe('boolean');
      });

      it('should return array for issues', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(Array.isArray(result.issues)).toBe(true);
      });

      it('should return number for issueCount', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(typeof result.issueCount).toBe('number');
      });
    });

    describe('when src directory does not exist', () => {
      it('should return best practices followed', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result.followsBestPractices).toBe(true);
        expect(result.issues).toHaveLength(0);
        expect(result.issueCount).toBe(0);
      });
    });

    describe('when src directory exists', () => {
      beforeEach(() => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
      });

      it('should return best practices followed for empty src', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result.followsBestPractices).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should handle src directory with files', () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        const selectorsContent = `
import { createSelector } from '@ngrx/store';

export const selectAll = createSelector(
  selectState,
  (state) => state.entities
);
`;
        FileUtils.writeFile(
          PathOperations.join(storeDir, 'selectors.ts'),
          selectorsContent
        );

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result).toBeDefined();
      });
    });

    describe('issueCount consistency', () => {
      it('should have issueCount equal to issues length', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result.issueCount).toBe(result.issues.length);
      });

      it('should be 0 when best practices followed', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result.issueCount).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            nonExistentPath
          );

        expect(result).toBeDefined();
        expect(result.followsBestPractices).toBe(true);
      });

      it('should handle empty string path', () => {
        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            ''
          );

        expect(result).toBeDefined();
      });

      it('should handle path with special characters', () => {
        const specialPath = PathOperations.join(tempDir, 'path with spaces');
        FileUtils.createDirectory(specialPath);

        const srcDir = PathOperations.join(specialPath, 'src');
        FileUtils.createDirectory(srcDir);

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            specialPath
          );

        expect(result).toBeDefined();
      });
    });

    describe('well-structured selectors', () => {
      beforeEach(() => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);
      });

      it('should pass for well-composed selectors', () => {
        const selectorsContent = `
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { adapter } from './reducer';

const selectUserState = createFeatureSelector<UserState>('users');

const { selectAll, selectEntities, selectIds } = adapter.getSelectors(selectUserState);

export const selectAllUsers = selectAll;
export const selectUserEntities = selectEntities;
export const selectUserIds = selectIds;

export const selectActiveUsers = createSelector(
  selectAllUsers,
  (users) => users.filter(user => user.active)
);
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'store', 'selectors.ts'),
          selectorsContent
        );

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result.followsBestPractices).toBe(true);
      });

      it('should pass for selectors using entity adapter methods', () => {
        const selectorsContent = `
import { createSelector } from '@ngrx/store';
import { adapter } from './reducer';

export const {
  selectAll: selectAllProducts,
  selectEntities: selectProductEntities,
  selectIds: selectProductIds,
  selectTotal: selectProductTotal
} = adapter.getSelectors(selectProductState);
`;
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', 'store', 'selectors.ts'),
          selectorsContent
        );

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result.followsBestPractices).toBe(true);
      });
    });

    describe('integration with file system', () => {
      it('should handle deep directory structures', () => {
        const deepPath = PathOperations.join(
          tempDir,
          'src',
          'app',
          'features',
          'users',
          'store'
        );
        FileUtils.createDirectory(deepPath);

        FileUtils.writeFile(
          PathOperations.join(deepPath, 'user.selectors.ts'),
          'export const selectUser = createSelector(...);'
        );

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result).toBeDefined();
      });

      it('should handle multiple selector files', () => {
        const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
        FileUtils.createDirectory(storeDir);

        FileUtils.writeFile(
          PathOperations.join(storeDir, 'user.selectors.ts'),
          'export const selectUsers = createSelector(...);'
        );

        FileUtils.writeFile(
          PathOperations.join(storeDir, 'product.selectors.ts'),
          'export const selectProducts = createSelector(...);'
        );

        FileUtils.writeFile(
          PathOperations.join(storeDir, 'order.selectors.ts'),
          'export const selectOrders = createSelector(...);'
        );

        const result =
          NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
            tempDir
          );

        expect(result).toBeDefined();
      });
    });
  });
});
