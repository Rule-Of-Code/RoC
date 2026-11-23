/**
 * #548 — Unit Test Quality said "setTimeout usage without fake timers may
 * cause test flakiness" for `await new Promise(r => setTimeout(r))`. That is
 * a yield of one macrotask, not a wait on wall-clock time, and the finding
 * was the same for `setTimeout(r, 0)` and `setTimeout(r, 1200)`: a reader
 * could not tell a yield from a sleep.
 *
 * A call with no delay or a literal `0` is a yield. A non-zero literal and a
 * delay the law cannot read (a name, an expression) still count.
 */
import { AsyncTestAnalyzerConfiguration } from '../../src/utils/testing/async-test-analyzer/async-test-analyzer-configuration';

const waits = (code: string): boolean =>
  AsyncTestAnalyzerConfiguration.waitsOnRealTimer(code);

describe('#548 a zero-delay setTimeout is a yield, not a real-timer wait', () => {
  it.each([
    ['await new Promise((resolve) => setTimeout(resolve));', 'no delay'],
    ['await new Promise((resolve) => setTimeout(resolve, 0));', 'literal 0'],
    [
      'await new Promise(r => setTimeout(() => r(undefined), 0));',
      'a callback with its own call, then 0',
    ],
    [
      'await new Promise((resolve) => setTimeout(resolve ,  0 ));',
      'spaces around 0',
    ],
  ])('does not count %s (%s)', code => {
    expect(waits(code)).toBe(false);
  });

  /** The red controls: a sleep is still a sleep. */
  it.each([
    [
      'await new Promise((resolve) => setTimeout(resolve, 1200));',
      'a non-zero literal',
    ],
    [
      'await new Promise((resolve) => setTimeout(resolve, DELAY_MS));',
      'a named delay',
    ],
    [
      'await new Promise((resolve) => setTimeout(resolve, base * 2));',
      'an expression',
    ],
    [
      'await new Promise((resolve) => setTimeout(resolve));\nawait new Promise((resolve) => setTimeout(resolve, 50));',
      'a yield next to a sleep',
    ],
  ])('still counts %s (%s)', code => {
    expect(waits(code)).toBe(true);
  });
});
