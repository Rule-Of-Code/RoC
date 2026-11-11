/**
 * NextUseClientAtLeaves (#235): 'use client' on a page or layout fails; a
 * 'use client' module with no hook, handler or browser API warns; the
 * directive must be the prologue to count.
 */
import { NextUseClientAtLeavesLaw as Law } from '../../../src/checkers/next-laws/next-use-client-at-leaves';
import { ctx, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, PAGE } from './next-fixture';

afterAll(removeProjects);

const client = (body: string) => `'use client';\n${body}`;

describe('NextUseClientAtLeavesLaw (#235)', () => {
  it.each([
    ['page', 'src/app/dashboard/page.tsx'],
    ['layout', 'src/app/dashboard/layout.tsx'],
  ])("red: 'use client' on a %s", (kind, file) => {
    const result = Law.check(nextCtx({ [file]: client("import { useState } from 'react';\nexport default function X() { const [a] = useState(0); return <p>{a}</p>; }") }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining(`${file}: '${kind}' is marked 'use client'`)]);
  });

  it("red: a 'use client' module that needs nothing from the client", () => {
    const result = Law.check(nextCtx({ 'src/components/card.tsx': client('export function Card({ title }) { return <h2>{title}</h2>; }') }));
    expect(result.violations).toEqual([expect.stringContaining("src/components/card.tsx: 'use client' but no hook, event handler, browser API")]);
  });

  it.each([
    ['a hook', "import { useState } from 'react';\nexport function C() { const [a] = useState(0); return <p>{a}</p>; }"],
    ['a custom hook', 'export function C() { const t = useTheme(); return <p>{t}</p>; }'],
    ['React 19 use()', 'export function C({ p }) { const v = use(p); return <p>{v}</p>; }'],
    ['an event handler', 'export function C() { return <button onClick={go}>x</button>; }'],
    ['a function-valued prop', 'export function C() { return <List render={item => <i>{item}</i>} />; }'],
    ['a browser global', 'export function C() { return <p>{window.innerWidth}</p>; }'],
    ['a class component', "import { Component } from 'react';\nexport class C extends Component { render() { return null; } }"],
    ['createContext', "import { createContext } from 'react';\nexport const Ctx = createContext(null);"],
    ['a re-export of a library', "export { Carousel } from 'acme-carousel';"],
  ])('green: a client module with %s', (_name, body) => {
    expect(Law.check(nextCtx({ 'src/components/c.tsx': client(body) })).violations).toEqual([]);
  });

  it('green: error.tsx must be a Client Component and is exempt from the second check', () => {
    expect(Law.check(nextCtx({ 'src/app/error.tsx': client('export default function E() { return <p>Something broke</p>; }') })).violations).toEqual([]);
  });

  it("a property named like a global (`props.document`) is not the browser's document", () => {
    const result = Law.check(nextCtx({ 'src/components/c.tsx': client('export function C(props) { return <p>{props.document}</p>; }') }));
    expect(result.violations).toHaveLength(1);
  });

  it("a 'use client' below an import is not a directive", () => {
    const result = Law.check(
      ctx(nextApp({ 'src/app/page.tsx': "import x from './x';\n'use client';\nexport default function P() { return <p>{x}</p>; }" }))
    );
    expect(result.passed).toBe(true);
    expect(result.message).toContain("no module declares 'use client'");
  });

  it('with no client module it passes and says so (control: the page is scanned)', () => {
    const result = Law.check(ctx(nextApp({ 'src/app/page.tsx': PAGE })));
    expect(result.message).toContain('every component renders on the server');
  });
});
