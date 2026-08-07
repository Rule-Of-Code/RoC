/**
 * P6 — Security (bandit-class): eval/exec, insecure deserialization, shell
 * injection, request timeouts, hardcoded secrets. Real temp Python fixtures.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { InsecureDeserializationLaw } from '../../../src/checkers/python-laws/insecure-deserialization';
import { NoEvalExecLaw } from '../../../src/checkers/python-laws/no-eval-exec';
import { NoHardcodedSecretsPythonLaw } from '../../../src/checkers/python-laws/no-hardcoded-secrets-python';
import { NoShellInjectionLaw } from '../../../src/checkers/python-laws/no-shell-injection';
import { RequestsHaveTimeoutLaw } from '../../../src/checkers/python-laws/requests-have-timeout';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const PY = "[project]\nname='x'\n";
const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p6-'));
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
const one = (file: string, code: string): string =>
  fixture({ 'pyproject.toml': PY, [file]: code });

describe('NoEvalExecLaw', () => {
  it('flags eval()/exec()', () => {
    expect(NoEvalExecLaw.check(ctx(one('src/a.py', 'x = eval(user_in)\n'))).passed).toBe(false);
  });
  it('does not flag ast.literal_eval', () => {
    expect(NoEvalExecLaw.check(ctx(one('src/a.py', 'import ast\nx = ast.literal_eval(s)\n'))).passed).toBe(true);
  });
});

describe('InsecureDeserializationLaw', () => {
  it('flags pickle.loads and yaml.load without SafeLoader', () => {
    expect(InsecureDeserializationLaw.check(ctx(one('src/a.py', 'import pickle\nd = pickle.loads(raw)\n'))).passed).toBe(false);
    expect(InsecureDeserializationLaw.check(ctx(one('src/a.py', 'import yaml\nd = yaml.load(s)\n'))).passed).toBe(false);
  });
  it('passes json and yaml.safe_load / SafeLoader', () => {
    expect(InsecureDeserializationLaw.check(ctx(one('src/a.py', 'import json\nd = json.loads(raw)\n'))).passed).toBe(true);
    expect(InsecureDeserializationLaw.check(ctx(one('src/a.py', 'import yaml\nd = yaml.safe_load(s)\n'))).passed).toBe(true);
    expect(InsecureDeserializationLaw.check(ctx(one('src/a.py', 'import yaml\nd = yaml.load(s, Loader=yaml.SafeLoader)\n'))).passed).toBe(true);
  });
});

describe('NoShellInjectionLaw', () => {
  it('flags shell=True and os.system', () => {
    expect(NoShellInjectionLaw.check(ctx(one('src/a.py', 'import subprocess\nsubprocess.run(cmd, shell=True)\n'))).passed).toBe(false);
    expect(NoShellInjectionLaw.check(ctx(one('src/a.py', 'import os\nos.system(cmd)\n'))).passed).toBe(false);
  });
  it('passes an argument list with shell=False (default)', () => {
    expect(NoShellInjectionLaw.check(ctx(one('src/a.py', 'import subprocess\nsubprocess.run(["git", "status"])\n'))).passed).toBe(true);
  });
});

describe('RequestsHaveTimeoutLaw', () => {
  it('flags requests without a timeout', () => {
    expect(RequestsHaveTimeoutLaw.check(ctx(one('src/a.py', 'import requests\nr = requests.get(url)\n'))).passed).toBe(false);
  });
  it('passes requests with timeout', () => {
    expect(RequestsHaveTimeoutLaw.check(ctx(one('src/a.py', 'import requests\nr = requests.get(url, timeout=5)\n'))).passed).toBe(true);
  });
});

describe('NoHardcodedSecretsPythonLaw', () => {
  it('flags a secret assigned to a string literal', () => {
    expect(NoHardcodedSecretsPythonLaw.check(ctx(one('src/a.py', 'API_KEY = "sk_live_abc123XYZ789"\n'))).passed).toBe(false);
  });
  it('exempts env reads, header names, placeholders, URLs and test files', () => {
    expect(NoHardcodedSecretsPythonLaw.check(ctx(one('src/a.py', 'import os\nAPI_KEY = os.getenv("API_KEY")\n'))).passed).toBe(true);
    expect(NoHardcodedSecretsPythonLaw.check(ctx(one('src/a.py', 'API_KEY_HEADER = "X-Api-Key"\n'))).passed).toBe(true);
    expect(NoHardcodedSecretsPythonLaw.check(ctx(one('src/a.py', 'PASSWORD = "changeme"\n'))).passed).toBe(true);
    expect(NoHardcodedSecretsPythonLaw.check(ctx(one('src/a.py', 'TOKEN_URL = "https://auth.example.com/token"\n'))).passed).toBe(true);
    expect(NoHardcodedSecretsPythonLaw.check(ctx(one('tests/test_a.py', 'TOKEN = "sk_test_realish_value"\n'))).passed).toBe(true);
  });
});
