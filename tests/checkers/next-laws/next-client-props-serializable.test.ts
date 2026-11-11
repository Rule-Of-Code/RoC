/**
 * NextClientPropsSerializable (#236): in a Server Component, an inline
 * function or `new` of a non-serializable class passed to a component whose
 * import resolves to a 'use client' module fails; built-ins React serializes
 * and inline Server Functions pass; a server-to-server prop is not judged.
 */
import { NextClientPropsSerializableLaw as Law } from '../../../src/checkers/next-laws/next-client-props-serializable';
import { removeProjects } from '../toolkit-fixture';
import { nextCtx } from './next-fixture';

afterAll(removeProjects);

const BUTTON = "'use client';\nexport function Button(props) { return <button onClick={props.onPress}>{props.label}</button>; }\nexport default Button;";
const page = (jsx: string, imports = "import { Button } from '@/components/button';") =>
  `${imports}\nexport default function Page() {\n  return (\n    ${jsx}\n  );\n}`;
const check = (jsx: string, imports?: string, extra: Record<string, string> = {}) =>
  Law.check(nextCtx({ 'src/components/button.tsx': BUTTON, 'src/app/page.tsx': page(jsx, imports), ...extra }));

describe('NextClientPropsSerializableLaw (#236)', () => {
  it.each([
    ['an inline arrow', '<Button onPress={() => console.log(1)} />', 'onPress={…}> is a function'],
    ['a function expression', '<Button onPress={function () {}} />', 'is a function'],
    ['new of a class', '<Button label={new Money(1)} />', 'is a `new Money(…)`'],
    ['new URL', '<Button label={new URL("https://x")} />', 'is a `new URL(…)`'],
    ['a function inside an object', '<Button label={{ format: (v) => v }} />', 'holds a value that is a function'],
    ['a method inside an object', '<Button label={{ format(v) { return v; } }} />', 'holds a method'],
    ['a render-prop child', '<Button>{(x) => x}</Button>', '<Button> child is a function'],
  ])('red: %s', (_name, jsx, fragment) => {
    const result = check(jsx);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining(fragment)]);
    expect(result.violations?.[0]).toMatch(/^src\/app\/page\.tsx:4: /);
  });

  it.each([
    ['plain data', '<Button label="Save" />'],
    ['a Date', '<Button label={new Date()} />'],
    ['a Map', '<Button label={new Map()} />'],
    ['an inline Server Function', "<Button onPress={async () => { 'use server'; await save(); }} />"],
  ])('green: %s', (_name, jsx) => {
    expect(check(jsx).violations).toEqual([]);
  });

  it('red through a barrel that re-exports the client module, and through a default import', () => {
    const barrel = { 'src/components/index.ts': "export * from './button';" };
    expect(check('<Button onPress={() => 1} />', "import { Button } from '@/components';", barrel).passed).toBe(false);
    expect(check('<B onPress={() => 1} />', "import B from '../components/button';").passed).toBe(false);
  });

  it('green: the same arrow passed to a Server Component (control: the page is walked)', () => {
    const result = check('<Row onPress={() => 1} />', "import { Row } from '@/components/row';", {
      'src/components/row.tsx': 'export function Row(props) { return <div>{props.label}</div>; }',
    });
    expect(result.violations).toEqual([]);
    expect(result.message).toContain('compliance verified');
  });

  it("green: a 'use client' page renders its children on the client", () => {
    const result = Law.check(
      nextCtx({
        'src/components/button.tsx': BUTTON,
        'src/app/page.tsx': `'use client';\n${page('<Button onPress={() => 1} />')}`,
      })
    );
    expect(result.violations).toEqual([]);
  });

  it('a nested server component reached from the page is read too', () => {
    const result = Law.check(
      nextCtx({
        'src/components/button.tsx': BUTTON,
        'src/app/page.tsx': page('<Panel />', "import { Panel } from './panel';"),
        'src/app/panel.tsx': "import { Button } from '@/components/button';\nexport function Panel() { return <Button onPress={() => 1} />; }",
      })
    );
    expect(result.violations).toEqual([expect.stringContaining('src/app/panel.tsx:2:')]);
  });
});
