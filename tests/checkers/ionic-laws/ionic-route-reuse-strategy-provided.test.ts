/**
 * IonicRouteReuseStrategyProvided (#150): red/green from the issue, plus the rule
 * every outlet law shares — in a project that does not mount
 * ion-router-outlet it passes and SAYS the URL-keyed stack does not exist.
 */
import { IonicRouteReuseStrategyProvidedLaw } from '../../../src/checkers/ionic-laws/ionic-route-reuse-strategy-provided';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const OUTLET = {
  'src/app/app.component.ts':
    "@Component({ template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>' })\nexport class AppComponent {}",
};
const withOutlet = (files: Record<string, string>) =>
  ctx(project({ 'package.json': IONIC, ...OUTLET, ...files }));

describe('IonicRouteReuseStrategyProvidedLaw without an ion-router-outlet', () => {
  const law = IonicRouteReuseStrategyProvidedLaw;

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

describe('IonicRouteReuseStrategyProvidedLaw (#150)', () => {
  const MAIN = 'bootstrapApplication(AppComponent, appConfig);';

  it('red: a bootstrap with provideIonicAngular and no RouteReuseStrategy', () => {
    const result = IonicRouteReuseStrategyProvidedLaw.check(
      withOutlet({
        'src/main.ts': MAIN,
        'src/app/app.config.ts':
          'export const appConfig = { providers: [provideIonicAngular(), provideRouter(routes)] };',
      })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^the application: no RouteReuseStrategy provider in (?=.*src\/main\.ts)(?=.*src\/app\/app\.config\.ts)/
      ),
    ]);
  });

  it('green: the starter form', () => {
    const result = IonicRouteReuseStrategyProvidedLaw.check(
      withOutlet({
        'src/main.ts': [
          'bootstrapApplication(AppComponent, { providers: [',
          '  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },',
          '  provideIonicAngular(),',
          '  provideRouter(routes),',
          '] });',
        ].join('\n'),
      })
    );
    expect(result.violations).toEqual([]);
  });

  it('one app providing it does not vouch for another (monorepo)', () => {
    const result = IonicRouteReuseStrategyProvidedLaw.check(
      withOutlet({
        'apps/mobile/src/main.ts':
          'bootstrapApplication(A, { providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, provideRouter(r)] });',
        'apps/kiosk/src/main.ts': 'bootstrapApplication(B, { providers: [provideRouter(r)] });',
      })
    );
    expect(result.violations).toEqual([expect.stringMatching(/^apps\/kiosk: no RouteReuseStrategy/)]);
  });

  it('a provider named only in a comment does not count', () => {
    const result = IonicRouteReuseStrategyProvidedLaw.check(
      withOutlet({
        'src/main.ts':
          '// { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }\nbootstrapApplication(A, { providers: [provideRouter(r)] });',
      })
    );
    expect(result.violations).toHaveLength(1);
  });
});
