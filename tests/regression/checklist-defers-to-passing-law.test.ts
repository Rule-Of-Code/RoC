import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PreDeploymentChecklistLaw } from '../../src/laws/deployment/pre-deployment-checklist';
import { CentralizedLoggingLaw } from '../../src/checkers/code-quality-laws/centralized-logging';
import { owningLawSatisfied } from '../../src/utils/owning-law';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * The other half of #96.
 *
 * That fix made a checklist sub-check defer to an adopter's written
 * `notApplicable` — which settles the case where the concern does not exist.
 * This settles the better case: the concern exists, the project meets it, the
 * law that owns it says so, and the checklist disagrees anyway.
 *
 * Left unfixed it rewards the wrong move — waive a law you PASS, purely so a
 * different law stops reporting it.
 */
describe('a checklist clause defers to the law that owns its concern', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const config = (): RuleOfCodeConfig => FileUtils.getMinimalDefaultConfig();

  const loggingFinding = async (): Promise<string[]> => {
    const result = await PreDeploymentChecklistLaw.check({
      projectRoot: root,
      config: config(),
    });
    return (result.violations ?? []).filter(v =>
      /Logging not properly configured/.test(v)
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-defer-'));
    write('package.json', '{"name":"site","version":"1.0.0"}');
    write(
      'PRE_DEPLOYMENT_CHECKLIST.md',
      [
        '# Pre-deployment checklist',
        '',
        '- [ ] Build the artefact',
        '- [ ] Verify the rollback path',
        '- [ ] Confirm recovery steps',
      ].join('\n')
    );
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** A project that genuinely satisfies Centralized Logging. */
  const withRealLogging = (): void => {
    write(
      'src/app/logger.service.ts',
      [
        "import { Injectable } from '@angular/core';",
        '',
        '@Injectable({ providedIn: "root" })',
        'export class LoggerService {',
        '  info(message: string): void { this.write("info", message); }',
        '  warn(message: string): void { this.write("warn", message); }',
        '  error(message: string): void { this.write("error", message); }',
        '  private write(level: string, message: string): void {',
        '    globalThis.console[level](message);',
        '  }',
        '}',
      ].join('\n')
    );
  };

  it('says nothing when the owning law passes', async () => {
    withRealLogging();

    const owning = await CentralizedLoggingLaw.check({
      projectRoot: root,
      config: config(),
    });
    // The premise of the test, asserted rather than assumed.
    expect(owning.passed).toBe(true);

    expect(await loggingFinding()).toEqual([]);
  });

  /**
   * A project that genuinely FAILS Centralized Logging: a bare `console.*`
   * outside the one file where the law allows it.
   */
  const withUngatedConsole = (): void => {
    write(
      'src/app/thing.ts',
      'export function thing(): void {\n  console.log("straight to the console");\n}\n'
    );
  };

  /** The red control: the owning law failing is still a finding here. */
  it('still reports when the owning law does not pass', async () => {
    withUngatedConsole();

    const owning = await CentralizedLoggingLaw.check({
      projectRoot: root,
      config: config(),
    });
    expect(owning.passed).toBe(false);

    expect((await loggingFinding()).length).toBeGreaterThan(0);
  });

  /** #96's behaviour must survive: a written waiver still answers. */
  it('still accepts a written waiver', async () => {
    // The owning law must FAIL here, or the waiver proves nothing: without an
    // ungated console the clause would be silent either way.
    withUngatedConsole();
    expect((await loggingFinding()).length).toBeGreaterThan(0);

    const waived = FileUtils.getMinimalDefaultConfig();
    waived.laws = {
      ...waived.laws,
      notApplicable: { 'centralized-logging': 'No server process to log.' },
    };

    const result = await PreDeploymentChecklistLaw.check({
      projectRoot: root,
      config: waived,
    });

    expect(
      (result.violations ?? []).filter(v =>
        /Logging not properly configured/.test(v)
      )
    ).toEqual([]);
  });

  /**
   * Every concern must be REACHABLE, not just the one that was reported.
   *
   * The first version of this deferral consulted the owning law synchronously.
   * Two of the four owning laws answer asynchronously, so for those it always
   * returned "not satisfied" and the deferral could never fire — a fix that
   * worked for half the cases and said nothing about the other half. This test
   * exists so that cannot happen again quietly.
   */
  describe('every concern the checklist defers on can be consulted', () => {
    it.each([
      ['Authentication Security'],
      ['Health Check Monitoring'],
      ['Performance Monitoring Standards'],
      ['Centralized Logging'],
    ])('%s answers a real verdict, not a default', async lawName => {
      withRealLogging();

      const answer = await owningLawSatisfied(
        { projectRoot: root, config: config() },
        lawName
      );

      expect(typeof answer).toBe('boolean');
    });

    it('at least one owning law answers true on a project that satisfies it', async () => {
      withRealLogging();

      expect(
        await owningLawSatisfied(
          { projectRoot: root, config: config() },
          'Centralized Logging'
        )
      ).toBe(true);
    });

    it('a law nobody owns is never satisfied by default', async () => {
      expect(
        await owningLawSatisfied(
          { projectRoot: root, config: config() },
          'No Such Law At All'
        )
      ).toBe(false);
    });
  });

  /**
   * The checklist document remains this law's own subject. No amount of
   * deferring to other laws can answer for it.
   */
  it('still requires the checklist document itself', async () => {
    withRealLogging();
    fs.rmSync(path.join(root, 'PRE_DEPLOYMENT_CHECKLIST.md'));

    const result = await PreDeploymentChecklistLaw.check({
      projectRoot: root,
      config: config(),
    });

    expect((result.violations ?? []).length).toBeGreaterThan(0);
  });
});
