import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PreDeploymentChecklistLaw } from '../../src/laws/deployment/pre-deployment-checklist';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * A sub-check is not addressable. There is no `laws.notApplicable` entry for
 * "the auth clause of the checklist law", so a project that had declared
 * Authentication Security and Health Check Monitoring inapplicable — with
 * written reasons the audit ACCEPTED — was asked for both again, in a place the
 * waiver could not reach.
 *
 * The audit therefore agreed the project has no authentication surface and
 * nothing to health-check, and demanded both, in the same run.
 */
describe('checklist clauses defer to the law that owns the concern', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const withWaivers = (notApplicable: Record<string, string>): RuleOfCodeConfig => {
    const config = FileUtils.getMinimalDefaultConfig();
    config.laws = { ...config.laws, notApplicable };
    return config;
  };

  const findings = async (config: RuleOfCodeConfig): Promise<string[]> => {
    const result = await PreDeploymentChecklistLaw.check({
      projectRoot: root,
      config,
    });
    return result.violations ?? [];
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-checklist-'));
    write('package.json', '{"name":"site","version":"1.0.0"}');
    // A complete checklist, so the clauses under test are what remains.
    write(
      'PRE_DEPLOYMENT_CHECKLIST.md',
      [
        '# Pre-deployment checklist',
        '',
        '- [ ] Build the artefact',
        '- [ ] Verify the rollback path',
        '- [ ] Confirm recovery steps',
        '- [ ] Smoke-test the deployed site',
      ].join('\n')
    );
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each([
    ['Authentication Security', /Authentication\/authorization/],
    ['Health Check Monitoring', /Health checks not configured/],
    ['Performance Monitoring Standards', /Performance benchmarking/],
    ['Centralized Logging', /Logging not properly configured/],
  ])('a waiver on %s answers its clause here', async (lawName, pattern) => {
    const config = withWaivers({
      [lawName]: 'No such surface: prerendered static site, no server process.',
    });

    expect((await findings(config)).filter(v => pattern.test(v))).toEqual([]);
  });

  it('accepts the slug form of the key, as the rest of the config does', async () => {
    const config = withWaivers({
      'health-check-monitoring': 'No running service to health-check.',
    });

    expect(
      (await findings(config)).filter(v => /Health checks not configured/.test(v))
    ).toEqual([]);
  });

  /** The red controls: a waiver answers ITS clause and nothing else. */
  it('does not silence the other clauses', async () => {
    const config = withWaivers({
      'authentication-security': 'No authentication surface.',
    });

    expect(
      (await findings(config)).some(v => /Health checks not configured/.test(v))
    ).toBe(true);
  });

  it('reports every clause when nothing is waived', async () => {
    const findingsNow = await findings(FileUtils.getMinimalDefaultConfig());

    expect(findingsNow.some(v => /Authentication\/authorization/.test(v))).toBe(
      true
    );
    expect(findingsNow.some(v => /Health checks not configured/.test(v))).toBe(
      true
    );
  });

  /**
   * The checklist clauses are this law's own subject. A waiver on another law
   * cannot answer for the document, and nothing here should suggest otherwise.
   */
  it('still requires the checklist document itself', async () => {
    fs.rmSync(path.join(root, 'PRE_DEPLOYMENT_CHECKLIST.md'));
    const config = withWaivers({
      'authentication-security': 'No authentication surface.',
      'health-check-monitoring': 'No running service.',
      'centralized-logging': 'No server process to log.',
      'performance-monitoring-standards': 'Prerendered, measured externally.',
    });

    expect((await findings(config)).length).toBeGreaterThan(0);
  });

  it('ignores an empty reason — a waiver must say why', async () => {
    const config = withWaivers({ 'health-check-monitoring': '   ' });

    expect(
      (await findings(config)).some(v => /Health checks not configured/.test(v))
    ).toBe(true);
  });
});
