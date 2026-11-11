/**
 * ReactContextValueStable (#234): a provider's value is not an inline object
 * or array literal — read from the JSX parse.
 */
import { ReactContextValueStableLaw } from '../../../src/checkers/react-laws/react-context-value-stable';
import { removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, REACT_DEPS, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactContextValueStableLaw;
const check = (jsx: string, extra = '') =>
  run(law, {
    'src/provider.tsx': [
      "import { createContext, useMemo, useState } from 'react';",
      "import { ThemeContext } from './theme';",
      'const Auth = createContext(null);',
      extra,
      'export function Provider({ children }) {',
      '  const [user, setUser] = useState(null);',
      '  const value = useMemo(() => ({ user, setUser }), [user]);',
      `  return ${jsx};`,
      '}',
    ].join('\n'),
  });

describe('ReactContextValueStableLaw (#234) — red', () => {
  it.each([
    ['an object on .Provider', '<Auth.Provider value={{ user, setUser }}>{children}</Auth.Provider>', 'object'],
    ['an array on .Provider', '<Auth.Provider value={[user, setUser]}>{children}</Auth.Provider>', 'array'],
    ['React 19: the context itself as the provider', '<Auth value={{ user }}>{children}</Auth>', 'object'],
    ['an imported …Context', '<ThemeContext value={{ dark: true }}>{children}</ThemeContext>', 'object'],
    ['an object behind parentheses and a cast', '<Auth.Provider value={({ user } as never)}>{children}</Auth.Provider>', 'object'],
  ])('%s', (_name, jsx, kind) => {
    const result = check(jsx);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(new RegExp(`^src/provider\\.tsx:8: <.+ value=\\{.+\\}> — an inline ${kind} is a new value on every render`)),
    ]);
  });
});

describe('ReactContextValueStableLaw (#234) — green', () => {
  it.each([
    ['a memoized value', '<Auth.Provider value={value}>{children}</Auth.Provider>'],
    ['a primitive', '<Auth value={user}>{children}</Auth>'],
    ['an object on a non-context element', '<Panel value={{ a: 1 }} />'],
    ['a string literal', '<ThemeContext value="dark">{children}</ThemeContext>'],
  ])('%s', (_name, jsx) => {
    expect(check(jsx, 'const Panel = (p) => null;').violations).toEqual([]);
  });

  it('an object in a comment next to the provider is not JSX', () => {
    const jsx = '<Auth.Provider value={value /* value={{ x }} */}>{children}</Auth.Provider>';
    expect(check(jsx).violations).toEqual([]);
  });
});

describeFailsClosed('ReactContextValueStableLaw', law, REACT_DEPS);
describeSelection('ReactContextValueStableLaw.check', REACT_DEPS);
