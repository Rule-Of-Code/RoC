/**
 * #487 (rest) — every `/g` regex in src that reaches `.test()` now goes
 * through PatternMatchingUtils.hasRegexPattern / hasAnyRegexPattern, which
 * start each search at 0. Before, the same text asked twice could answer
 * true, then false: the analyzers' pattern tables are module constants.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { EnvironmentVariablesLaw } from '../../src/checkers/security-laws/environment-variables';
import { NgRxSelectorPatternsConfiguration } from '../../src/utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-configuration';
import { PatternMatchingUtils } from '../../src/utils/pattern-matching-utils';
import { DOMReferencesConfiguration } from '../../src/utils/performance/dom-references/dom-references-configuration';
import { EventListenersConfiguration } from '../../src/utils/performance/event-listeners/event-listeners-configuration';
import { TimerFunctionsConfiguration } from '../../src/utils/performance/timer-functions/timer-functions-configuration';

const twice = <T>(ask: () => T): T[] => [ask(), ask()];

describe('#487 hasRegexPattern is stateless', () => {
  it('a /g pattern asked three times answers true three times', () => {
    const r = /document\.querySelector/g;
    const s = 'const el = document.querySelector("#a");';
    expect(
      [1, 2, 3].map(() => PatternMatchingUtils.hasRegexPattern(s, r))
    ).toEqual([true, true, true]);
    expect(r.lastIndex).toBe(0);
  });
});

describe('#487 the analyzers answer the same for the same text', () => {
  it('event listeners (window, document, element, @HostListener)', () => {
    const s =
      "window.addEventListener('resize', f); document.addEventListener('click', g);";
    expect(
      twice(() => EventListenersConfiguration.analyzeEventListenerPatterns(s))
    ).toEqual([
      expect.objectContaining({
        hasWindowListener: true,
        hasDocumentListener: true,
        hasElementListener: true,
      }),
      expect.objectContaining({
        hasWindowListener: true,
        hasDocumentListener: true,
        hasElementListener: true,
      }),
    ]);
    const host = "@HostListener('click') onClick() {}";
    expect(
      twice(
        () =>
          EventListenersConfiguration.analyzeHostListenerPatterns(host)
            .hasHostListener
      )
    ).toEqual([true, true]);
  });

  it('timers (setInterval, setTimeout)', () => {
    const s = 'setInterval(tick, 1000); setTimeout(done, 10);';
    expect(
      twice(() => {
        const r = TimerFunctionsConfiguration.analyzeTimerPatterns(s);
        return [r.hasSetInterval, r.hasSetTimeout];
      })
    ).toEqual([
      [true, true],
      [true, true],
    ]);
  });

  it('DOM references (getElementById, querySelector)', () => {
    const s =
      "const a = document.getElementById('x'); const b = document.querySelector('y');";
    expect(
      twice(() => {
        const r = DOMReferencesConfiguration.analyzeDOMPatterns(s);
        return [r.hasGetElementById, r.hasQuerySelector];
      })
    ).toEqual([
      [true, true],
      [true, true],
    ]);
  });

  it('NgRx selector parameters', () => {
    const s = 'export const select = createSelector((state) => state.items);';
    expect(
      twice(() =>
        NgRxSelectorPatternsConfiguration.containsPattern(s, 'parameters')
      )
    ).toEqual([true, true]);
  });
});

describe('#487 Environment Variables Policy: two placeholders in one file', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-487c-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'env-487', version: '1.0.0' })
    );
    fs.writeFileSync(
      path.join(dir, 'config.ts'),
      [
        'export const config = {',
        '  apiKey: "YOUR_API_KEY_HERE",',
        '  secret: "YOUR_SECRET_VALUE",',
        '};',
        '',
      ].join('\n')
    );
    fs.writeFileSync(path.join(dir, '.env.example'), 'API_KEY=\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('both are recognised as placeholders, neither is a secret', () => {
    const { violations = [] } = EnvironmentVariablesLaw.check({
      projectRoot: dir,
      config: { project: { name: 'env-487' } } as never,
    });
    expect(violations.filter(v => v.startsWith('Potential secret'))).toEqual(
      []
    );
  });
});
