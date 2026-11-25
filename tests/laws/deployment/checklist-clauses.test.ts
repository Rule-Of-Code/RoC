/**
 * The later clauses of Pre-Deployment Checklist, tested where they live:
 * each takes the running score and returns what is left.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  monitoringClauses,
  securityScanClause,
  serviceClauses,
} from '../../../src/laws/deployment/pre-deployment/checklist-clauses';
import { PerformanceValidationChecker } from '../../../src/laws/deployment/pre-deployment/performance-validator';
import { SecurityValidationChecker } from '../../../src/laws/deployment/pre-deployment/security-validator';
import { ctx } from '../../checkers/toolkit-fixture';
import { makeTempDir, removeTempDirs } from '../../helpers/temp-dirs';

let dir: string;

beforeEach(() => {
  dir = makeTempDir('checklist-clauses-');
});
afterEach(removeTempDirs);

describe('securityScanClause', () => {
  it('no scanner anywhere: one violation, and the scan penalty off the score', () => {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const left = securityScanClause(
      dir,
      new SecurityValidationChecker(),
      violations,
      suggestions,
      90
    );
    expect(violations).toEqual([
      'Security vulnerability scanning not configured',
    ]);
    expect(suggestions).toHaveLength(1);
    // The scan clause costs 25 points (PRE_DEPLOYMENT_PENALTY.securityScanning).
    expect(left).toBe(65);
  });

  it('an audit script is a scanner: nothing found, the score untouched', () => {
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { audit: 'npm audit --audit-level=high' } })
    );
    const violations: string[] = [];
    expect(
      securityScanClause(
        dir,
        new SecurityValidationChecker(),
        violations,
        [],
        90
      )
    ).toBe(90);
    expect(violations).toEqual([]);
  });
});

describe('clauses for a project that does not run for users', () => {
  it('authentication, benchmarking, health and logging are not asked', async () => {
    const context = ctx(dir);
    const violations: string[] = [];
    const performanceValidator = new PerformanceValidationChecker();
    let score = await serviceClauses(
      context,
      false,
      {
        securityValidator: new SecurityValidationChecker(),
        performanceValidator,
      },
      violations,
      [],
      100
    );
    score = await monitoringClauses(
      context,
      false,
      performanceValidator,
      violations,
      [],
      score
    );
    expect(violations).toEqual([]);
    expect(score).toBe(100);
  });
});
