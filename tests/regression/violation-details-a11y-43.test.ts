/**
 * #43, package 5 (accessibility) — Explicit Button Type, Form Control
 * Labeling and Disclosure Control ARIA State count controls on a line
 * ("2 form control(s) … at lines 2, 3", "<ion-input> line 4"). Each control
 * is now one detail in `violationDetails`, at its line, in templates and in
 * JSX. The violation lines are unchanged.
 */
import { DisclosureControlAriaStateLaw } from '../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../src/checkers/accessibility-laws/form-control-labeling';
import type { ViolationDetail } from '../../src/types/law.types';
import {
  ctx,
  manifest,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const T = 'src/app/form.component.html';
const J = 'src/Form.tsx';

const app = (): string =>
  project({
    'package.json': manifest({
      '@angular/core': '20.0.0',
      '@ionic/angular': '8.8.17',
      react: '19.3.0',
    }),
    [T]: [
      '<form>', //                                                                  1
      '  <input type="text" placeholder="Name">', //                                2
      '  <input type="email">', //                                                  3
      '  <ion-input></ion-input>', //                                               4
      '  <button (click)="toggleMenu()">Menu</button>', //                          5
      '  <ion-button (click)="open = !open" aria-expanded="false">More</ion-button>', // 6
      '  <button>Save</button>', //                                                 7
      '</form>',
    ].join('\n'),
    [J]: [
      'export function Form(props: any) {', //                                      1
      '  return (', //                                                              2
      '    <div>', //                                                               3
      '      <input id="email" />', //                                              4
      '      <input />', //                                                         5
      '      <input {...props} />', //                                              6
      '      <button onClick={() => setOpen(o => !o)}>Menu</button>', //            7
      '      <button {...props} onClick={toggleMenu}>More</button>', //             8
      '    </div>',
      '  );',
      '}',
    ].join('\n'),
  });

const places = (details: ViolationDetail[] | undefined): string[] =>
  (details ?? []).map(d => `${d.file}:${d.line} ${d.message}`);

describe('#43 package 5: the a11y laws name each control they counted', () => {
  it('Explicit Button Type: each untyped button, in the template and in JSX', () => {
    const result = ExplicitButtonTypeLaw.check(ctx(app()));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/form\.component\.html: 2 <button> without an explicit type .* at lines 5, 7 /
      ),
      expect.stringMatching(
        /^src\/Form\.tsx: 1 <button> without an explicit type .* at line 7 /
      ),
      expect.stringMatching(
        /^src\/Form\.tsx: 1 <button \{\.\.\.spread\}> with no type written at line 8 /
      ),
    ]);
    expect(places(result.violationDetails)).toEqual([
      `${T}:5 <button> without an explicit type (defaults to submit)`,
      `${T}:7 <button> without an explicit type (defaults to submit)`,
      `${J}:7 <button> without an explicit type (defaults to submit)`,
      `${J}:8 <button {...spread}> with no type written`,
    ]);
  });

  it('Form Control Labeling: each unnamed native and Ionic control, each orphan id, each spread', () => {
    const result = FormControlLabelingLaw.check(ctx(app()));
    expect(result.violations).toHaveLength(5);
    expect(places(result.violationDetails)).toEqual([
      `${T}:2 form control without an accessible label (id / wrapping <label> / aria-label / aria-labelledby)`,
      `${T}:3 form control without an accessible label (id / wrapping <label> / aria-label / aria-labelledby)`,
      `${T}:4 <ion-input> without an accessible name`,
      `${J}:5 form control without an accessible label (<label htmlFor> / wrapping <label> / aria-label / aria-labelledby)`,
      `${J}:4 control id "email" — no htmlFor in this file points at it`,
      `${J}:6 form control with a {...spread} and no label written`,
    ]);
  });

  it('Disclosure Control ARIA State: each toggle without its state, each stale Ionic toggle', () => {
    const result = DisclosureControlAriaStateLaw.check(ctx(app()));
    expect(result.violations).toHaveLength(4);
    expect(places(result.violationDetails)).toEqual([
      `${T}:5 disclosure button toggling a panel/menu without aria-expanded`,
      `${T}:6 aria-expanded on <ion-button> does not follow the state`,
      `${J}:7 disclosure button toggling a panel/menu without aria-expanded`,
      `${J}:8 disclosure button with a {...spread} and no aria-expanded written`,
    ]);
  });
});
