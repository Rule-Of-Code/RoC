/**
 * Ionic View Lifecycle Interfaces (#144). Red/green from the issue: a hook
 * without its interface, a near-miss name the outlet will never bind, and the
 * names that must NOT be called near misses.
 */
import { IonicViewLifecycleInterfacesLaw as Law } from '../../../src/checkers/ionic-laws/ionic-view-lifecycle-interfaces';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const run = (files: Record<string, string>) =>
  Law.check(ctx(project({ 'package.json': IONIC, ...files })));

describe('IonicViewLifecycleInterfacesLaw', () => {
  it('red: a hook without its interface', () => {
    const result = run({
      'src/app/event.page.ts': [
        'export class EventPage {',
        '  ionViewWillEnter(): void { this.reload(); }',
        '}',
      ].join('\n'),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/event\.page\.ts:2: EventPage\.ionViewWillEnter without `implements ViewWillEnter`/
      ),
    ]);
  });

  it('green: every hook with its interface', () => {
    const result = run({
      'src/app/event.page.ts': [
        "import { ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';",
        'export class EventPage implements ViewWillEnter, ViewWillLeave {',
        '  ionViewWillEnter(): void { this.reload(); }',
        '  ionViewWillLeave(): void { this.stop(); }',
        '}',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it.each([
    ['IonViewWillEnter', 'ionViewWillEnter'],
    ['ionviewwillenter', 'ionViewWillEnter'],
    ['ionViewWillEnterr', 'ionViewWillEnter'],
    ['ionViewDidLeav', 'ionViewDidLeave'],
    ['#ionViewWillEnter', 'ionViewWillEnter'],
  ])('red: %s is a near miss of %s and will never be bound', (name, hook) => {
    const result = run({
      'src/app/a.page.ts': `export class APage {\n  ${name}(): void {}\n}`,
    });
    expect(result.violations).toEqual([
      expect.stringContaining(`APage.${name} looks like \`${hook}\` and will never be bound`),
    ]);
  });

  it('the bound names are never near misses of each other', () => {
    for (const name of [
      'ionViewWillEnter',
      'ionViewDidEnter',
      'ionViewWillLeave',
      'ionViewDidLeave',
      'ionViewWillUnload',
    ]) {
      expect(Law.nearMiss(name)).toBeNull();
    }
  });

  it('a hook named only in a comment or a string is not a member', () => {
    const result = run({
      'src/app/a.page.ts': [
        'export class APage {',
        '  // ionViewWillEnter() {} — moved to the leave handler',
        "  readonly event = 'ionViewWillLeave';",
        '}',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('two classes in one file are judged separately', () => {
    const result = run({
      'src/app/a.page.ts': [
        'export class APage implements ViewWillEnter { ionViewWillEnter() {} }',
        'export class BPage { ionViewWillEnter() {} }',
      ].join('\n'),
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations?.[0]).toContain('BPage.ionViewWillEnter');
  });

  it('specs are not read (they call hooks directly by design)', () => {
    const result = run({
      'src/app/a.page.spec.ts': 'class Fake { ionViewWillEnter() {} }',
    });
    expect(result.violations).toEqual([]);
  });
});
