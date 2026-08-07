/**
 * Follow-up fixes after BE crypto's v7.3.1 re-pin:
 *   - CRLF root cause: Python checkers handle Windows (CRLF) line endings. The
 *     real Public Docstrings FP on crypto.py:62 was a CRLF file, not the pragma
 *     itself (stripPython/raw splits left a trailing \r that broke `#.*$`).
 *   - Residual Bug4: Absolute Zero Tolerance Doctrine (still checks tsconfig) is
 *     scoped to the typescript stack.
 *   - INIT supports Python as a first-class project type.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectProjectType, generateProConfig } from '../../../src/cli/init-helpers';
import { NoHardcodedSecretsPythonLaw } from '../../../src/checkers/python-laws/no-hardcoded-secrets-python';
import { PublicDocstringsLaw } from '../../../src/checkers/python-laws/public-docstrings';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-crlf-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});
const ctx = (root: string): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'python';
  return { projectRoot: root, config } as never;
};
const crlf = (lines: string[]): string => lines.join('\r\n') + '\r\n';

describe('CRLF line endings (Windows files)', () => {
  it('Public Docstrings passes a documented class with a pragma on a CRLF file', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/c.py': crlf([
        'class KmsEnvelopeCipher:  # pragma: no cover - integration (real KMS)',
        '    """Envelope cipher."""',
        '',
        '    def __init__(self):',
        '        pass',
      ]),
    });
    expect(PublicDocstringsLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('Public Docstrings still flags an undocumented class on a CRLF file', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/c.py': crlf(['class Bare:', '    def __init__(self):', '        pass']),
    });
    expect(PublicDocstringsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('No Hardcoded Secrets flags a secret in a CRLF file', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/s.py': crlf(['API_KEY = "sk_live_abc123XYZ789"']),
    });
    expect(NoHardcodedSecretsPythonLaw.check(ctx(dir)).passed).toBe(false);
  });
});

describe('Residual Bug4 — Absolute Zero Tolerance Doctrine is typescript-scoped', () => {
  it('skips Python, runs on Angular', () => {
    const law = ModularLawsRegistry.getAll().find(
      l => l.name === 'Absolute Zero Tolerance Doctrine'
    );
    expect(law?.stack).toBe('typescript');
    expect(
      ModularLawsRegistry.lawAppliesToProjectType('typescript', 'python')
    ).toBe(false);
    expect(
      ModularLawsRegistry.lawAppliesToProjectType('typescript', 'angular')
    ).toBe(true);
  });
});

describe('INIT supports Python as a first-class project type', () => {
  it('detectProjectType returns python for a pyproject.toml project', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n" });
    expect(detectProjectType(dir)).toBe('python');
  });
  it('generateProConfig produces a python project config', () => {
    const config = generateProConfig({
      projectName: 'svc',
      projectType: 'python',
      componentPrefix: '',
      domain: '',
      lawsMode: 'full',
      paretoMode: false,
    });
    expect(config.project.type).toBe('python');
  });
});
