/**
 * #552 — Test Data Management and Test Isolation Enforcement both called a
 * module-level `let` shared mutable state even when `beforeEach` gives it a
 * fresh value before every test: that is the isolation pattern both laws ask
 * for. Isolation's `(?!.*beforeEach)` look-ahead saw only a `beforeEach` on
 * the same line, and the two patterns disagreed on a typed `let`.
 *
 * A module-level binding (re)assigned in a `beforeEach` of the same file is
 * not shared state, for both laws, with or without a type annotation. A
 * binding that nothing resets is still shared state, for both laws.
 */
import { UnitTestDataManagementConstants } from '../../src/laws/testing/unit-test-data-management/constants/data-management';
import { UnitTestIsolationConstants } from '../../src/laws/testing/unit-test-isolation/constants/isolation';

const dataManagement = (source: string): boolean =>
  UnitTestDataManagementConstants.hasSharedMutableState(
    source,
    'counter.spec.ts'
  );
const isolation = (source: string): boolean =>
  UnitTestIsolationConstants.hasSharedMutableState(source);

const spec = (declaration: string, setup: string[]): string =>
  [
    "import { makeCounter } from './counter';",
    declaration,
    ...setup,
    "describe('counter', () => {",
    "  it('starts at zero', () => {",
    '    expect(counter.n).toBe(0);',
    '  });',
    '});',
  ].join('\n');

const RESET = ['beforeEach(() => {', '  counter = makeCounter();', '});'];
const COUNT_UP = ['beforeEach(() => {', '  counter.n += 1;', '});'];

describe('#552 a module-level let reset in beforeEach is not shared state', () => {
  describe.each([
    ['let counter = makeCounter();'],
    ['let counter: Counter = makeCounter();'],
    ['let counter: Counter;'],
  ])('%s, reassigned in beforeEach', declaration => {
    const source = spec(declaration, RESET);

    it('is not shared state for Test Data Management', () => {
      expect(dataManagement(source)).toBe(false);
    });

    it('is not shared state for Test Isolation Enforcement', () => {
      expect(isolation(source)).toBe(false);
    });
  });

  /** The red controls: nothing resets these, so tests see each other's writes. */
  describe.each([
    ['let counter = makeCounter();'],
    ['let counter: Counter = makeCounter();'],
  ])('%s, only mutated in beforeEach', declaration => {
    const source = spec(declaration, COUNT_UP);

    it('is shared state for Test Data Management', () => {
      expect(dataManagement(source)).toBe(true);
    });

    it('is shared state for Test Isolation Enforcement', () => {
      expect(isolation(source)).toBe(true);
    });
  });

  it('the two laws give the same answer for every declaration form', () => {
    const forms = [
      spec('let counter = makeCounter();', RESET),
      spec('let counter: Counter = makeCounter();', RESET),
      spec('let counter = makeCounter();', COUNT_UP),
      spec('let counter: Counter = makeCounter();', COUNT_UP),
      spec('let counter: Counter;', RESET),
    ];
    expect(forms.map(dataManagement)).toEqual(forms.map(isolation));
  });
});
