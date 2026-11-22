/**
 * Types Index - Tests
 * Tests for types index exports
 */
import * as TypesIndex from '../../src/types/index';

describe('Types Index', () => {
  it('should export from types module', () => {
    expect(TypesIndex).toBeDefined();
  });

  it('should export deployment types', () => {
    expect(typeof TypesIndex).toBe('object');
  });
});
