/**
 * IonicUniqueUrlKeyPerView (#148): red/green from the issue, plus the rule
 * every outlet law shares — in a project that does not mount
 * ion-router-outlet it passes and SAYS the URL-keyed stack does not exist.
 */
import { IonicUniqueUrlKeyPerViewLaw } from '../../../src/checkers/ionic-laws/ionic-unique-url-key-per-view';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const OUTLET = {
  'src/app/app.component.ts':
    "@Component({ template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>' })\nexport class AppComponent {}",
};
const withOutlet = (files: Record<string, string>) =>
  ctx(project({ 'package.json': IONIC, ...OUTLET, ...files }));

describe('IonicUniqueUrlKeyPerViewLaw without an ion-router-outlet', () => {
  const law = IonicUniqueUrlKeyPerViewLaw;

  it('passes and says the URL-keyed stack does not exist here', () => {
    const result = law.check(
      ctx(
        project({
          'package.json': IONIC,
          'src/main.ts': 'bootstrapApplication(App, { providers: [provideRouter(routes)] });',
          'src/app/a.ts': "router.navigate(['/x'], { skipLocationChange: true }); signOut();",
        })
      )
    );
    expect(result.passed).toBe(true);
    expect(result.message).toContain('no <ion-router-outlet> in any template');
  });

  it('an outlet named only in a comment does not count', () => {
    const result = law.check(
      ctx(
        project({
          'package.json': IONIC,
          'src/app/app.component.ts': '// TODO: <ion-router-outlet>\nexport class AppComponent {}',
        })
      )
    );
    expect(result.message).toContain('no <ion-router-outlet>');
  });
});

describe('IonicUniqueUrlKeyPerViewLaw (#148)', () => {
  it('red: two guarded routes render a component at the same path', () => {
    const result = IonicUniqueUrlKeyPerViewLaw.check(
      withOutlet({
        'src/app/app.routes.ts': [
          'export const routes: Routes = [',
          "  { path: '', canMatch: [signedOut], loadComponent: () => import('./launch.page') },",
          "  { path: '', canMatch: [signedIn], loadComponent: () => import('./tabs.page') },",
          '];',
        ].join('\n'),
      })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/app\.routes\.ts:2: 2 routes render a component at path '' \(lines 2, 3\)/),
    ]);
  });

  it('green: a redirect, distinct paths, and loadChildren groups split by guard', () => {
    const result = IonicUniqueUrlKeyPerViewLaw.check(
      withOutlet({
        'src/app/app.routes.ts': [
          'export const routes: Routes = [',
          "  { path: '', pathMatch: 'full', redirectTo: 'launch' },",
          "  { path: 'launch', loadComponent: () => import('./launch.page') },",
          "  { path: '', canActivateChild: [member], loadChildren: () => import('./events.routes') },",
          "  { path: '', canActivateChild: [admin], loadChildren: () => import('./admin.routes') },",
          '];',
        ].join('\n'),
      })
    );
    expect(result.violations).toEqual([]);
  });

  it('a collision inside a children array is found; a child path is not its parent\'s', () => {
    const result = IonicUniqueUrlKeyPerViewLaw.check(
      withOutlet({
        'src/app/tabs.routes.ts': [
          'export const routes: Routes = [',
          "  { path: 'tabs', component: TabsPage, children: [",
          "    { path: 'a', component: APage },",
          "    { path: 'a', canMatch: [x], component: BPage },",
          '  ] },',
          "  { path: 'other', component: OtherPage },",
          '];',
        ].join('\n'),
      })
    );
    expect(result.violations).toEqual([expect.stringContaining("at path 'a' (lines 3, 4)")]);
  });
});
