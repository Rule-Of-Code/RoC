/**
 * Ionic Scroll Through Ion Content (#263). Both silent failures: a scroll
 * listener on an ion-content that never enables scrollEvents (judged per
 * opening tag), and window-level scrolling in a component that lives inside
 * ion-content (its own template, or placed inside one by a parent).
 */
import { IonicScrollThroughIonContentLaw as Law } from '../../../src/checkers/ionic-laws/ionic-scroll-through-ion-content';
import { removeProjects } from '../toolkit-fixture';
import { component, runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const run = runner(ctx => Law.check(ctx));
const page = (template: string, body = '', head = '') =>
  component('src/app/feed.page.ts', 'FeedPage', { selector: 'app-feed', template, body, head });

describe('IonicScrollThroughIonContentLaw', () => {
  it('red: (ionScroll) without scrollEvents on the same opening tag', () => {
    const result = run(page('<ion-content (ionScroll)="onScroll($event)">\n  <p>x</p>\n</ion-content>'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/feed\.page\.html:1: <ion-content \(ionScroll\)> without \[scrollEvents\]="true"/),
    ]);
  });

  it('red: another ion-content in the file that enables it does not excuse this one', () => {
    const result = run(
      page('<ion-content [scrollEvents]="true" (ionScroll)="a()"></ion-content>\n<ion-content\n  (ionScrollEnd)="b()"\n></ion-content>')
    );
    expect(result.violations).toEqual([expect.stringContaining('feed.page.html:2: <ion-content (ionScrollEnd)>')]);
  });

  it('red: [scrollEvents]="false" is not enabling', () => {
    const result = run(page('<ion-content [scrollEvents]="false" (ionScrollStart)="a()"></ion-content>'));
    expect(result.violations).toHaveLength(1);
  });

  it('green: listeners paired with [scrollEvents]="true" (or the static attribute)', () => {
    const result = run(
      page('<ion-content [scrollEvents]="true" (ionScroll)="a($event)" (ionScrollEnd)="b()"></ion-content>\n<ion-content scrollEvents="true" (ionScroll)="c()"></ion-content>')
    );
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it.each([
    ['window.scrollTo', 'top(): void { window.scrollTo(0, 0); }'],
    ['window.scrollY', 'read(): number { return window.scrollY; }'],
    ['document.scrollingElement', 'read(): unknown { return document.scrollingElement; }'],
    ["fromEvent(window, 'scroll')", "readonly s = fromEvent(window, 'scroll');"],
    ["window.addEventListener('scroll')", "listen(): void { window.addEventListener('scroll', () => undefined); }"],
    ["@HostListener('window:scroll')", "@HostListener('window:scroll') onScroll(): void {}"],
  ])('red: %s in a page with ion-content', (use, body) => {
    const result = run(page('<ion-content><p>x</p></ion-content>', body));
    expect(result.violations).toEqual([expect.stringContaining(`FeedPage uses ${use} but renders inside ion-content`)]);
  });

  it('red: window scroll in a child component placed inside a page\'s ion-content', () => {
    const result = run({
      ...page('<ion-content><app-back-to-top /></ion-content>'),
      ...component('src/app/back-to-top.component.ts', 'BackToTopComponent', {
        selector: 'app-back-to-top',
        template: '<button (click)="top()">top</button>',
        body: 'top(): void { window.scrollTo({ top: 0 }); }',
      }),
    });
    expect(result.violations).toEqual([expect.stringContaining('BackToTopComponent uses window.scrollTo')]);
  });

  it('green: the same window scroll in a component no ion-content surrounds (the window is the scroller)', () => {
    const result = run({
      ...page('<ion-content><p>x</p></ion-content>'),
      ...component('src/app/shell.component.ts', 'ShellComponent', {
        selector: 'app-shell',
        template: '<div class="web-shell"></div>',
        body: 'top(): void { window.scrollTo(0, 0); }',
      }),
    });
    expect(result.violations).toEqual([]);
  });

  it('green: scrolling through IonContent', () => {
    const result = run(
      page('<ion-content #content></ion-content>', '@ViewChild(IonContent) content!: IonContent;\n top(): void { void this.content.scrollToTop(300); }')
    );
    expect(result.violations).toEqual([]);
  });

  it('a listener inside an HTML comment is not a listener', () => {
    const result = run(page('<!-- <ion-content (ionScroll)="a()"> -->\n<ion-content></ion-content>'));
    expect(result.violations).toEqual([]);
  });

  it('control: no ion-content anywhere — nothing to judge, and the result says so', () => {
    const result = run(page('<div>web</div>', 'top(): void { window.scrollTo(0, 0); }'));
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([expect.stringContaining('no <ion-content> in the 1 component template(s) read')]);
  });

  it('cannot read: an inline template built with substitutions is reported, never passed', () => {
    const result = run({
      'src/app/a.component.ts': "import { Component } from '@angular/core';\nconst X = 'p';\n@Component({ selector: 'app-a', template: `<${X}></${X}>` })\nexport class AComponent {}",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('inline template is not a literal')]);
  });
});
