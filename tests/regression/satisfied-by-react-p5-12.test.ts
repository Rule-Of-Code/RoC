/**
 * #12, P5 — the React guidance of the frontend testing laws (Requires Spec,
 * Professional Component Testing Policy, Performance Test Requirements),
 * proved on a React + Vite project.
 *
 * Each case starts RED (the law reports the project) and goes GREEN by doing
 * exactly what `satisfiedBy.react` says, and checks that the card names the
 * construct used — an instruction that does not clear the finding is wrong,
 * however plausible it reads.
 */
import { RequiresSpecLaw } from '../../src/checkers/fe-architecture-laws/requires-spec';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { PerformanceTestRequirementsLaw } from '../../src/laws/testing/performance-test-requirements';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import type { LawResult } from '../../src/types/law.types';
import { json, useTempProject } from './foreign-json-486.helpers';

/** The law card's `satisfiedBy.react` text. */
const reactGuidance = (title: string): string => {
  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  return law?.satisfiedBy?.react ?? '';
};

const project = useTempProject();
const { write } = project;

/** A React + Vite app tested with Vitest and Testing Library. */
const reactVite = (devDependencies: Record<string, string> = {}): void => {
  write(
    'package.json',
    json({
      name: 'app',
      version: '1.0.0',
      type: 'module',
      dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      devDependencies: {
        vite: '^7.0.0',
        typescript: '^5.9.3',
        vitest: '^3.0.0',
        '@testing-library/react': '^16.0.0',
        ...devDependencies,
      },
      scripts: { build: 'vite build', test: 'vitest' },
    })
  );
  write(
    'vite.config.ts',
    "import { defineConfig } from 'vite';\nexport default defineConfig({});\n"
  );
};

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

const expectRed = (result: LawResult, finding: RegExp): void => {
  expect(result.passed).toBe(false);
  expect((result.violations ?? []).join('\n')).toMatch(finding);
};

const expectGreen = (result: LawResult): void => {
  expect(result.violations ?? []).toEqual([]);
  expect(result.passed).toBe(true);
};

/** A component of `n` lines. */
const longComponent = (name: string, n: number): string =>
  lines(
    `export function ${name}() {`,
    '  return (',
    '    <ul>',
    ...Array.from({ length: n - 6 }, (_, i) => `      <li>row ${i}</li>`),
    '    </ul>',
    '  );',
    '}'
  );

/** A Testing Library test of `name`: two tests, role queries, assertions. */
const roleTest = (name: string, from: string): string =>
  lines(
    "import { render, screen } from '@testing-library/react';",
    "import { describe, expect, it } from 'vitest';",
    `import { ${name} } from '${from}';`,
    `describe('${name}', () => {`,
    "  it('renders a list', () => {",
    `    render(<${name} />);`,
    "    expect(screen.getByRole('list')).toBeTruthy();",
    '  });',
    "  it('renders its rows', () => {",
    `    render(<${name} />);`,
    "    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);",
    '  });',
    '});'
  );

describe('#12 P5 Requires Spec — React', () => {
  it('the card names the line threshold and Basket.test.tsx', () => {
    const text = reactGuidance('Requires Spec');
    expect(text).toMatch(/over 200 lines/);
    expect(text).toMatch(/Basket\.tsx next to Basket\.test\.tsx/);
  });

  it('RED: a 240-line component in the feature layer with no test', () => {
    reactVite();
    write('src/features/basket/Basket.tsx', longComponent('Basket', 240));
    expectRed(
      RequiresSpecLaw.check(project.context()),
      /src\/features\/basket\/Basket\.tsx: \d+ LOC \(> 200\)/
    );
  });

  it('GREEN: Basket.test.tsx next to it', () => {
    reactVite();
    write('src/features/basket/Basket.tsx', longComponent('Basket', 240));
    write(
      'src/features/basket/Basket.test.tsx',
      roleTest('Basket', './Basket')
    );
    expectGreen(RequiresSpecLaw.check(project.context()));
  });

  it('documented limit: a test under __tests__/ is not credited', () => {
    reactVite();
    write('src/features/basket/Basket.tsx', longComponent('Basket', 240));
    write(
      'src/features/basket/__tests__/Basket.test.tsx',
      roleTest('Basket', '../Basket')
    );
    expect(RequiresSpecLaw.check(project.context()).passed).toBe(false);
  });
});

describe('#12 P5 Professional Component Testing Policy — React', () => {
  const list = lines(
    'export function List() {',
    '  return <ul><li>a</li></ul>;',
    '}'
  );

  it('the card names X.test.tsx, two tests and screen.getByRole', () => {
    const text = reactGuidance('Professional Component Testing Policy');
    expect(text).toMatch(/createRoot/);
    expect(text).toMatch(/X\.test\.tsx/);
    expect(text).toMatch(/at least two tests/);
    expect(text).toMatch(/screen\.getByRole/);
  });

  it('RED: a component with no test', () => {
    reactVite();
    write('src/List.tsx', list);
    expectRed(
      ProfessionalComponentTestingPolicyLaw.check(project.context()),
      /1 React components missing a co-located \.test\.tsx/
    );
  });

  it('RED: a test that does not query by role', () => {
    reactVite();
    write('src/List.tsx', list);
    write(
      'src/List.test.tsx',
      lines(
        "import { render } from '@testing-library/react';",
        "import { expect, it } from 'vitest';",
        "import { List } from './List';",
        "it('renders', () => { expect(render(<List />).container).toBeTruthy(); });",
        "it('renders again', () => { expect(render(<List />).container).toBeTruthy(); });"
      )
    );
    expectRed(
      ProfessionalComponentTestingPolicyLaw.check(project.context()),
      /1 React component tests do not query by role/
    );
  });

  it('RED before #12: the Vite entry src/main.tsx was asked for a test', () => {
    reactVite();
    write('src/List.tsx', list);
    write('src/List.test.tsx', roleTest('List', './List'));
    write(
      'src/main.tsx',
      lines(
        "import { createRoot } from 'react-dom/client';",
        "import { List } from './List';",
        "createRoot(document.getElementById('root')!).render(<List />);"
      )
    );
    expectGreen(ProfessionalComponentTestingPolicyLaw.check(project.context()));
  });

  it('GREEN: List.test.tsx with two tests that query by role', () => {
    reactVite();
    write('src/List.tsx', list);
    write('src/List.test.tsx', roleTest('List', './List'));
    expectGreen(ProfessionalComponentTestingPolicyLaw.check(project.context()));
  });
});

describe('#12 P5 the mount-only entry of the app (QA on #631)', () => {
  const list = lines(
    'export function List() {',
    '  return <ul><li>a</li></ul>;',
    '}'
  );
  /** A project with one tested component and `file` holding `text`. */
  const check = (file: string, text: string): LawResult => {
    reactVite();
    write('src/List.tsx', list);
    write('src/List.test.tsx', roleTest('List', './List'));
    write(file, text);
    return ProfessionalComponentTestingPolicyLaw.check(project.context());
  };
  const ONE_MISSING = /1 React components missing a co-located \.test\.tsx/;

  it('m1: main.tsx that only mounts with createRoot from react-dom/client is not asked for a test', () => {
    expectGreen(
      check(
        'src/main.tsx',
        lines(
          "import { createRoot } from 'react-dom/client';",
          "import { List } from './List';",
          "createRoot(document.getElementById('root')!).render(<List />);"
        )
      )
    );
  });

  it('m6: hydrateRoot, and ReactDOM.createRoot through the default import, mount too', () => {
    expectGreen(
      check(
        'src/main.tsx',
        lines(
          "import { hydrateRoot } from 'react-dom/client';",
          "import { List } from './List';",
          "hydrateRoot(document.getElementById('root')!, <List />);"
        )
      )
    );
    expectGreen(
      check(
        'src/index.tsx',
        lines(
          "import ReactDOM from 'react-dom/client';",
          "import { List } from './List';",
          "ReactDOM.createRoot(document.getElementById('root')!).render(<List />);"
        )
      )
    );
  });

  it('m5: createRoot only in a comment or a string is no mount: the module needs its test', () => {
    expectRed(
      check(
        'src/Banner.tsx',
        lines(
          "// createRoot(document.getElementById('root')!)",
          "const hint = 'createRoot(el)';",
          'export const Banner = () => <p>{hint}</p>;'
        )
      ),
      ONE_MISSING
    );
  });

  it('m7: a helper module with no mount needs its test', () => {
    expectRed(
      check(
        'src/format.tsx',
        lines('export const format = (n: number) => <b>{n}</b>;')
      ),
      ONE_MISSING
    );
  });

  it('m4: .createRoot( of another object is no mount, with or without an export', () => {
    expectRed(
      check(
        'src/Tree.tsx',
        lines(
          "import { makeFactory } from './factory';",
          'const treeFactory = makeFactory();',
          'export function Tree() {',
          "  treeFactory.createRoot('x');",
          '  return <div />;',
          '}'
        )
      ),
      ONE_MISSING
    );
    expectRed(
      check(
        'src/tree-setup.tsx',
        lines(
          "import { makeFactory } from './factory';",
          "makeFactory().createRoot('x');",
          'const createRoot = (id: string) => id;',
          "createRoot('y');"
        )
      ),
      // Tree.tsx from above and tree-setup.tsx: both are components.
      /2 React components missing a co-located \.test\.tsx/
    );
  });

  it('m3: a component that mounts a portal with createRoot in an effect needs its test', () => {
    expectRed(
      check(
        'src/Modal.tsx',
        lines(
          "import { useEffect } from 'react';",
          "import { createRoot } from 'react-dom/client';",
          'export function Modal() {',
          '  useEffect(() => {',
          "    const el = document.createElement('div');",
          '    createRoot(el).render(<p>portal</p>);',
          '  }, []);',
          '  return null;',
          '}'
        )
      ),
      ONE_MISSING
    );
  });

  it('m2: main.tsx that mounts and also exports a component needs its test', () => {
    expectRed(
      check(
        'src/main.tsx',
        lines(
          "import { createRoot } from 'react-dom/client';",
          'export function Counter() {',
          '  return <button>0</button>;',
          '}',
          "createRoot(document.getElementById('root')!).render(<Counter />);"
        )
      ),
      ONE_MISSING
    );
    expectRed(
      check(
        'src/main.tsx',
        lines(
          "import { createRoot } from 'react-dom/client';",
          "export { Checkout } from './Checkout';",
          "createRoot(document.getElementById('root')!).render(<p />);"
        )
      ),
      ONE_MISSING
    );
  });
});

describe('#12 P5 Performance Test Requirements — React', () => {
  const perfSpec = lines(
    "import { expect, it } from 'vitest';",
    "import { checkout } from '../src/checkout';",
    "it('checkout stays under 200 ms', () => {",
    '  const start = performance.now();',
    '  checkout();',
    '  expect(performance.now() - start).toBeLessThan(200);',
    '});'
  );

  it('the card names *.perf.spec.ts, the root package.json and the tools', () => {
    const text = reactGuidance('Performance Test Requirements');
    expect(text).toMatch(/\*\.perf\.spec\.ts/);
    expect(text).toMatch(/ROOT package\.json/);
  });

  it('RED: no performance test', () => {
    reactVite();
    write('src/checkout.ts', 'export const checkout = (): number => 1;\n');
    expectRed(
      PerformanceTestRequirementsLaw.check(project.context()),
      /No performance test files found/
    );
  });

  it('GREEN: tests/checkout.perf.spec.ts and size-limit + web-vitals in the root package.json', () => {
    reactVite({ 'size-limit': '^11.0.0', 'web-vitals': '^5.0.0' });
    write('src/checkout.ts', 'export const checkout = (): number => 1;\n');
    write('tests/checkout.perf.spec.ts', perfSpec);
    expectGreen(PerformanceTestRequirementsLaw.check(project.context()));
  });
});
