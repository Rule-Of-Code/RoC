/**
 * #639: the test discovery of the security testing laws, and of API Testing
 * Standards / Performance Test Requirements, scans with `useConfigFiltering:
 * false`, and that switched off the list of ignored directories as well. A
 * test of a dependency (`node_modules`) or a built copy of a test (`dist`)
 * counted as the project's own: a false PASS.
 *
 * The scan keeps the config allowlist off and leaves out dependency and build
 * directories.
 */
import fs from 'fs';
import path from 'path';

import { SecurityTestingRequirementsLaw } from '../../src/laws/security/security-testing-requirements';
import { SecurityTestContentSearchService } from '../../src/laws/security/security-testing-requirements/services/security-test-content-search.service';
import { SecurityTestFileDiscoveryService } from '../../src/laws/security/security-testing-requirements/services/security-test-file-discovery.service';
import { TestAnalyzerMixin } from '../../src/laws/testing/test-analyzer-mixin';
import type { RuleOfCodeConfig } from '../../src/types';
import { FileUtils } from '../../src/utils';
import { makeTempDir } from '../helpers/temp-dirs';

/** A test that asserts a 401, a CSP header and an XSS case. */
const SECURITY_SPEC = [
  "describe('auth security', () => {",
  "  it('rejects a request without a token with 401', async () => {",
  "    const res = await request(app).get('/orders');",
  '    expect(res.status).toBe(401);',
  '  });',
  "  it('sends a Content-Security-Policy header', async () => {",
  "    const res = await request(app).get('/');",
  "    expect(res.headers['content-security-policy']).toBeDefined();",
  '  });',
  "  it('escapes an XSS payload in the input', () => {",
  "    expect(sanitize('<script>alert(1)</script>')).not.toContain('<script>');",
  '  });',
  '});',
  '',
].join('\n');

function project(testFile: string | null): string {
  const root = makeTempDir('roc-sec639-');
  const write = (rel: string, text: string): void => {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, text);
  };
  // SAST and dependency scanning are configured, so only the test checks decide.
  write('pyproject.toml', '[project]\nname="svc"\nversion="0.1.0"\n');
  write('uv.lock', 'lock = 1\n');
  write(
    '.pre-commit-config.yaml',
    'repos:\n  - repo: local\n    hooks:\n      - id: bandit\n        entry: bandit\n      - id: pip-audit\n        entry: pip-audit\n'
  );
  write('packages/x/src/index.ts', 'export const x = 1;\n');
  if (testFile) write(testFile, SECURITY_SPEC);
  return root;
}

const config = (): RuleOfCodeConfig => {
  const c = FileUtils.getMinimalDefaultConfig();
  c.project.type = 'python';
  return c;
};

const found = (root: string) => ({
  discovered: SecurityTestFileDiscoveryService.analyze(root, config()).hasTests,
  content: SecurityTestContentSearchService.hasTestContent(
    root,
    config(),
    text => text.includes('401')
  ),
});

const DEPENDENCY_OR_BUILD = [
  'packages/x/node_modules/dep/test/auth.spec.ts',
  'packages/x/dist/auth.spec.js',
  'src/node_modules/dep/auth.spec.ts',
];

describe('#639 security testing: a test in node_modules or dist is not the project’s own', () => {
  it('control: no test file — nothing found, the law fails', async () => {
    const root = project(null);
    expect(found(root)).toEqual({ discovered: false, content: false });
    const result = await SecurityTestingRequirementsLaw.check({
      projectRoot: root,
      config: config(),
    });
    expect(result.passed).toBe(false);
  });

  it('control: the project’s own test in packages/x/src — found, the law passes', async () => {
    const root = project('packages/x/src/auth.spec.ts');
    expect(found(root)).toEqual({ discovered: true, content: true });
    const result = await SecurityTestingRequirementsLaw.check({
      projectRoot: root,
      config: config(),
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it.each(DEPENDENCY_OR_BUILD)(
    'the only test at %s is not found, and the law fails',
    async testFile => {
      const root = project(testFile);
      expect(found(root)).toEqual({ discovered: false, content: false });
      const result = await SecurityTestingRequirementsLaw.check({
        projectRoot: root,
        config: config(),
      });
      expect(result.passed).toBe(false);
    }
  );
});

/** The protected discovery of API Testing Standards / Performance Test Requirements. */
class Discovery extends TestAnalyzerMixin {
  static find(dirs: string[]): string[] {
    return this.findTestFilesInDirectories(
      dirs,
      file => /\.spec\.ts$/.test(file),
      config()
    );
  }
}

describe('#639 test-analyzer discovery leaves out node_modules and dist', () => {
  it('finds the project’s spec and not a dependency’s or a build’s', () => {
    const root = makeTempDir('roc-sec639-');
    for (const rel of [
      'src/orders.spec.ts',
      'src/node_modules/dep/dep.spec.ts',
      'src/dist/orders.spec.ts',
    ]) {
      const at = path.join(root, rel);
      fs.mkdirSync(path.dirname(at), { recursive: true });
      fs.writeFileSync(at, "it('x', () => {});\n");
    }
    const files = Discovery.find([path.join(root, 'src')]).map(file =>
      path.relative(root, file).replace(/\\/g, '/')
    );
    expect(files).toEqual(['src/orders.spec.ts']);
  });
});
