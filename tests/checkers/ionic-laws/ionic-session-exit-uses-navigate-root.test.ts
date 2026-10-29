/**
 * IonicSessionExitUsesNavigateRoot (#149): red/green from the issue, plus the rule
 * every outlet law shares — in a project that does not mount
 * ion-router-outlet it passes and SAYS the URL-keyed stack does not exist.
 */
import { IonicSessionExitUsesNavigateRootLaw } from '../../../src/checkers/ionic-laws/ionic-session-exit-uses-navigate-root';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const OUTLET = {
  'src/app/app.component.ts':
    "@Component({ template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>' })\nexport class AppComponent {}",
};
const withOutlet = (files: Record<string, string>) =>
  ctx(project({ 'package.json': IONIC, ...OUTLET, ...files }));

describe('IonicSessionExitUsesNavigateRootLaw without an ion-router-outlet', () => {
  const law = IonicSessionExitUsesNavigateRootLaw;

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

describe('IonicSessionExitUsesNavigateRootLaw (#149)', () => {
  it('red: sign-out followed by a forward navigation', () => {
    const result = IonicSessionExitUsesNavigateRootLaw.check(
      withOutlet({
        'src/app/session.ts': [
          'export class Session {',
          '  async exit() {',
          '    await this.auth.signOut();',
          "    await this.router.navigateByUrl('/');",
          '  }',
          '}',
        ].join('\n'),
      })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/session\.ts:4: ends a session and navigates forward \(1 call\), never navigateRoot/),
    ]);
  });

  it('green: navigateRoot', () => {
    const result = IonicSessionExitUsesNavigateRootLaw.check(
      withOutlet({
        'src/app/session.ts':
          "export class S { async exit() { await this.auth.signOut(); await this.navCtrl.navigateRoot('/launch'); } }",
      })
    );
    expect(result.violations).toEqual([]);
  });

  it('a navigation without a session end is not this law\'s concern', () => {
    const result = IonicSessionExitUsesNavigateRootLaw.check(
      withOutlet({ 'src/app/a.ts': "this.router.navigate(['/x']); // signOut() elsewhere" })
    );
    expect(result.violations).toEqual([]);
  });
});
