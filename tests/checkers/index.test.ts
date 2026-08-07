/**
 * Checkers Index Tests
 * Tests for checkers/index.ts exports
 */

import * as CheckersIndex from '../../src/checkers/index';

describe('checkers/index', () => {
  it('should export AngularChecker', () => {
    expect(CheckersIndex.AngularChecker).toBeDefined();
  });

  it('should export BaseChecker', () => {
    expect(CheckersIndex.BaseChecker).toBeDefined();
  });

  it('should export CodeQualityChecker', () => {
    expect(CheckersIndex.CodeQualityChecker).toBeDefined();
  });

  it('should export TypeScriptChecker', () => {
    expect(CheckersIndex.TypeScriptChecker).toBeDefined();
  });
});
