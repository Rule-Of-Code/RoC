/**
 * ReactRenderNoBrowserGlobal (#239): a client component (or Pages Router
 * page) does not read window/document/Web Storage at render scope.
 */
import { ReactRenderNoBrowserGlobalLaw } from '../../../src/checkers/react-laws/react-render-no-browser-global';
import { removeProjects } from '../toolkit-fixture';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import {
  cardFor,
  describeFailsClosed,
  describeSelection,
  NEXT_DEPS,
  REACT_DEPS,
  reactProject,
  run,
} from './react-law-fixture';

afterAll(removeProjects);

const law = ReactRenderNoBrowserGlobalLaw;
const client = (body: string, directive = "'use client';"): string =>
  [
    directive,
    "import { useEffect, useMemo, useState } from 'react';",
    'export default function Widget() {',
    body,
    '  return <div />;',
    '}',
  ].join('\n');
const check = (body: string, directive?: string) =>
  run(law, { 'src/app/widget.tsx': client(body, directive) }, NEXT_DEPS);

describe('ReactRenderNoBrowserGlobalLaw (#239) — red', () => {
  it.each([
    ['window.innerWidth in the body', '  const width = window.innerWidth;', 'window'],
    ['localStorage read', "  const saved = localStorage.getItem('k');", 'localStorage'],
    ['sessionStorage read', "  const s = sessionStorage.getItem('k');", 'sessionStorage'],
    ['document in a JSX-bound value', '  const title = document.title;', 'document'],
    ['a lazy useState initializer runs during render', "  const [v] = useState(() => localStorage.getItem('k'));", 'localStorage'],
    ['a useMemo factory runs during render', '  const w = useMemo(() => window.innerWidth, []);', 'window'],
    ['an IIFE runs during render', '  const w = (() => window.innerWidth)();', 'window'],
  ])('%s', (_name, body, global) => {
    const result = check(body);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(new RegExp(`^src/app/widget\\.tsx:4: \`${global}\` is read while rendering`)),
    ]);
  });

  it('a custom hook runs during render too', () => {
    const file = "'use client';\nexport function useWidth() {\n  return window.innerWidth;\n}\n";
    expect(run(law, { 'src/app/use-width.ts': file }, NEXT_DEPS).violations).toEqual([
      expect.stringContaining('src/app/use-width.ts:3: `window`'),
    ]);
  });

  it('a memo-wrapped arrow component', () => {
    const file = "'use client';\nimport { memo } from 'react';\nexport const Card = memo(() => {\n  const h = window.innerHeight;\n  return null;\n});\n";
    expect(run(law, { 'src/app/card.tsx': file }, NEXT_DEPS).violations).toHaveLength(1);
  });

  it('a Pages Router page renders on the server without a directive', () => {
    const page = 'export default function Home() {\n  const w = window.innerWidth;\n  return <p>{w}</p>;\n}\n';
    const result = run(law, { 'pages/index.tsx': page }, NEXT_DEPS);
    expect(result.violations).toEqual([expect.stringContaining('pages/index.tsx:2: `window`')]);
  });
});

describe('ReactRenderNoBrowserGlobalLaw (#239) — green', () => {
  it.each([
    ['inside useEffect', '  useEffect(() => { document.title = "x"; }, []);'],
    ['inside an event handler', '  const onClick = () => window.open("/x");'],
    ['typeof guard in a conditional', "  const w = typeof window !== 'undefined' ? window.innerWidth : 0;"],
    ['typeof guard with &&', "  const w = typeof window !== 'undefined' && window.innerWidth;"],
    ['typeof guard in an if', "  if (typeof window !== 'undefined') { console.log(window.location.href); }"],
    ['after an early-return typeof guard', "  if (typeof window === 'undefined') return null;\n  const w = window.innerWidth;"],
    ['a property named window', '  const cfg = { window: 3 }; const n = cfg.window;'],
    ['a type position', '  let w: typeof window | null = null;'],
    ['the global named in a string or comment', "  const s = 'window.innerWidth'; // document.title"],
  ])('%s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });

  it('a server component (no directive) is not read', () => {
    expect(check('  const w = window.innerWidth;', '').violations).toEqual([]);
  });

  it('a pages/api route is not a page', () => {
    const route = 'export default function handler(req, res) { const d = document; res.end(); }\n';
    expect(run(law, { 'pages/api/x.ts': route }, NEXT_DEPS).violations).toEqual([]);
  });

  it('a parameter named document shadows the global', () => {
    const file = "'use client';\nexport function View({ document }) {\n  return document.title;\n}\n";
    expect(run(law, { 'src/app/view.tsx': file }, NEXT_DEPS).violations).toEqual([]);
  });

  it('a lowercase helper is not a render function', () => {
    const file = "'use client';\nexport function width() {\n  return window.innerWidth;\n}\n";
    expect(run(law, { 'src/app/width.ts': file }, NEXT_DEPS).violations).toEqual([]);
  });
});

describeFailsClosed('ReactRenderNoBrowserGlobalLaw', law, NEXT_DEPS);
describeSelection('ReactRenderNoBrowserGlobalLaw.check', NEXT_DEPS);

describe('ReactRenderNoBrowserGlobalLaw is about Next', () => {
  it('is not selected for React without Next', () => {
    const card = cardFor('ReactRenderNoBrowserGlobalLaw.check');
    expect(lawRequirementsMet(card.requires, reactProject({}, REACT_DEPS))).toBe(false);
  });
});
