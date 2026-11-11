/**
 * Ionic Gesture Touch Action (#270). A raw pointer gesture inside ion-content
 * must narrow touch-action on its element, its host or ion-content's scroll
 * part; the forms a component binds pointer events in are all read.
 */
import { IonicGestureTouchActionLaw as Law } from '../../../src/checkers/ionic-laws/ionic-gesture-touch-action';
import { removeProjects } from '../toolkit-fixture';
import { component, runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const run = runner(ctx => Law.check(ctx));
const story = (spec: { template?: string; css?: string; body?: string; meta?: string }) =>
  component('src/app/story.page.ts', 'StoryPage', {
    selector: 'app-story',
    template: spec.template ?? '<ion-content class="story"><img src="a.webp" /></ion-content>',
    css: spec.css,
    body: spec.body,
    meta: spec.meta,
  });
const HOST = "host: { '(pointerdown)': 'down($event)', '(pointerup)': 'up($event)' }";

describe('IonicGestureTouchActionLaw', () => {
  it('red: host pointer listeners on a page with ion-content and no touch-action', () => {
    const result = run(story({ meta: HOST, css: '.story { --background: black; }' }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/story\.page\.ts:\d+: StoryPage builds a gesture from pointerdown \+ pointerup inside ion-content, and no touch-action is set/),
    ]);
  });

  it.each([
    ['template bindings', { template: '<ion-content><div class="track" (pointerdown)="d($event)" (pointermove)="m($event)"></div></ion-content>' }],
    ['@HostListener', { body: "@HostListener('pointerdown', ['$event']) d(e: PointerEvent) {}\n@HostListener('document:pointerup') u() {}" }],
    ['addEventListener', { body: "ngOnInit() { this.el.addEventListener('pointerdown', this.d); this.el.addEventListener('pointerup', this.u); }" }],
    ['fromEvent / renderer.listen', { body: "readonly d = fromEvent(this.el, 'pointerdown');\nngOnInit() { this.renderer.listen(this.el, 'pointermove', () => 0); }" }],
  ])('red: pointer events bound through %s', (_label, spec) => {
    expect(run(story(spec)).violations).toHaveLength(1);
  });

  it.each([
    ['::part(scroll) in the page styles', '.story::part(scroll) { touch-action: pan-y; }'],
    [':host in the page styles', ':host { touch-action: pan-y; }'],
  ])('green: touch-action on %s', (_label, css) => {
    const result = run(story({ meta: HOST, css }));
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('green: touch-action on the binding element\'s class, and in a global stylesheet on ion-content::part(scroll)', () => {
    expect(
      run(
        story({
          template: '<ion-content><div class="track" (pointerdown)="d()" (pointerup)="u()"></div></ion-content>',
          css: '.track { touch-action: pan-y; }',
        })
      ).violations
    ).toEqual([]);
    expect(
      run({ ...story({ meta: HOST }), 'src/styles.scss': 'ion-content::part(scroll) { touch-action: pan-y pinch-zoom; }' }).violations
    ).toEqual([]);
  });

  it('red: touch-action: auto is the default, not a choice; and a rule only in a comment does not count', () => {
    expect(run(story({ meta: HOST, css: ':host { touch-action: auto; }' })).violations).toHaveLength(1);
    expect(run(story({ meta: HOST, css: '/* :host { touch-action: pan-y; } */' })).violations).toHaveLength(1);
  });

  it('red: a child component placed inside a page\'s ion-content', () => {
    const result = run({
      ...component('src/app/home.page.ts', 'HomePage', { selector: 'app-home', template: '<ion-content><app-carousel /></ion-content>' }),
      ...component('src/app/carousel.component.ts', 'CarouselComponent', { selector: 'app-carousel', template: '<div></div>', meta: HOST }),
    });
    expect(result.violations).toEqual([expect.stringContaining('CarouselComponent builds a gesture')]);
  });

  it('green: pointerdown alone is not a gesture, and a component outside any ion-content is not judged', () => {
    expect(run(story({ meta: "host: { '(pointerdown)': 'focus()' }" })).violations).toEqual([]);
    expect(
      run(component('src/app/web.component.ts', 'WebComponent', { selector: 'app-web', template: '<div></div>', meta: HOST })).violations
    ).toEqual([]);
  });

  it('createGesture elsewhere in the component does not excuse its raw pointer handlers', () => {
    const result = run(story({ meta: HOST, body: 'ngOnInit() { createGesture({ el: this.el, gestureName: "x", onMove: () => 0 }).enable(); }' }));
    expect(result.violations).toHaveLength(1);
  });

  it('cannot read: an unreadable templateUrl is reported, never passed', () => {
    const result = run({
      'src/app/a.page.ts': "import { Component } from '@angular/core';\n@Component({ selector: 'app-a', templateUrl: './gone.html' })\nexport class APage {}",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining("'./gone.html' could not be read")]);
  });
});
