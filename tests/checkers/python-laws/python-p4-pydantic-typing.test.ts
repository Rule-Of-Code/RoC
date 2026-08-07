/**
 * P4 — Pydantic/typing & Python hygiene: BaseSettings config, no mutable default
 * args, no bare except. Real temp Python fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NoBareExceptLaw } from '../../../src/checkers/python-laws/no-bare-except';
import { NoMutableDefaultArgumentsLaw } from '../../../src/checkers/python-laws/no-mutable-default-arguments';
import { SettingsViaBaseSettingsLaw } from '../../../src/checkers/python-laws/settings-via-base-settings';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const PY = "[project]\nname='x'\n";
const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p4-'));
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

describe('SettingsViaBaseSettingsLaw', () => {
  it('flags os.getenv outside the settings module', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/service.py': 'import os\n\nTOKEN = os.getenv("TOKEN")\n',
    });
    expect(SettingsViaBaseSettingsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('allows env access inside the settings module', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/settings.py': 'import os\n\nTOKEN = os.getenv("TOKEN")\n',
      'src/app/service.py': 'from app.settings import Settings\n',
    });
    expect(SettingsViaBaseSettingsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('NoMutableDefaultArgumentsLaw', () => {
  it('flags mutable defaults, including across multi-line signatures', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/u.py': 'def f(items=[]):\n    return items\n\ndef g(\n    cfg={},\n):\n    return cfg\n',
    });
    expect(NoMutableDefaultArgumentsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes None defaults and immutable defaults', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/u.py': 'def f(items=None):\n    items = items or []\n    return items\n\ndef h(x: int = 5, s: str = ""):\n    return x\n',
    });
    expect(NoMutableDefaultArgumentsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('NoBareExceptLaw', () => {
  it('flags bare except and except BaseException', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/e.py': 'try:\n    x()\nexcept:\n    pass\n\ntry:\n    y()\nexcept BaseException:\n    pass\n',
    });
    expect(NoBareExceptLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes specific exceptions and except Exception', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/e.py': 'try:\n    x()\nexcept ValueError:\n    pass\nexcept Exception as e:\n    raise\n',
    });
    expect(NoBareExceptLaw.check(ctx(dir)).passed).toBe(true);
  });
});
