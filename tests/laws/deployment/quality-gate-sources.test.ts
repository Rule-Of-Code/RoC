/**
 * Where Automated Code Quality Gates looks for a gate, tested where the
 * readers live: package.json scripts, a CI workflow, Jest coverage settings.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  checkAuditScripts,
  checkBuildScripts,
  checkFormattingInPipeline,
  checkLintingInPipeline,
  checkLintingScripts,
  checkPackageJsonForCoverage,
  checkSecurityInPipeline,
} from '../../../src/laws/deployment/quality-gate-sources';
import { makeTempDir, removeTempDirs } from '../../helpers/temp-dirs';

let dir: string;
const write = (file: string, text: string): void => {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
};

beforeEach(() => {
  dir = makeTempDir('quality-gate-sources-');
});
afterEach(removeTempDirs);

describe('package.json scripts', () => {
  it('a script counts by its name or by its command', () => {
    write(
      'package.json',
      JSON.stringify({ scripts: { build: 'tsc', check: 'eslint .' } })
    );
    expect(checkBuildScripts(dir)).toBe(true);
    expect(checkLintingScripts(dir)).toBe(true);
    expect(checkAuditScripts(dir)).toBe(false);
  });

  it('no package.json, or one that is not JSON, has no scripts', () => {
    expect(checkBuildScripts(dir)).toBe(false);
    write('package.json', '{ not json');
    expect(checkLintingScripts(dir)).toBe(false);
  });

  it('Jest coverage collection and thresholds are read from package.json', () => {
    write('package.json', JSON.stringify({ jest: { collectCoverage: true } }));
    expect(checkPackageJsonForCoverage(dir)).toEqual({
      hasCoverageConfig: true,
      hasCoverageThresholds: false,
    });
  });
});

describe('CI pipeline', () => {
  it('a workflow step names the linter and the audit; nothing formats', () => {
    write(
      '.github/workflows/ci.yml',
      'jobs:\n  check:\n    steps:\n      - run: npm run lint\n      - run: npm audit\n'
    );
    expect(checkLintingInPipeline(dir)).toBe(true);
    expect(checkSecurityInPipeline(dir)).toBe(true);
    expect(checkFormattingInPipeline(dir)).toBe(false);
  });

  it('without a CI config no gate runs in a pipeline', () => {
    expect(checkLintingInPipeline(dir)).toBe(false);
  });
});
