/**
 * Capacitor Sync Artefacts Match Dependencies judges what git publishes
 * (#638). An untracked artefact, an ignored one, a project outside git and a
 * broken index all passed with "compliance verified — not read: … is not
 * tracked": `tracked()` answered false for every git failure as well.
 *
 * - tracked, or untracked and not ignored: judged;
 * - git-ignored: not judged; all of them ignored is "judged nothing";
 * - git does not answer: judged from the disk, and the result says so.
 */
import fs from 'fs';
import path from 'path';

import { CapacitorSyncArtefactsMatchDependenciesLaw } from '../../../src/checkers/capacitor-laws/capacitor-sync-artefacts-match-dependencies';
import { CAPACITOR_LAWS } from '../../../src/data/capacitor-laws';
import { execFileSync } from '../../../src/utils/child-process';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, removeProjects } from '../toolkit-fixture';
import {
  IGNORING_SHELLS,
  capacitorProject,
  installPackage,
} from './capacitor-fixture';

afterAll(removeProjects);

const GRADLE = 'android/capacitor.settings.gradle';
const PODFILE = 'ios/App/Podfile';
const MISSING_CAMERA =
  /^android\/capacitor\.settings\.gradle: @capacitor\/camera is a dependency with a android\/ directory and is not in this file/;

const settings = (...pkgs: string[]): string =>
  [
    "include ':capacitor-android'",
    "project(':capacitor-android').projectDir = new File('../node_modules/@capacitor/android/capacitor')",
    ...pkgs.flatMap(pkg => [
      `include ':${pkg.replace('@capacitor/', 'capacitor-')}'`,
      `project(':${pkg.replace('@capacitor/', 'capacitor-')}').projectDir = new File('../node_modules/${pkg}/android')`,
    ]),
  ].join('\n');

/** @capacitor/camera ships android/ and is missing from the gradle file. */
function drifted(): string {
  const root = capacitorProject(
    { [GRADLE]: settings() },
    {},
    { '@capacitor/camera': '8.0.0' }
  );
  installPackage(root, '@capacitor/camera', { 'android/build.gradle': '' });
  return root;
}

const git = (root: string, ...args: string[]): void => {
  execFileSync('git', args, { cwd: root, stdio: 'ignore', windowsHide: true });
};

const run = (root: string) =>
  CapacitorSyncArtefactsMatchDependenciesLaw.check(ctx(root, IGNORING_SHELLS));

describe('#638 Capacitor sync artefacts: what git publishes is judged', () => {
  it('control: a tracked artefact is judged', () => {
    const root = drifted();
    git(root, 'init', '-q');
    git(root, 'add', GRADLE);
    const result = run(root);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(MISSING_CAMERA)]);
    expect(result.details).toBeUndefined();
  });

  it('untracked and not ignored (git add -A would publish it): judged like a tracked one', () => {
    const root = drifted();
    git(root, 'init', '-q');
    const result = run(root);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(MISSING_CAMERA)]);
  });

  it('tracked, then listed in .gitignore: still judged, git still publishes it', () => {
    const root = drifted();
    git(root, 'init', '-q');
    git(root, 'add', GRADLE);
    fs.writeFileSync(path.join(root, '.gitignore'), 'android/\n');
    expect(run(root).violations).toEqual([
      expect.stringMatching(MISSING_CAMERA),
    ]);
  });

  it('ignored by git: not judged; with no other artefact the law judged nothing, which is not a pass', () => {
    const root = drifted();
    git(root, 'init', '-q');
    fs.writeFileSync(path.join(root, '.gitignore'), 'android/\n');
    const result = run(root);
    expect(result.passed).toBe(false);
    expect(result.judgedNothing).toBe(true);
    expect(result.score).toBe(0);
    expect(result.message).toBe(
      'Capacitor Sync Artefacts Match Dependencies judged nothing: git ignores android/capacitor.settings.gradle — a clean checkout carries none of them, nothing was judged'
    );
    expect(result.message).not.toContain('verified');
  });

  it('some platforms published, others ignored: only the published ones are judged', () => {
    const root = drifted();
    installPackage(root, '@capacitor/camera', {
      'android/build.gradle': '',
      'ios/Plugin.swift': '',
    });
    fs.mkdirSync(path.join(root, 'ios', 'App'), { recursive: true });
    fs.writeFileSync(path.join(root, PODFILE), "pod 'Capacitor'\n");
    git(root, 'init', '-q');
    fs.writeFileSync(path.join(root, '.gitignore'), 'ios/\n');
    git(root, 'add', GRADLE);
    const result = run(root);
    expect(result.violations).toEqual([expect.stringMatching(MISSING_CAMERA)]);
    expect(result.details).toEqual([
      'not judged, git ignores: ios/App/Podfile',
    ]);
  });

  it('not a git repository: judged from the disk, and the details say so', () => {
    const result = run(drifted());
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(MISSING_CAMERA)]);
    expect(result.details).toEqual([
      `git did not answer, judged from the disk: ${GRADLE}`,
    ]);
  });

  it('tracked, git index broken: judged from the disk, and the details say so', () => {
    const root = drifted();
    git(root, 'init', '-q');
    git(root, 'add', GRADLE);
    fs.writeFileSync(path.join(root, '.git', 'index'), 'not an index');
    const result = run(root);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(MISSING_CAMERA)]);
    expect(result.details).toEqual([
      `git did not answer, judged from the disk: ${GRADLE}`,
    ]);
  });

  it('git did not answer and nothing drifted: passes, without the word "verified"', () => {
    const root = capacitorProject({ [GRADLE]: settings() });
    const result = run(root);
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.message).not.toContain('verified');
    expect(result.message).toContain(
      'git did not answer, judged from the disk'
    );
  });

  it('a tracked artefact under android/** in ignores.global is selected and judged, not dropped', () => {
    const root = drifted();
    git(root, 'init', '-q');
    git(root, 'add', GRADLE);
    const law = CAPACITOR_LAWS.find(
      entry => entry.title === 'Capacitor Sync Artefacts Match Dependencies'
    );
    expect(
      lawRequirementsMet(law?.requires, root, IGNORING_SHELLS.ignores.global)
    ).toBe(true);
    expect(run(root).violations).toEqual([
      expect.stringMatching(MISSING_CAMERA),
    ]);
  });
});
