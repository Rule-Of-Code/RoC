/**
 * Ionic Fixed Content In Fixed Slot (#271). ion-fab inside the scroller
 * (reliable), and floating UI found by class pattern plus CSS position
 * (heuristic, thresholds.ionic.fixedContentPattern).
 */
import { IonicFixedContentInFixedSlotLaw as Law } from '../../../src/checkers/ionic-laws/ionic-fixed-content-in-fixed-slot';
import { removeProjects } from '../toolkit-fixture';
import { component, runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const run = runner(ctx => Law.check(ctx));
const TOAST_CSS = '.toast { position: absolute; left: 16px; right: 16px; bottom: 24px; }';
const page = (template: string, css = TOAST_CSS) =>
  component('src/app/share.page.ts', 'SharePage', { selector: 'app-share', template, css });

describe('IonicFixedContentInFixedSlotLaw', () => {
  it('red: ion-fab as a direct child of ion-content without slot="fixed"', () => {
    const result = run(page('<ion-content>\n  <ion-fab vertical="bottom" horizontal="end"></ion-fab>\n</ion-content>'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/share\.page\.html:2: <ion-fab> is a direct child of <ion-content> without slot="fixed"/),
    ]);
  });

  it('red: ion-fab nested deeper in the scroller (it cannot be slotted from there)', () => {
    const result = run(page('<ion-content><div class="wrap"><ion-fab></ion-fab></div></ion-content>'));
    expect(result.violations).toEqual([expect.stringContaining("<ion-fab> is nested inside ion-content's scroller")]);
  });

  it('green: ion-fab in the fixed slot, also through ng-container / control flow', () => {
    const result = run(
      page('<ion-content>\n  @if (open) {\n  <ng-container><ion-fab slot="fixed"></ion-fab></ng-container>\n  }\n</ion-content>')
    );
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: a positioned toast inside the content wrapper', () => {
    const result = run(page('<ion-content>\n  <div class="stage">\n    <p class="toast" role="status">Copied</p>\n  </div>\n</ion-content>'));
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/share\.page\.html:3: <p class="toast"> is positioned as floating UI \(src\/app\/share\.page\.css:1\)/),
    ]);
  });

  it('green: the toast as a direct child of ion-content with slot="fixed", and ion-toast (an overlay)', () => {
    const result = run(
      page('<ion-content>\n  <div class="stage"></div>\n  <p class="toast" slot="fixed">Copied</p>\n  <ion-toast class="toast" message="x"></ion-toast>\n</ion-content>')
    );
    expect(result.violations).toEqual([]);
  });

  it('a toast-named class the CSS does not position, or a positioned class that is not floating UI, is not reported', () => {
    expect(run(page('<ion-content><p class="toast">x</p></ion-content>', '.toast { color: red; }')).violations).toEqual([]);
    expect(
      run(page('<ion-content><span class="badge">x</span></ion-content>', '.badge { position: absolute; top: 0; }')).violations
    ).toEqual([]);
  });

  it('red: floating UI in a child component placed inside the scroller', () => {
    const result = run({
      ...page('<ion-content><app-notice /></ion-content>'),
      ...component('src/app/notice.component.ts', 'NoticeComponent', {
        selector: 'app-notice',
        template: '<p class="toast">Saved</p>',
      }),
    });
    expect(result.violations).toEqual([expect.stringContaining('src/app/notice.component.html:1: <p class="toast">')]);
  });

  it('green: the same child placed in the fixed slot', () => {
    const result = run({
      ...page('<ion-content><app-notice slot="fixed" /></ion-content>'),
      ...component('src/app/notice.component.ts', 'NoticeComponent', { selector: 'app-notice', template: '<p class="toast">Saved</p>' }),
    });
    expect(result.violations).toEqual([]);
  });

  it('thresholds.ionic.fixedContentPattern replaces the default pattern', () => {
    const template = '<ion-content><div class="snack-note">x</div></ion-content>';
    const css = '.snack-note { position: fixed; bottom: 0; }';
    expect(run(page(template, css)).violations).toEqual([]);
    expect(run(page(template, css), { thresholds: { ionic: { fixedContentPattern: 'snack' } } }).violations).toHaveLength(1);
  });

  it('cannot read: an invalid fixedContentPattern is reported, never replaced by the default', () => {
    const result = run(page('<ion-content></ion-content>'), { thresholds: { ionic: { fixedContentPattern: '(' } } });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('is not a valid regular expression')]);
  });

  it('cannot read: an unreadable templateUrl is reported, never passed', () => {
    const result = run({
      'src/app/a.page.ts': "import { Component } from '@angular/core';\n@Component({ selector: 'app-a', templateUrl: './gone.html' })\nexport class APage {}",
    });
    expect(result.passed).toBe(false);
  });
});
