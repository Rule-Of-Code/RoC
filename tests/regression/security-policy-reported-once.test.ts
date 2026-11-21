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
