/**
 * #213: the i18n and the component-testing laws see .tsx. Before, the i18n law
 * failed every React project on "Missing Angular i18n configuration" and never
 * read JSX text, and the component-testing law found no `*.component.ts`, so a
 * React project got "Excellent" without a single file judged.
 */
import { InternationalizationCompliancePolicyLaw } from '../../src/laws/documentation/internationalization-compliance-policy';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import * as tsxSource from '../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const violations = (result: { violations?: string[] }): string[] => result.violations ?? [];

describe('i18n on React (#213)', () => {
  const i18n = (files: Record<string, string>) =>
    InternationalizationCompliancePolicyLaw.check(ctx(project(files)));

  it('red: no React i18n library — says so in React terms, not "Angular"', async () => {
    const result = await i18n({
      'package.json': manifest({ react: '19.3.0', next: '16.4.6' }),
      'src/app/page.tsx': 'export default function P() { return <p>{t}</p>; }',
    });
    expect(violations(result)).toContain(
      'Missing i18n configuration — no next-intl or react-i18next declared in any workspace package.json (nor an Angular i18n setup)'
    );
  });

  it('red: hardcoded JSX text and a hardcoded placeholder, with file and line', async () => {
    const result = await i18n({
      'package.json': manifest({ react: '19.3.0', 'next-intl': '4.0.0' }),
      'messages/en.json': '{"title":"Hello"}',
      'src/app/page.tsx':
        "export default function P() {\n  return <form><h1>Welcome back friend</h1><input placeholder=\"Your email address\" /></form>;\n}",
    });
    expect(violations(result)).toEqual([
      expect.stringMatching(/^Hardcoded text found in JSX: 2 text\(s\), e\.g\. src\/app\/page\.tsx:2 "Welcome back friend"; src\/app\/page\.tsx:2 "Your email address"$/),
    ]);
  });

  it('green: next-intl declared in a workspace app, messages/en.json, text through t()', async () => {
    const result = await i18n({
      'package.json': JSON.stringify({ name: 'mono', workspaces: ['apps/*'] }),
      'apps/web/package.json': manifest({ react: '19.3.0', next: '16.4.6', 'next-intl': '4.0.0' }),
      'apps/web/messages/en.json': '{"welcome":"Welcome back"}',
      'apps/web/src/app/page.tsx':
        "import { useTranslations } from 'next-intl';\nexport default function P() {\n  const t = useTranslations('home');\n  return <h1>{t('welcome')}</h1>;\n}",
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('green: text inside react-i18next <Trans> is translated, not hardcoded', async () => {
    const result = await i18n({
      'package.json': manifest({ react: '19.3.0', 'react-i18next': '15.0.0' }),
      'public/locales/en.json': '{}',
      'src/App.tsx': "import { Trans } from 'react-i18next';\nexport const A = () => <p><Trans>Hello there friend</Trans></p>;",
    });
    expect(result.violations).toEqual([]);
  });

  it('a messages/ directory without locale-named catalogs is not a translation directory', async () => {
    const result = await i18n({
      'package.json': manifest({ react: '19.3.0', 'next-intl': '4.0.0' }),
      'src/features/messages/fixtures.json': '{}',
      'src/app/page.tsx': 'export default () => null;',
    });
    expect(violations(result)).toContain('Missing i18n translation files');
  });

  it('a .tsx file it cannot parse is reported, not passed', async () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = await i18n({
        'package.json': manifest({ react: '19.3.0', 'next-intl': '4.0.0' }),
        'messages/en.json': '{}',
        'src/app/page.tsx': 'export default () => null;',
      });
      expect(violations(result)).toEqual([expect.stringMatching(/1 file\(s\): could not load the 'typescript' package/)]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Professional Component Testing on React (#213)', () => {
  const REACT = { 'package.json': manifest({ react: '19.3.0' }) };
  const GOOD_TEST =
    "import { render, screen } from '@testing-library/react';\nimport { Basket } from './Basket';\n" +
    "it('shows the total', () => { render(<Basket />); expect(screen.getByRole('heading', { name: /total/i })).toBeInTheDocument(); });\n" +
    "it('has a checkout button', () => { render(<Basket />); expect(screen.getByRole('button', { name: 'Checkout' })).toBeEnabled(); });\n";
  const check = (files: Record<string, string>) =>
    ProfessionalComponentTestingPolicyLaw.check(ctx(project({ ...REACT, ...files })));

  it('red: a .tsx component with no co-located test, named', () => {
    expect(violations(check({ 'src/components/Basket.tsx': 'export const Basket = () => null;' }))).toEqual([
      '1 React components missing a co-located .test.tsx / .spec.tsx (e.g. src/components/Basket.tsx)',
    ]);
  });

  it('red: a test that never queries by role', () => {
    const result = check({
      'src/components/Basket.tsx': 'export const Basket = () => null;',
      'src/components/Basket.test.tsx':
        "it('a', () => { expect(container.querySelector('.total')).toBeTruthy(); });\nit('b', () => { expect(1).toBe(1); });",
    });
    expect(violations(result)).toEqual([
      expect.stringMatching(/^1 React component tests do not query by role and assert/),
    ]);
  });

  it.each([['Basket.test.tsx'], ['Basket.spec.tsx'], ['__tests__/Basket.test.tsx']])(
    'green: %s with role queries and assertions',
    test => {
      const result = check({
        'src/components/Basket.tsx': 'export const Basket = () => null;',
        [`src/components/${test}`]: GOOD_TEST,
      });
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    }
  );

  it('Next route files are entry points, not components that need a unit test', () => {
    const result = check({
      'src/app/page.tsx': 'export default function Page() { return null; }',
      'src/app/(shop)/cart/layout.tsx': 'export default function L({ children }) { return children; }',
      'src/components/Basket.tsx': 'export const Basket = () => null;',
      'src/components/Basket.test.tsx': GOOD_TEST,
    });
    expect(result.violations).toEqual([]);
  });

  it('judged nothing: no component file at all fails, it does not say "Excellent"', () => {
    const result = check({ 'src/lib/util.ts': 'export const x = 1;' });
    expect(result.passed).toBe(false);
    expect(violations(result)).toEqual([expect.stringMatching(/found no component files .* this law judged nothing/)]);
  });
});
