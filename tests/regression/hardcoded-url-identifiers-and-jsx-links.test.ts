/**
 * #537 — the hardcoded-URL finding (Environment Security Enforcement and
 * Environment Parity Standards, through the env-usage analyzer) still
 * reported classes that are not configuration:
 *   - namespace and vocabulary identifiers (`http://www.w3.org/2000/svg`,
 *     `https://schema.org/InStock`), which no environment changes;
 *   - links a page renders for its reader (`<a href="https://github.com/…">`);
 * and it took the URL from the raw source text, so in a template the escape
 * sequences and the next `${` were reported as part of the URL.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { EnvironmentParityStandardsLaw } from '../../src/checkers/deployment-laws/environment-parity-standards';
import { EnvironmentSecurityEnforcementLaw } from '../../src/checkers/security-laws/environment-security-enforcement';
import { FileUtils } from '../../src/utils/file-utils';

const config = FileUtils.getMinimalDefaultConfig();
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/** A project with one source file. */
function projectWith(file: string, source: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-537-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'url-537', version: '1.0.0' })
  );
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), source);
  return dir;
}

/** The Environment Security findings matching `pattern` for one file. */
function securityFindings(
  file: string,
  source: string,
  pattern = /Hardcoded URL/
): string[] {
  return (
    EnvironmentSecurityEnforcementLaw.check({
      projectRoot: projectWith(file, source),
      config,
    }).violations?.filter(v => pattern.test(v)) ?? []
  );
}

/** The hardcoded-URL findings of Environment Security for one source file. */
function urlFindings(file: string, source: string): string[] {
  return securityFindings(file, source);
}

describe('#537 identifiers are not endpoints', () => {
  it('an SVG xmlns attribute is not a hardcoded URL', () => {
    expect(
      urlFindings(
        'src/components/icon.tsx',
        [
          'export const Icon = () => (',
          '  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>',
          ');',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });

  it('a namespace handed to createElementNS is not a hardcoded URL', () => {
    expect(
      urlFindings(
        'src/lib/svg.ts',
        "export const make = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg');\n"
      )
    ).toEqual([]);
  });

  it('a schema.org vocabulary term is not a hardcoded URL', () => {
    expect(
      urlFindings(
        'src/lib/product-ld.ts',
        [
          'export const offer = {',
          "  '@context': 'https://schema.org',",
          "  '@type': 'Offer',",
          "  availability: 'https://schema.org/InStock',",
          '};',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });
});

describe('#537 a link the page renders is not configuration', () => {
  it('an anchor href to a repository is not a hardcoded URL', () => {
    expect(
      urlFindings(
        'src/components/footer.tsx',
        [
          'export const Footer = () => (',
          '  <footer>',
          '    <a href="https://github.com/acme/widgets">Source</a>',
          '  </footer>',
          ');',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });
});

describe('#537 the reported value is the URL', () => {
  it('a URL inside a template is reported without the escapes after it', () => {
    const v = urlFindings(
      'src/lib/utils.ts',
      [
        'export const help = (name: string, extra: string) =>',
        '  `Hello ${name}, open https://api.prod-service.io/v1\\n\\n${extra}`;',
        '',
      ].join('\n')
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(
      /Hardcoded URL detected: https:\/\/api\.prod-service\.io\/v1$/
    );
  });
});

describe('#537 controls (hold on develop and after the fix)', () => {
  it('an endpoint the code calls is still reported', () => {
    // NB: the issue's own control used api.prod.example.com, which is a
    // reserved example host (RFC 2606) and is skipped on purpose.
    const v = urlFindings(
      'src/lib/api.ts',
      "export const load = () => fetch('https://api.prod-service.io/orders');\n"
    );
    expect(v).toEqual([
      expect.stringContaining(
        'Hardcoded URL detected: https://api.prod-service.io/orders'
      ),
    ]);
  });

  it('a JSX src and an assigned location.href are still reported', () => {
    const v = urlFindings(
      'src/components/banner.tsx',
      [
        "export const go = () => { window.location.href = 'https://pay.prod-service.io/checkout'; };",
        'export const Banner = () => <img src="https://cdn.prod-service.io/banner.png" />;',
        '',
      ].join('\n')
    );
    expect(v.join(' ')).toContain('pay.prod-service.io/checkout');
    expect(v.join(' ')).toContain('cdn.prod-service.io/banner.png');
  });
});

describe('#537 a finding names the file as the project knows it', () => {
  const API =
    "export const load = () => fetch('https://api.prod-service.io/orders');\n";

  it('Environment Security reports the path relative to the project', () => {
    expect(urlFindings('src/lib/api.ts', API)).toEqual([
      'src/lib/api.ts: Hardcoded URL detected: https://api.prod-service.io/orders',
    ]);
  });

  it('a read without a fallback names the relative path too', () => {
    expect(
      securityFindings(
        'src/lib/env.ts',
        'export const base = process.env.API_BASE;\n',
        /without fallback/
      )
    ).toEqual([
      'src/lib/env.ts: Environment variable API_BASE used without fallback',
    ]);
  });

  it('Environment Parity, the second reader of the analyzer, does the same', async () => {
    const result = await EnvironmentParityStandardsLaw.check({
      projectRoot: projectWith('src/lib/api.ts', API),
      config,
    });
    expect(
      (result.violations ?? []).filter(v => /Hardcoded URL/.test(v))
    ).toEqual([
      'src/lib/api.ts: Hardcoded URL detected: https://api.prod-service.io/orders',
    ]);
  });
});
