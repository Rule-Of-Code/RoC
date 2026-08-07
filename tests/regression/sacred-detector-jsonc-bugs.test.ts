import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AutomationFirstLaw } from '../../src/checkers/sacred-laws/automation-first';
import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { ZeroToleranceLaw } from '../../src/checkers/sacred-laws/zero-tolerance';
import { FileSystemOperations } from '../../src/utils/file-system-operations';
import { FileUtils } from '../../src/utils';

/**
 * Three bugs the SACRED detectors carried, surfaced while authoring their
 * Law-Card metadata.
 *
 * The worst was a DISARMED GATE: TypeScript Strict Mode read tsconfig.json with a
 * plain JSON.parse, which throws on the comments and trailing commas that are
 * valid JSONC and present in nearly every real tsconfig. The throw was swallowed
 * to null, the `if (tsConfig)` guard skipped validation, and the law PASSED a
 * config it never read — reporting strict compliance it never verified. Zero
 * Tolerance failed the opposite way (false failure), and Automation First dropped
 * its build-script violation whenever a format script was present.
 */
describe('SACRED detector bugs — JSONC + fail-closed + nesting', () => {
  let root: string;
  const config = (): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => {
    const c = FileUtils.getMinimalDefaultConfig();
    c.project.type = 'node';
    return c;
  };

  const STRICT_TSCONFIG_JSONC = `{
  // strict everything, as a real editor writes it
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "moduleResolution": "node",
    "sourceMap": true,
  },
}
`;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-sacred-'));
    fs.writeFileSync(path.join(root, 'eslint.config.js'), 'module.exports={};');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('JSONC is parsed, not rejected', () => {
    it('stripJsonComments keeps a "//" that lives inside a string value', () => {
      const parsed = JSON.parse(
        FileSystemOperations.stripJsonComments('{ "url": "https://x.y", }')
      );
      expect(parsed).toEqual({ url: 'https://x.y' });
    });

    it('TypeScript Strict passes a fully-strict tsconfig that has comments', () => {
      fs.writeFileSync(path.join(root, 'tsconfig.json'), STRICT_TSCONFIG_JSONC);
      const result = TypeScriptStrictLaw.check({ projectRoot: root, config: config() });
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });

    it('Zero Tolerance does not falsely flag strict on a commented tsconfig', () => {
      fs.writeFileSync(path.join(root, 'tsconfig.json'), STRICT_TSCONFIG_JSONC);
      const result = ZeroToleranceLaw.check({ projectRoot: root, config: config() });
      const strictish = (result.violations ?? []).filter(v =>
        /strict|noImplicitAny/i.test(v)
      );
      expect(strictish).toEqual([]);
    });
  });

  describe('the disarmed gate is closed', () => {
    it('a NON-strict tsconfig with comments now FAILS (it used to silently pass)', () => {
      fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        '{\n  // not strict\n  "compilerOptions": { "strict": false, }\n}\n'
      );
      const result = TypeScriptStrictLaw.check({ projectRoot: root, config: config() });
      expect(result.passed).toBe(false);
      expect((result.violations ?? []).some(v => /strict/i.test(v))).toBe(true);
    });

    it('a tsconfig that exists but cannot be parsed fails closed, not open', () => {
      fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        '{ "compilerOptions": { broken not json\n'
      );
      const result = TypeScriptStrictLaw.check({ projectRoot: root, config: config() });
      expect(result.passed).toBe(false);
      expect(
        (result.violations ?? []).some(v => /could not be parsed/i.test(v))
      ).toBe(true);
    });
  });

  describe('Automation First checks build independently of format', () => {
    it('flags a missing build script even when a format script is present', () => {
      fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'on: push\n');
      fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({
          name: 'p',
          version: '1.0.0',
          scripts: { test: 'jest', lint: 'eslint .', format: 'prettier -w .' },
          devDependencies: { jest: '^29' },
        })
      );

      const result = AutomationFirstLaw.check({ projectRoot: root, config: config() });
      expect((result.violations ?? []).some(v => /build/i.test(v))).toBe(true);
    });
  });
});
