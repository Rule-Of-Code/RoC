/**
 * #667 — TypeScript 7.0's `typescript` package exports only its version: no
 * `createSourceFile`, `ScriptTarget`, `ScriptKind` or `sys`. Taken as the
 * parser, it crashed 29 laws with "Check failed — Cannot read properties of
 * undefined (reading 'Latest' | 'TSX' | 'readFile')". A package without the
 * compiler API is not used: RoC parses with its own TypeScript and the laws
 * that parsed say so in their details. And from TypeScript 6.0 on `strict`
 * is true when a tsconfig leaves it out, so the strict laws judge an absent
 * `strict` by the project's TypeScript major.
 */
import fs from 'fs';
import path from 'path';

import { DependencyPinningChecker } from '../../src/checkers/dependency-scanning/dependency-pinning-checker';
import { NoDoubleCastLaw } from '../../src/checkers/code-quality-laws/no-double-cast';
import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { ZeroToleranceLaw } from '../../src/checkers/sacred-laws/zero-tolerance';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type { LawCheckContext } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import {
  hasCompilerApi,
  loadTypeScript,
  typeScriptSource,
  typeScriptSourceNote,
} from '../../src/utils/react/tsx-source';
import { makeTempDir } from '../helpers/temp-dirs';

/** A project whose node_modules/typescript is `version`; with `api: false`, the TS 7 shape. */
function project(
  version: string,
  api: boolean,
  files: Record<string, string> = {}
): string {
  const root = makeTempDir('roc-ts667-');
  const pkg = path.join(root, 'node_modules', 'typescript');
  fs.mkdirSync(path.join(pkg, 'lib'), { recursive: true });
  fs.writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify({ name: 'typescript', version, main: 'lib/index.cjs' })
  );
  fs.writeFileSync(
    path.join(pkg, 'lib', 'index.cjs'),
    api
      ? // A package with the API: the one RoC itself runs on, re-exported.
        `module.exports = require(${JSON.stringify(require.resolve('typescript'))});\n`
      : `module.exports = { version: ${JSON.stringify(version)} };\n`
  );
  const all: Record<string, string> = {
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      devDependencies: { typescript: `~${version}` },
    }),
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return root;
}

const context = (root: string): LawCheckContext => ({
  projectRoot: root,
  config: FileUtils.getMinimalDefaultConfig(),
});

type Auditor = {
  executeSingleLaw: (law: unknown) => Promise<{ details?: string[] }>;
};
const auditorFor = (root: string): Auditor => {
  const auditor: unknown = new RuleOfCodeAuditor({}, root);
  return auditor as Auditor;
};

describe('#667 a typescript package without the compiler API is not the parser', () => {
  it('hasCompilerApi: by what the package offers, not its version', () => {
    expect(hasCompilerApi({ version: '7.0.2' })).toBe(false);
    expect(hasCompilerApi(require('typescript'))).toBe(true);
    expect(hasCompilerApi(null)).toBe(false);
  });

  it("TypeScript 7.0's package: RoC parses with its own, and says which", () => {
    const root = project('7.0.2', false);
    const source = typeScriptSource(root);
    expect(source.projectVersion).toBe('7.0.2');
    expect(source.from).toBe('roc');
    expect(hasCompilerApi(loadTypeScript(root))).toBe(true);
    expect(typeScriptSourceNote(root)).toMatch(
      /^project typescript 7\.0\.2 offers no JS API; parsed with RoC's typescript \d+\.\d+\.\d+/
    );
  });

  it('a law that parses runs on a TypeScript 7 project instead of crashing', () => {
    const root = project('7.0.2', false, {
      'src/cast.ts': 'export const a = 1 as unknown as string;\n',
    });
    const result = NoDoubleCastLaw.check(context(root));
    expect(result.violations).toEqual([
      expect.stringContaining('Double cast (as unknown as) in src/cast.ts'),
    ]);
  });

  it('a project typescript that has the API is used, and nothing is said', () => {
    const root = project('5.9.3', true);
    expect(typeScriptSource(root).from).toBe('project');
    expect(typeScriptSourceNote(root)).toBeNull();
  });

  it('the details of a law that parsed name the parser; a law that did not, nothing', async () => {
    const root = project('7.0.2', false);
    const auditor = auditorFor(root);
    const parsed = await auditor.executeSingleLaw({
      id: 'p1',
      name: 'Parses',
      check: () => {
        loadTypeScript(root);
        return { passed: true, violations: [], score: 100 };
      },
    });
    expect(parsed.details).toEqual([
      expect.stringMatching(/^project typescript 7\.0\.2 offers no JS API/),
    ]);
    const other = await auditor.executeSingleLaw({
      id: 'p2',
      name: 'Reads config',
      check: () => ({ passed: true, violations: [], score: 100 }),
    });
    expect(other.details).toBeUndefined();
  });
});

describe('#667 an absent strict is judged by the TypeScript major of the project', () => {
  const tsconfig = JSON.stringify({
    compilerOptions: { moduleResolution: 'bundler', noImplicitAny: true },
  });

  it('TypeScript 6 or 7: strict left out is on — no "strict" finding', () => {
    for (const version of ['6.0.3', '7.0.2']) {
      const root = project(version, false, {
        'tsconfig.json': tsconfig,
        '.eslintrc.json': '{}',
      });
      expect(ZeroToleranceLaw.check(context(root)).violations).toEqual([]);
      expect(
        TypeScriptStrictLaw.check(context(root)).violations ?? []
      ).not.toContain('TypeScript strict mode must be enabled');
      expect(
        TypeScriptStrictLaw.check(context(root)).violations ?? []
      ).not.toContain('TypeScript target must be set, and newer than ES5');
    }
  });

  it('control: TypeScript 5 — strict left out is off, as before', () => {
    const root = project('5.9.3', true, {
      'tsconfig.json': tsconfig,
      '.eslintrc.json': '{}',
    });
    expect(ZeroToleranceLaw.check(context(root)).violations).toEqual([
      'TypeScript strict mode not enabled',
    ]);
    expect(TypeScriptStrictLaw.check(context(root)).violations).toContain(
      'TypeScript strict mode must be enabled'
    );
  });

  it('control: an explicit "strict": false is off on TypeScript 7 too', () => {
    const root = project('7.0.2', false, {
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: false } }),
      '.eslintrc.json': '{}',
    });
    expect(ZeroToleranceLaw.check(context(root)).violations).toContain(
      'TypeScript strict mode not enabled'
    );
  });
});

describe('#667 an npm alias is a version, judged by its range', () => {
  const verdict = (
    version: string
  ): { isViolation: boolean; issue?: string } => {
    const checker: unknown = DependencyPinningChecker;
    return (
      checker as {
        analyzeVersionRange: (v: string) => {
          isViolation: boolean;
          issue?: string;
        };
      }
    ).analyzeVersionRange(version);
  };

  it('an npm alias with a caret range (npm:typescript@^6.0.3) is fine', () => {
    expect(verdict('npm:typescript@^6.0.3').isViolation).toBe(false);
    expect(verdict('npm:@scope/pkg@1.2.3').isViolation).toBe(false);
  });

  it('control: an alias with no range or a wildcard is reported like one', () => {
    expect(verdict('npm:typescript').issue).toMatch(/wildcard or "latest"/);
    expect(verdict('npm:typescript@*').issue).toMatch(/wildcard/);
  });
});
