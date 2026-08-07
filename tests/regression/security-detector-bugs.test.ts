import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { XSSPreventionLaw } from '../../src/checkers/security-laws/xss-prevention';
import { ApiSecurityStandardsLaw } from '../../src/laws/security/api-security-standards';
import { SecurityHeadersConstants } from '../../src/laws/security/api-security/constants';
import { CryptographicLibrariesConfiguration } from '../../src/utils/security/cryptographic-libraries/cryptographic-libraries-configuration';
import { splitLines } from '../../src/utils/security/environment-files/environment-files-configuration';
import { FileUtils } from '../../src/utils';

/**
 * Five bugs in the SECURITY detectors, surfaced while authoring their Law-Card
 * metadata by reading the actual detector code. None was a disarmed gate (all are
 * violations-driven), but each produced garbage or false failures.
 */
describe('SECURITY detector bugs', () => {
  let root: string;
  const angularConfig = (): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => {
    const c = FileUtils.getMinimalDefaultConfig();
    c.project.type = 'angular';
    return c;
  };
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-secbug-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('1. splitLines splits on a real newline, not the literal "\\n"', () => {
    it('splits a multi-line .env into its lines', () => {
      expect(splitLines('A=1\nB=2\r\nC=3')).toEqual(['A=1', 'B=2', 'C=3']);
    });
  });

  describe('2. hasCustomCrypto flags home-rolled crypto, not any "encrypt" mention', () => {
    const custom = (src: string): boolean =>
      CryptographicLibrariesConfiguration.analyzeCryptoPatterns(src).hasCustomCrypto;

    it('does NOT flag a call to a vetted library (tweetnacl)', () => {
      expect(
        custom(
          'import nacl from "tweetnacl";\nexport function decryptToken(t){ return nacl.secretbox.open(t); }'
        )
      ).toBe(false);
    });

    it('does NOT flag WebCrypto (crypto.subtle)', () => {
      expect(
        custom('async function decrypt(b){ return crypto.subtle.decrypt(a, k, b); }')
      ).toBe(false);
    });

    it('DOES flag a hand-rolled XOR cipher', () => {
      expect(
        custom(
          'export function encrypt(s){ let o=""; for(const c of s) o += String.fromCharCode(c.charCodeAt(0) ^ 42); return o; }'
        )
      ).toBe(true);
    });
  });

  describe('3. security headers are checked one by one', () => {
    it('reports exactly the headers that are missing, not all-or-nothing', () => {
      const partial =
        'add_header X-Frame-Options DENY;\nadd_header Content-Security-Policy "default-src \'none\'";';
      const missing = SecurityHeadersConstants.SECURITY_HEADERS.filter(
        h => !SecurityHeadersConstants.hasSpecificHeader(partial, h)
      );
      // Two present, three absent — the loop must see the three, not zero.
      expect(missing).toContain('X-Content-Type-Options');
      expect(missing).toContain('Strict-Transport-Security');
      expect(missing).not.toContain('X-Frame-Options');
    });
  });

  describe('4. XSS sanitizer is required only where HTML is rendered', () => {
    it('does not demand a sanitizer from a component with no HTML sink', () => {
      write('src/foo.component.ts', 'export class Foo { title = "hi"; }');
      const result = XSSPreventionLaw.check({ projectRoot: root, config: angularConfig() });
      expect((result.violations ?? []).some(v => /saniti/i.test(v))).toBe(false);
    });

    it('DOES demand a sanitizer when innerHTML is used without one', () => {
      write('src/foo.component.ts', 'export class Foo { r(el, html){ el.innerHTML = html; } }');
      const result = XSSPreventionLaw.check({ projectRoot: root, config: angularConfig() });
      expect(
        (result.violations ?? []).some(v => /saniti|HTML is rendered/i.test(v))
      ).toBe(true);
    });
  });

  describe('5. rate limiting is required only of a backend surface', () => {
    it('does not fault a pure Angular SPA for missing rate limiting', async () => {
      write('package.json', JSON.stringify({ name: 'a', dependencies: { '@angular/core': '^17' } }));
      write('angular.json', '{}');
      write('src/foo.component.ts', 'export class Foo {}');
      const result = await ApiSecurityStandardsLaw.check({ projectRoot: root, config: angularConfig() });
      expect((result.violations ?? []).some(v => /rate limiting/i.test(v))).toBe(false);
    });

    it('DOES fault an Express backend with no rate limiting', async () => {
      const c = FileUtils.getMinimalDefaultConfig();
      c.project.type = 'node';
      write('package.json', JSON.stringify({ name: 'api', version: '1.0.0' }));
      write('src/server.ts', 'import express from "express";\nconst app = express();\napp.get("/x",(r,s)=>s.send("hi"));');
      const result = await ApiSecurityStandardsLaw.check({ projectRoot: root, config: c });
      expect((result.violations ?? []).some(v => /rate limiting/i.test(v))).toBe(true);
    });
  });
});
