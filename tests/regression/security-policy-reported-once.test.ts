/**
 * #439 — Security Vulnerability Response asked for the security policy in
 * two analyzers: SecurityPolicyChecker ("No security policy documentation
 * found") and the security documentation list ("Missing Security Policy
 * documentation", and again "Missing Security Documentation documentation"
 * for docs/SECURITY.md). One missing SECURITY.md was three findings, and a
 * SECURITY.md at the root still left "Security Documentation" missing.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { SecurityVulnerabilityResponseLaw } from '../../src/checkers/security-laws/security-vulnerability-response';
import { FileUtils } from '../../src/utils/file-utils';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function policyFindings(files: Record<string, string>): string[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-439-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'sec-439', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  const { violations = [] } = SecurityVulnerabilityResponseLaw.check({
    projectRoot: dir,
    config: FileUtils.getMinimalDefaultConfig(),
  });
  return violations.filter(v => /security (policy|documentation)/i.test(v));
}

const POLICY = '# Security Policy\n\n## Reporting Security Vulnerabilities\n';

describe('#439 the security policy is one requirement, one finding', () => {
  it('a missing SECURITY.md is reported once', () => {
    expect(policyFindings({})).toEqual([
      'No security policy documentation found',
    ]);
  });

  it.each(['SECURITY.md', '.github/SECURITY.md', 'docs/SECURITY.md'])(
    'SECURITY.md in %s satisfies it, nothing else is asked',
    location => {
      expect(policyFindings({ [location]: POLICY })).toEqual([]);
    }
  );
});

describe('#428 the privacy policy is asked for only where users reach the code', () => {
  const privacyFinding = (
    manifest: Record<string, unknown>
  ): string | undefined => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-428-'));
    made.push(dir);
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'privacy-428', version: '1.0.0', ...manifest })
    );
    fs.writeFileSync(path.join(dir, 'SECURITY.md'), POLICY);
    const { violations = [] } = SecurityVulnerabilityResponseLaw.check({
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    return violations.find(v => v.includes('Privacy Policy'));
  };

  it('a command-line tool with no web surface, API or app is not asked', () => {
    expect(
      privacyFinding({
        bin: { tool: 'dist/cli.js' },
        dependencies: { commander: '^12.0.0' },
      })
    ).toBeUndefined();
  });

  it.each([
    ['a web surface', { 'react-dom': '^18.0.0' }],
    ['an HTTP API', { express: '^4.0.0' }],
    ['a mobile app', { '@capacitor/core': '^6.0.0' }],
  ])(
    '%s without a privacy policy is still asked (control)',
    (_kind, dependencies) => {
      expect(privacyFinding({ dependencies })).toBe(
        'Missing Privacy Policy documentation'
      );
    }
  );
});

describe('#428 a deployed service is still asked for a privacy policy', () => {
  it('a Procfile web process (bare node, no framework dependency)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-428p-'));
    made.push(dir);
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'svc-428', version: '1.0.0' })
    );
    fs.writeFileSync(path.join(dir, 'Procfile'), 'web: node server.js\n');
    fs.writeFileSync(path.join(dir, 'SECURITY.md'), POLICY);
    const { violations = [] } = SecurityVulnerabilityResponseLaw.check({
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    expect(violations).toContain('Missing Privacy Policy documentation');
  });
});
