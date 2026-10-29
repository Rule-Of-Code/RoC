/**
 * Ionic Navigation Specs Mount The Outlet (#151): a spec that asserts the URL
 * without the outlet is green whatever the outlet shows.
 */
import { IonicNavigationSpecsMountTheOutletLaw as Law } from '../../../src/checkers/ionic-laws/ionic-navigation-specs-mount-the-outlet';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const OUTLET = {
  'src/app/app.component.html': '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
};
const run = (files: Record<string, string>) =>
  Law.check(ctx(project({ 'package.json': IONIC, ...OUTLET, ...files })));

describe('IonicNavigationSpecsMountTheOutletLaw', () => {
  it('red: a spec asserting router.url through RouterTestingHarness, no outlet', () => {
    const result = run({
      'src/app/session.spec.ts': [
        "it('lands on events', async () => {",
        "  await harness.navigateByUrl('/events');",
        "  expect(router.url).toBe('/events');",
        '});',
        'const harness = await RouterTestingHarness.create();',
      ].join('\n'),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /session\.spec\.ts: asserts navigation through router\.url, RouterTestingHarness without mounting ion-router-outlet/
      ),
    ]);
  });

  it('green: a host with the real outlet', () => {
    const result = run({
      'src/app/session.spec.ts': [
        "@Component({ template: '<ion-app><ion-router-outlet /></ion-app>', imports: [IonApp, IonRouterOutlet] })",
        'class Host {}',
        "expect(router.url).toBe('/events');",
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('a spec that does not assert navigation is not read', () => {
    expect(run({ 'src/app/a.spec.ts': 'expect(sum(1, 2)).toBe(3);' }).violations).toEqual([]);
  });

  it('an outlet named only in a comment does not count', () => {
    const result = run({
      'src/app/a.spec.ts': "// TODO mount <ion-router-outlet>\nexpect(location.path()).toBe('/x');",
    });
    expect(result.violations).toHaveLength(1);
  });

  it('browser specs are left to the e2e law', () => {
    const result = run({
      'e2e/nav.spec.ts': "expect(router.url).toBe('/x');",
      'src/app/nav.e2e.spec.ts': "expect(router.url).toBe('/x');",
    });
    expect(result.violations).toEqual([]);
  });

  it('without an outlet it passes and says so', () => {
    const result = Law.check(
      ctx(project({ 'package.json': IONIC, 'src/app/a.spec.ts': 'expect(router.url).toBe("/");' }))
    );
    expect(result.passed).toBe(true);
    expect(result.message).toContain('no <ion-router-outlet>');
  });
});
