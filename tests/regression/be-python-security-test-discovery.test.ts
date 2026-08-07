import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SecurityTestingRequirementsLaw } from '../../src/laws/security/security-testing-requirements';
import { SecurityTestFileDiscoveryService } from '../../src/laws/security/security-testing-requirements/services/security-test-file-discovery.service';
import { FileUtils } from '../../src/utils';

/**
 * Regression: the third Node-blind detector a backend consumer reported.
 *
 * `security-test-file-discovery` scanned .ts/.tsx/.js/.jsx only, so a Python
 * security test could not be found BY CONSTRUCTION — both security-testing laws
 * were impassable for every Python consumer, whatever they had written. And the
 * filename patterns wanted "security" or "auth" IN THE NAME, while BE's headers
 * and 401/403 assertions live in `tests/api/test_api_core.py`.
 *
 * A law that recognises evidence only by its filename is a law about naming.
 */
describe('a backend consumer: Python security tests are discoverable (v7.9.2)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const pythonProject = (): void => {
    write('pyproject.toml', '[project]\nname="svc"\nversion="0.1.0"\n');
    write('api/app.py', 'def app():\n    return 1\n');
  };

  /** BE's actual file: named test_api_core.py, no "security" anywhere in it. */
  const beSecurityTests = (): void => {
    write(
      'tests/api/test_api_core.py',
      [
        'def test_security_headers(client):',
        '    resp = client.get("/health")',
        '    assert resp.headers["Strict-Transport-Security"].startswith("max-age=")',
        '    assert resp.headers["X-Content-Type-Options"] == "nosniff"',
        '    assert resp.headers["X-Frame-Options"] == "DENY"',
        '    assert resp.headers["Content-Security-Policy"] == "default-src \'none\'"',
        '',
        'def test_requires_auth(client):',
        '    resp = client.get("/orders")',
        '    assert resp.status_code == 401',
        '',
        'def test_rejects_bad_payload(client):',
        '    resp = client.post("/orders", json={"qty": "abc"})',
        '    assert resp.status_code == 400',
        '',
      ].join('\n')
    );
  };

  const gate = (): void => {
    write('uv.lock', 'lock = 1\n');
    write(
      '.pre-commit-config.yaml',
      'repos:\n  - repo: local\n    hooks:\n      - id: bandit\n        entry: bandit\n      - id: pip-audit\n        entry: pip-audit\n'
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-pysec-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('discovers a Python security test whose NAME does not say "security"', () => {
    pythonProject();
    beSecurityTests();

    const result = SecurityTestFileDiscoveryService.analyze(
      root,
      FileUtils.getMinimalDefaultConfig()
    );

    expect(result.hasTests).toBe(true);
    expect(result.testFiles.join('|')).toContain('test_api_core.py');
  });

  it('does not count a plain unit test as a security test', () => {
    pythonProject();
    write('tests/test_math.py', 'def test_adds():\n    assert 1 + 1 == 2\n');

    // Content evidence, not merely "is a .py test file".
    expect(
      SecurityTestFileDiscoveryService.analyze(
        root,
        FileUtils.getMinimalDefaultConfig()
      ).hasTests
    ).toBe(false);
  });

  it('passes the whole law for a Python project that genuinely has them', async () => {
    pythonProject();
    beSecurityTests();
    gate();

    const config = FileUtils.getMinimalDefaultConfig();
    config.project.type = 'python';

    const result = await SecurityTestingRequirementsLaw.check({
      projectRoot: root,
      config,
    });

    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('still fails a Python project that has none of it', async () => {
    // Not an exemption. The law must remain a law.
    pythonProject();

    const config = FileUtils.getMinimalDefaultConfig();
    config.project.type = 'python';

    const result = await SecurityTestingRequirementsLaw.check({
      projectRoot: root,
      config,
    });

    expect(result.passed).toBe(false);
    expect(result.violations ?? []).toContain(
      'No dedicated security test cases found'
    );
  });
});
