/**
 * NextThirdPartyScriptDeclared (#229): an external <script src> or next/script
 * host must be declared with a reason; an entry without a reason is reported
 * and not honoured; a src whose host cannot be read is not guessed.
 */
import { NextThirdPartyScriptDeclaredLaw as Law } from '../../../src/checkers/next-laws/next-third-party-script-declared';
import { removeProjects } from '../toolkit-fixture';
import { nextCtx } from './next-fixture';

afterAll(removeProjects);

const layout = (body: string) =>
  `import Script from 'next/script';\nexport default function L({ children }) {\n  return (\n    <html lang="en"><body>${body}{children}</body></html>\n  );\n}`;
const check = (body: string, thirdPartyScripts?: unknown) =>
  Law.check(nextCtx({ 'src/app/layout.tsx': layout(body) }, thirdPartyScripts ? { thirdPartyScripts } : {}));

describe('NextThirdPartyScriptDeclaredLaw (#229)', () => {
  it.each([
    ['plain <script>', '<script src="https://cdn.example.com/a.js" async />', 'cdn.example.com'],
    ['next/script', '<Script src="https://www.googletagmanager.com/gtag/js?id=G-1" strategy="afterInteractive" />', 'www.googletagmanager.com'],
    ['protocol-relative', '<script src="//widget.example.org/w.js" />', 'widget.example.org'],
    ['template with a fixed host', '<Script src={`https://maps.example.net/api.js?key=${key}`} />', 'maps.example.net'],
  ])('red: %s', (_name, body, host) => {
    const result = check(body);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining(`loads a script from ${host}, which is not declared`)]);
  });

  it('green: a declared host with a reason (control: the same script is red undeclared)', () => {
    const body = '<Script src="https://www.googletagmanager.com/gtag/js" />';
    expect(check(body).passed).toBe(false);
    expect(check(body, [{ host: 'www.googletagmanager.com', reason: 'analytics the product team owns' }]).violations).toEqual([]);
    expect(check(body, [{ host: '*.googletagmanager.com', reason: 'any GTM edge' }]).violations).toEqual([]);
  });

  it('an entry without a reason is reported and not honoured', () => {
    const result = check('<Script src="https://www.googletagmanager.com/gtag/js" />', [{ host: 'www.googletagmanager.com', reason: ' ' }]);
    expect(result.violations).toEqual([
      expect.stringContaining('thresholds.next.thirdPartyScripts[0] (www.googletagmanager.com): no reason given'),
      expect.stringContaining('www.googletagmanager.com, which is not declared'),
    ]);
  });

  it.each([
    ['an identifier', '<Script src={GTM_URL} />'],
    ['a template with an open host', '<Script src={`https://${region}.cdn.example.com/a.js`} />'],
  ])('red: a computed src (%s) is reported as unreadable', (_name, body) => {
    expect(check(body).violations).toEqual([expect.stringContaining('src is computed — the host it loads from cannot be read')]);
  });

  it.each([
    ['a local script', '<script src="/scripts/local.js" />'],
    ['a local template', '<Script src={`/scripts/${name}.js`} />'],
    ['an inline script', '<Script id="init">{`window.x = 1`}</Script>'],
    ['JSON-LD', '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{}" }} />'],
  ])('green: %s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });
});
