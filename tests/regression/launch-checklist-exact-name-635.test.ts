/**
 * #635: Launch Readiness Checklist matched its checklist by the end of the
 * file name anywhere (`OLD_LAUNCH_CHECKLIST.md` passed), read the quality
 * from the root path instead of the file that matched, and did not accept
 * the LAUNCH_READINESS name its card promises.
 */
import { LaunchReadinessChecklistLaw } from '../../src/laws/deployment/launch-readiness-checklist';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const MISSING = 'Missing launch readiness checklist document';
const MANIFEST = JSON.stringify({
  name: 'x',
  version: '1.0.0',
  scripts: { test: 'jest' },
});
const FULL = [
  '# Launch Checklist',
  '- [x] Testing complete',
  '- [x] Performance benchmark met',
  '- [x] Security review done',
  '- [x] Monitoring ready',
  '- [x] Rollback tested',
  '- [x] Approval obtained',
  '- [x] Backup verified',
  '- [x] Documentation updated',
].join('\n');

const run = (files: Record<string, string>) =>
  LaunchReadinessChecklistLaw.check(
    ctx(project({ 'package.json': MANIFEST, ...files }))
  );

describe('#635 the checklist is found by its whole name', () => {
  it.each([
    ['OLD_LAUNCH_CHECKLIST.md'],
    ['notes/NOT_A_DEPLOYMENT_CHECKLIST.md'],
  ])('%s is not a checklist', file => {
    const result = run({ [file]: '# x\n' });
    expect(result.violations).toContain(MISSING);
    expect(result.passed).toBe(false);
  });

  it.each([
    ['LAUNCH_CHECKLIST.md'],
    ['docs/LAUNCH_CHECKLIST.md'],
    ['packages/app/LAUNCH_CHECKLIST.md'],
    ['LAUNCH_READINESS.md'],
    ['docs/LAUNCH_READINESS.md'],
  ])('%s is a checklist', file => {
    const result = run({ [file]: '# x\n' });
    expect(result.violations).not.toContain(MISSING);
    expect(result.passed).toBe(true);
  });

  it('the quality is read from the file that matched, not from the root', () => {
    const nested = run({ 'packages/app/LAUNCH_CHECKLIST.md': FULL });
    const atRoot = run({ 'LAUNCH_CHECKLIST.md': FULL });
    expect(nested.message).toBe(atRoot.message);
    expect(nested.message).not.toMatch(/basic checklist|minimal checklist/);
  });
});
