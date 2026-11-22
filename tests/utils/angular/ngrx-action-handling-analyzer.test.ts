/**
 * @fileoverview Tests for ngrx-action-handling-analyzer.ts
 * @description NgRx Action Handling Analyzer, on real projects: the reducer
 * files under src/ are found, read and judged by the real validation
 * patterns. No helper of the code under test is replaced.
 */

import { NgRxActionHandlingAnalyzer } from '../../../src/utils/angular/ngrx-action-handling/ngrx-action-handling-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { project, removeProjects } from '../../checkers/toolkit-fixture';

afterAll(removeProjects);

const config = FileUtils.getMinimalDefaultConfig();

/** A reducer that handles one action with `on(...)`. */
const HANDLING_REDUCER = [
  "import { createReducer, on } from '@ngrx/store';",
  'export const counterReducer = createReducer(',
  '  initialState,',
  '  on(increment, state => ({ ...state, count: state.count + 1 }))',
  ');',
  '',
].join('\n');

/** A reducer that handles no action at all. */
const EMPTY_REDUCER = [
  "import { createReducer } from '@ngrx/store';",
  'export const emptyReducer = createReducer(initialState);',
  '',
].join('\n');

const check = (files: Record<string, string>) =>
  NgRxActionHandlingAnalyzer.checkActionHandling(project(files), config);

describe('utils/angular/ngrx-action-handling/ngrx-action-handling-analyzer', () => {
  describe('NgRxActionHandlingAnalyzer.checkActionHandling', () => {
    it('reports nothing for a project without a src directory', () => {
      const result = check({ 'package.json': '{}' });

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('reports nothing for a src directory with no reducer file', () => {
      const result = check({ 'src/app/app.component.ts': 'export class A {}' });

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('reports a reducer that handles no action, by file name', () => {
      const result = check({ 'src/state/empty.reducer.ts': EMPTY_REDUCER });

      const finding = result.violations.find(v =>
        v.includes('action handlers')
      );
      expect(finding).toBeDefined();
      expect(finding).toContain('empty.reducer');
    });

    it('does not report a reducer that handles its action', () => {
      const result = check({
        'src/state/counter.reducer.ts': HANDLING_REDUCER,
      });

      expect(
        result.violations.filter(v => v.includes('action handlers'))
      ).toEqual([]);
    });

    it('judges every reducer file, and names only the one at fault', () => {
      const result = check({
        'src/state/counter.reducer.ts': HANDLING_REDUCER,
        'src/state/empty.reducer.ts': EMPTY_REDUCER,
      });

      const handlers = result.violations.filter(v =>
        v.includes('action handlers')
      );
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toContain('empty.reducer');
      expect(handlers[0]).not.toContain('counter.reducer');
    });

    it('reports nothing for an empty reducer file', () => {
      const result = check({ 'src/state/blank.reducer.ts': '' });

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });
  });
});
