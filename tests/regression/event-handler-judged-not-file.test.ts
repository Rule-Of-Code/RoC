/**
 * #536 — Error Handling Completeness reported "event handlers without error
 * handling" for a file that calls addEventListener and has no try/catch
 * anywhere, whatever the handler does. A synchronous handler that removes
 * itself and resolves a promise cannot throw anything worth catching. The
 * handler is judged now: it is a finding when it can fail (async, awaits,
 * throws, JSON.parse, a network call) and has no try and no .catch.
 */
import { ErrorHandlingCompletenessLaw } from '../../src/checkers/code-quality-laws/error-handling-completeness';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const HANDLER = /event handlers without error handling/;

const handlerFindings = (lines: string[]): string[] =>
  (
    ErrorHandlingCompletenessLaw.check({
      projectRoot: project({
        'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }),
        'src/x.ts': lines.join('\n'),
      }),
      config: FileUtils.getMinimalDefaultConfig(),
    }).violations ?? []
  ).filter(v => HANDLER.test(v));

describe('#536 the event handler is judged, not the file', () => {
  afterEach(removeProjects);

  it('does not report a synchronous handler that removes itself and resolves', () => {
    expect(
      handlerFindings([
        'export function once(target: EventTarget, type: string): Promise<void> {',
        '  return new Promise(resolve => {',
        '    const done = (): void => {',
        '      target.removeEventListener(type, done);',
        '      resolve();',
        '    };',
        '    target.addEventListener(type, done);',
        '  });',
        '}',
      ])
    ).toEqual([]);
  });

  it('reports an async handler that awaits a fetch with no catch, by line', () => {
    expect(
      handlerFindings([
        'export function wire(button: HTMLElement): void {',
        "  button.addEventListener('click', async () => {",
        "    const response = await fetch('/api/save', { method: 'POST' });",
        '    render(await response.json());',
        '  });',
        '}',
        'declare function render(value: unknown): void;',
      ])
    ).toEqual([
      expect.stringContaining('event handlers without error handling (line 2)'),
    ]);
  });

  it('reports a named handler that parses JSON with no catch', () => {
    expect(
      handlerFindings([
        'function onMessage(event: MessageEvent): void {',
        '  apply(JSON.parse(event.data));',
        '}',
        "window.addEventListener('message', onMessage);",
        'declare function apply(value: unknown): void;',
      ])
    ).toHaveLength(1);
  });

  it('does not report a handler that can fail but catches', () => {
    expect(
      handlerFindings([
        "window.addEventListener('message', (event: MessageEvent) => {",
        '  try {',
        '    apply(JSON.parse(event.data));',
        '  } catch (error) {',
        '    report(error);',
        '  }',
        '});',
        'declare function apply(value: unknown): void;',
        'declare function report(error: unknown): void;',
      ])
    ).toEqual([]);
  });

  it('does not take a try in another function for the handler’s guard', () => {
    expect(
      handlerFindings([
        "document.addEventListener('click', async () => { await save(); });",
        'export function other(): void {',
        '  try { risky(); } catch { /* handled here, not in the handler */ }',
        '}',
        'declare function save(): Promise<void>;',
        'declare function risky(): void;',
      ])
    ).toHaveLength(1);
  });
});
