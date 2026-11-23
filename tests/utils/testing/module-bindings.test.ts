import { ModuleBindings } from '../../../src/utils/testing/module-bindings';

/** #552 — which module-scope bindings a test file's tests share. */
describe('ModuleBindings.shared', () => {
  const lines = (...parts: string[]): string => parts.join('\n');

  it('names a column-0 let or var with an initialiser that nothing resets', () => {
    expect(
      ModuleBindings.shared(
        lines('let calls = 0;', 'var cache = new Map();', "it('a', () => {});")
      )
    ).toEqual(['calls', 'cache']);
  });

  it('does not name a binding reassigned in beforeEach or afterEach', () => {
    expect(
      ModuleBindings.shared(
        lines(
          'let calls = 0;',
          'let $state: State = make();',
          'beforeEach(() => { calls = 0; });',
          'afterEach(() => {',
          '  $state = make();',
          '});'
        )
      )
    ).toEqual([]);
  });

  it('does not take a comparison, a property write or a compound write for a reset', () => {
    expect(
      ModuleBindings.shared(
        lines(
          'let calls = 0;',
          'let total = 0;',
          'let box = make();',
          'beforeEach(() => {',
          '  expect(calls == 0).toBe(true);',
          '  total += 1;',
          '  box.value = 1;',
          '});'
        )
      )
    ).toEqual(['calls', 'total', 'box']);
  });

  it('does not take a reset in beforeAll, which runs once', () => {
    expect(
      ModuleBindings.shared(
        lines('let calls = 0;', 'beforeAll(() => { calls = 0; });')
      )
    ).toEqual(['calls']);
  });

  it('does not read an indented or uninitialised declaration', () => {
    expect(
      ModuleBindings.shared(
        lines(
          'let logger: Logger;',
          "describe('x', () => {",
          '  let local = 1;',
          '});'
        )
      )
    ).toEqual([]);
  });

  it('keeps its exported patterns stateless', () => {
    expect(ModuleBindings.MODULE_LET.global).toBe(false);
    expect(ModuleBindings.MODULE_VAR.global).toBe(false);
  });
});
