/**
 * Ionic Leave Cancels What Enter Started (#146). The destroy idioms are
 * deliberately NOT credited: on a held page they are the false green.
 */
import { IonicLeaveCancelsWhatEnterStartedLaw as Law } from '../../../src/checkers/ionic-laws/ionic-leave-cancels-what-enter-started';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const run = (body: string[]) =>
  Law.check(
    ctx(
      project({
        'package.json': IONIC,
        'src/app/feed.page.ts': ['export class FeedPage {', ...body, '}'].join('\n'),
      })
    )
  );

describe('IonicLeaveCancelsWhatEnterStartedLaw', () => {
  it('red: an interval started on enter, cleared only in ngOnDestroy', () => {
    const result = run([
      '  ionViewWillEnter() { this.poll = setInterval(() => this.refresh(), 5000); }',
      '  ngOnDestroy() { clearInterval(this.poll); }',
    ]);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/feed\.page\.ts:2: FeedPage starts setInterval in ionViewWillEnter/),
    ]);
  });

  it('red: takeUntilDestroyed is not credited', () => {
    const result = run([
      '  ngOnInit() { this.svc.ticks$.pipe(takeUntilDestroyed(this.ref)).subscribe(); }',
    ]);
    expect(result.violations).toEqual([expect.stringContaining('starts .subscribe in ngOnInit')]);
  });

  it('red: a timer in an effect with onCleanup (the incident)', () => {
    const result = run([
      '  readonly redirect = effect(onCleanup => {',
      '    const t = setTimeout(() => this.go(), 1500);',
      '    onCleanup(() => clearTimeout(t));',
      '  });',
    ]);
    expect(result.violations).toEqual([expect.stringContaining('starts setTimeout in an effect()')]);
  });

  it('green: the leave hook as a method', () => {
    const result = run([
      '  ionViewWillEnter() { this.poll = setInterval(() => this.refresh(), 5000); }',
      '  ionViewWillLeave() { clearInterval(this.poll); }',
    ]);
    expect(result.violations).toEqual([]);
  });

  it('green: the leave hook as a host listener', () => {
    const result = run([
      "  constructor() { this.renderer.listen(this.host, 'ionViewWillLeave', () => this.cancel()); setTimeout(() => this.go(), 1500); }",
    ]);
    expect(result.violations).toEqual([]);
  });

  it('a leave hook named only in a comment does not count', () => {
    const result = run([
      '  // ionViewWillLeave() would clear this',
      '  ionViewWillEnter() { setTimeout(() => this.go(), 10); }',
    ]);
    expect(result.violations).toHaveLength(1);
  });

  it('a page that starts nothing passes', () => {
    expect(run(['  ionViewWillEnter() { this.load(); }']).violations).toEqual([]);
  });
});
