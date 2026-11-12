/**
 * Fail-closed and fail-open findings QA filed against 7.26.1, fixed in 7.26.2.
 *
 * #295 Commit Size Control: a baseline ref missing from the checkout made
 *      `git log` fail and the catch passed the law (a CI checkout with
 *      fetch-depth 1 has no origin/develop), while its two sibling laws report
 *      "Unable to read git history".
 * #297 React/Next laws walked the tree of a .tsx that TypeScript could not
 *      parse: the code after the syntax error is not in it, so the law passed.
 * #311 Performance Monitoring Policy: the workflow route was dead code and
 *      `.lighthouserc.js` could never count, so a monitored app could pass only
 *      with a vendor file it does not use.
 */
import { execFileSync } from 'child_process';
import { CommitSizeControlLaw } from '../../src/checkers/git-laws/commit-size-control';
import { ReactDangerousHtmlGuardedLaw } from '../../src/checkers/react-laws/react-dangerous-html-guarded';
import { PerformanceAlertingPolicyAnalyzerService as Alerts } from '../../src/laws/performance/performance-monitoring-policy/services/performance-alerting-policy.analyzer';
import { PerformanceAlertsAnalyzerService } from '../../src/laws/performance/performance-monitoring/services/performance-alerts.analyzer';
import { ctx, manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

function gitRepoWithOneBigCommit(): string {
  const files: Record<string, string> = {
    'package.json': manifest({ typescript: '5.6.3' }),
  };
  for (let i = 1; i <= 40; i++) files[`src/f${i}.ts`] = `export const v${i} = ${i};\n`;
  const root = project(files);
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'ignore', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' } });
  git('init', '-q');
  git('checkout', '-q', '-b', 'feature/x');
  git('add', '-A');
  git('commit', '-qm', 'feat: add forty files at once');
  return root;
}

describe('#295 Commit Size Control fails closed when history cannot be read', () => {
  it('a baseline missing from the checkout is a violation, not a pass', () => {
    const root = gitRepoWithOneBigCommit();
    const context = ctx(root, { thresholds: { git: { commitSize: { baseline: 'origin/nope' } } } });
    const result = CommitSizeControlLaw.check(context);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Unable to read git history.*is the baseline 'origin\/nope' in this checkout\?/)])
    );
  });

  it('control: without a baseline the oversized commit is reported', () => {
    const root = gitRepoWithOneBigCommit();
    const result = CommitSizeControlLaw.check(ctx(root));
    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringContaining('1 of the last 1 authored commits exceed the size limit')])
    );
  });
});

describe('#297 a .tsx TypeScript cannot parse is unread, not passed', () => {
  const SINK = [
    "'use client';",
    'export function Sink({ html, n }: { html: string; n: number }) {',
    '  const label = `unterminated template ${n}',
    '  return <div dangerouslySetInnerHTML={{ __html: html }} />;',
    '}',
  ].join('\n');

  it('the law fails and names the file and the syntax error', () => {
    const root = project({
      'package.json': manifest({ react: '19.3.0', 'react-dom': '19.3.0' }),
      'src/Sink.tsx': SINK,
    });
    const result = ReactDangerousHtmlGuardedLaw.check(ctx(root));
    expect(result.passed).toBe(false);
    expect((result.violations ?? []).join('\n')).toMatch(/src\/Sink\.tsx: could not be parsed \(line \d+: Unterminated template literal\.\) — its code was NOT read/);
  });
});

describe('#311 performance alerts: Lighthouse CI assertions and CI workflows count', () => {
  const WORKFLOW = [
    'jobs:',
    '  perf:',
    '    steps:',
    '      - run: npm run lhci',
    '      - name: notify slack on performance regression',
    '        if: failure()',
    '        run: curl -X POST "$SLACK_WEBHOOK" -d "lighthouse performance report failed"',
  ].join('\n');

  it.each([
    ['.lighthouserc.json with assertions', { '.lighthouserc.json': '{"ci":{"assert":{"assertions":{"categories:performance":["error",{"minScore":0.9}]}}}}' }, 'Lighthouse CI assertions (.lighthouserc.json)'],
    ['.lighthouserc.js with assertions', { '.lighthouserc.js': 'module.exports = { ci: { assert: { preset: "lighthouse:recommended" } } };' }, 'Lighthouse CI assertions (.lighthouserc.js)'],
    ['a workflow that checks performance and notifies', { '.github/workflows/ci.yml': WORKFLOW }, 'CI workflow alerts (.github/workflows/ci.yml)'],
    ['newrelic.js with alerts', { 'newrelic.js': 'exports.config = { alert_policy: "p" };' }, 'Newrelic alerts (newrelic.js)'],
  ])('%s', (_label, files, source) => {
    const root = project(files as Record<string, string>);
    expect(Alerts.checkPerformanceAlerting(root).alertSources).toEqual([source]);
    // The sibling law agrees.
    expect(PerformanceAlertsAnalyzerService.checkPerformanceAlerts(root).configured).toBe(true);
  });

  it('control: a workflow that runs lighthouse but notifies nobody is no alert', () => {
    const root = project({ '.github/workflows/ci.yml': 'jobs:\n  perf:\n    steps:\n      - run: npx lhci autorun # lighthouse\n' });
    expect(Alerts.checkPerformanceAlerting(root).hasAlerts).toBe(false);
  });
});
