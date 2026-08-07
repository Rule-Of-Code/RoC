/**
 * v7.2.3: Angular Signal Adoption escalates the clearest case to a violation —
 * Subject/BehaviorSubject used for component-local state in *.component.ts on
 * Angular 16+ (opt-out via thresholds.angular.enforceSignalsForComponentState).
 * Services, pre-16 projects, and components already using signals are not flagged.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AngularSignalAdoptionLaw } from '../../../src/checkers/angular-laws/angular-signal-adoption';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(ngVersion: string, files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-sigad-'));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ dependencies: { '@angular/core': ngVersion } })
  );
  fs.writeFileSync(path.join(dir, 'angular.json'), '{}');
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
const COMP_SUBJECT = `import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
@Component({ selector: 'app-o', template: '' })
export class OComponent { private count = new BehaviorSubject(0); inc() { this.count.next(1); } }
`;
function ctx(root: string, enforce?: boolean): LawCheckContext {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'angular';
  config.includes!.global = ['**/*.ts'];
  config.ignores!.global = ['**/node_modules/**'];
  if (enforce !== undefined) {
    config.thresholds = {
      angular: { enforceSignalsForComponentState: enforce },
    };
  }
  return { projectRoot: root, config } as never;
}
const hasStateViolation = (r: { violations?: string[] }): boolean =>
  (r.violations ?? []).some(v => v.includes('component-local state'));

describe('Angular Signal Adoption enforcement (v7.2.3)', () => {
  it('flags Subject component-state on Angular 16+', () => {
    const dir = fixture('18.0.0', { 'src/app/o.component.ts': COMP_SUBJECT });
    expect(hasStateViolation(AngularSignalAdoptionLaw.check(ctx(dir)))).toBe(
      true
    );
  });

  it('does NOT flag on pre-16 Angular (signals unavailable)', () => {
    const dir = fixture('14.0.0', { 'src/app/o.component.ts': COMP_SUBJECT });
    expect(hasStateViolation(AngularSignalAdoptionLaw.check(ctx(dir)))).toBe(
      false
    );
  });

  it('does NOT flag a service using a Subject', () => {
    const dir = fixture('18.0.0', {
      'src/app/x.service.ts': `import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
@Injectable() export class XService { private s = new BehaviorSubject(0); }
`,
    });
    expect(hasStateViolation(AngularSignalAdoptionLaw.check(ctx(dir)))).toBe(
      false
    );
  });

  it('respects the opt-out config knob', () => {
    const dir = fixture('18.0.0', { 'src/app/o.component.ts': COMP_SUBJECT });
    expect(
      hasStateViolation(AngularSignalAdoptionLaw.check(ctx(dir, false)))
    ).toBe(false);
  });
});
