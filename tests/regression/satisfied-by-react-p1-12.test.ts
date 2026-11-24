/**
 * #12, P1 — the React guidance of the security, documentation and
 * code-quality frontend laws, proved on a React + Vite project.
 *
 * Each case starts RED (the law reports the project) and goes GREEN by doing
 * exactly what `satisfiedBy.react` says, and checks that the card names the
 * construct used — an instruction that does not clear the finding is wrong,
 * however plausible it reads. A documented "not read" is pinned as such.
 */
import { ObservableCleanupLaw } from '../../src/checkers/code-quality-laws/observable-cleanup';
import { WebStorageEncapsulationLaw } from '../../src/checkers/code-quality-laws/web-storage-encapsulation';
import { ContentSecurityPolicyLaw } from '../../src/checkers/security-laws/content-security-policy';
import { XSSPreventionLaw } from '../../src/checkers/security-laws/xss-prevention';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { InternationalizationCompliancePolicyLaw } from '../../src/laws/documentation/internationalization-compliance-policy';
import { json, useTempProject } from './foreign-json-486.helpers';

/** The law card's `satisfiedBy.react` text. */
const reactGuidance = (title: string): string => {
  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  return law?.satisfiedBy?.react ?? '';
};

const project = useTempProject();
const { write } = project;

/** A React + Vite app, with any extra dependencies. */
const reactVite = (dependencies: Record<string, string> = {}): void => {
  write(
    'package.json',
    json({
      name: 'app',
      version: '1.0.0',
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        ...dependencies,
      },
      devDependencies: { vite: '^7.0.0', typescript: '^5.9.3' },
      scripts: { build: 'vite build' },
    })
  );
  write(
    'src/main.tsx',
    "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\ncreateRoot(document.getElementById('root')!).render(<App />);\n"
  );
};

describe('#12 P1 Observable Cleanup Requirements — React', () => {
  const hook = (cleanup: string): string =>
    [
      "import { useEffect, useState } from 'react';",
      "import { interval } from 'rxjs';",
      'export function useTicker(): number {',
      '  const [n, setN] = useState(0);',
      '  useEffect(() => {',
      '    const sub = interval(1000).subscribe(setN);',
      cleanup,
      '  }, []);',
      '  return n;',
      '}',
      '',
    ].join('\n');

  it('the card tells a React project to return unsubscribe from the effect', () => {
    expect(reactGuidance('Observable Cleanup Requirements')).toMatch(
      /return \(\) => sub\.unsubscribe\(\)/
    );
  });

  it('RED: an effect that subscribes and returns no cleanup', () => {
    reactVite({ rxjs: '^7.8.0' });
    write('src/useTicker.ts', hook(''));
    const result = ObservableCleanupLaw.check(project.context());
    expect(result.passed).toBe(false);
    // The path is matched by its end: on Windows the detector leaves it
    // absolute (it strips projectRoot with a plain string replace).
    expect(result.violations).toContainEqual(
      expect.stringMatching(
        /^Direct subscription without unsubscribe pattern: .*src\/useTicker\.ts$/
      )
    );
  });

  it('GREEN: the effect returns () => sub.unsubscribe()', () => {
    reactVite({ rxjs: '^7.8.0' });
    write('src/useTicker.ts', hook('    return () => sub.unsubscribe();'));
    const result = ObservableCleanupLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('documented limit: the same subscription in a .jsx file is not read', () => {
    reactVite({ rxjs: '^7.8.0' });
    write('src/useTicker.jsx', hook(''));
    const result = ObservableCleanupLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
  });
});

describe('#12 P1 Web Storage Encapsulation — React', () => {
  it('the card names the *.service.ts module as the only exempt place', () => {
    expect(reactGuidance('Web Storage Encapsulation')).toMatch(
      /\*\.service\.ts/
    );
  });

  it('RED: a component writes localStorage itself', () => {
    reactVite();
    write(
      'src/Theme.tsx',
      "export function Theme({ t }: { t: string }) {\n  localStorage.setItem('theme', t);\n  return <p>{t}</p>;\n}\n"
    );
    const result = WebStorageEncapsulationLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect((result.violations ?? []).join('\n')).toMatch(/src\/Theme\.tsx/);
  });

  it('GREEN: the call lives in theme-storage.service.ts, read through a hook', () => {
    reactVite();
    write(
      'src/theme-storage.service.ts',
      "export const saveTheme = (t: string): void => {\n  try {\n    localStorage.setItem('theme', t);\n  } catch {\n    // storage blocked\n  }\n};\n"
    );
    write(
      'src/Theme.tsx',
      "import { saveTheme } from './theme-storage.service';\nexport function Theme({ t }: { t: string }) {\n  saveTheme(t);\n  return <p>{t}</p>;\n}\n"
    );
    const result = WebStorageEncapsulationLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('#12 P1 Angular Security XSS Prevention Policy — React', () => {
  const preview = (assignment: string): string =>
    [
      "import DOMPurify from 'dompurify';",
      "import { useEffect, useRef } from 'react';",
      'export function Preview({ html }: { html: string }) {',
      '  const ref = useRef<HTMLDivElement>(null);',
      '  useEffect(() => {',
      '    const el = ref.current;',
      `    if (el) ${assignment}`,
      '  }, [html]);',
      '  return <div ref={ref} />;',
      '}',
      '',
    ].join('\n');

  it('the card says to sanitize in the same statement with DOMPurify.sanitize', () => {
    expect(reactGuidance('Angular Security XSS Prevention Policy')).toMatch(
      /DOMPurify\.sanitize/
    );
  });

  it('RED: a ref writes unsanitized HTML', () => {
    reactVite({ dompurify: '^3.0.0' });
    write('src/Preview.tsx', preview('el.innerHTML = html;'));
    const result = XSSPreventionLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect((result.violations ?? []).join('\n')).toMatch(/src\/Preview\.tsx/);
  });

  it('GREEN: the same statement sanitizes with DOMPurify.sanitize', () => {
    reactVite({ dompurify: '^3.0.0' });
    write(
      'src/Preview.tsx',
      preview('el.innerHTML = DOMPurify.sanitize(html);')
    );
    const result = XSSPreventionLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('#12 P1 Security Standards (XSS Prevention) Policy — React', () => {
  const indexHtml = (meta: string): string =>
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n${meta}\n<title>App</title>\n</head>\n<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`;

  it('the card names index.html for a React app that is not Next', () => {
    expect(reactGuidance('Security Standards (XSS Prevention) Policy')).toMatch(
      /in index\.html/
    );
  });

  it('RED: the Vite index.html declares no CSP', () => {
    reactVite();
    write('index.html', indexHtml(''));
    const result = ContentSecurityPolicyLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect((result.violations ?? []).join('\n')).toMatch(
      /^index\.html: no Content-Security-Policy/m
    );
  });

  it('GREEN: index.html carries <meta http-equiv="Content-Security-Policy">', () => {
    reactVite();
    write(
      'index.html',
      indexHtml(
        `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; object-src 'none'" />`
      )
    );
    const result = ContentSecurityPolicyLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('#12 P1 Internationalization (i18n) Compliance Policy — React', () => {
  it('the card names react-i18next, message files and t()', () => {
    const text = reactGuidance('Internationalization (i18n) Compliance Policy');
    expect(text).toMatch(/react-i18next/);
    expect(text).toMatch(/t\('…'\)/);
  });

  it('RED: no i18n library and the text written into JSX', async () => {
    reactVite();
    write(
      'src/App.tsx',
      'export function App() {\n  return <h1>Welcome back</h1>;\n}\n'
    );
    const result = await InternationalizationCompliancePolicyLaw.check(
      project.context()
    );
    expect(result.passed).toBe(false);
    expect((result.violations ?? []).join('\n')).toMatch(
      /Missing i18n configuration/
    );
  });

  it('GREEN: react-i18next, a message file, and the text through t()', async () => {
    reactVite({ 'react-i18next': '^15.0.0', i18next: '^24.0.0' });
    write('locales/en.json', json({ welcome: 'Welcome back' }));
    write(
      'src/App.tsx',
      "import { useTranslation } from 'react-i18next';\nexport function App() {\n  const { t } = useTranslation();\n  return <h1>{t('welcome')}</h1>;\n}\n"
    );
    const result = await InternationalizationCompliancePolicyLaw.check(
      project.context()
    );
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
