/**
 * IonicNoSkipLocationChange (#147): red/green from the issue, plus the rule
 * every outlet law shares — in a project that does not mount
 * ion-router-outlet it passes and SAYS the URL-keyed stack does not exist.
 */
import { IonicNoSkipLocationChangeLaw } from '../../../src/checkers/ionic-laws/ionic-no-skip-location-change';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const OUTLET = {
  'src/app/app.component.ts':
    "@Component({ template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>' })\nexport class AppComponent {}",
};
const withOutlet = (files: Record<string, string>) =>
  ctx(project({ 'package.json': IONIC, ...OUTLET, ...files }));

describe('IonicNoSkipLocationChangeLaw without an ion-router-outlet', () => {
  const law = IonicNoSkipLocationChangeLaw;

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

describe('IonicNoSkipLocationChangeLaw (#147)', () => {
  it('red: skipLocationChange in navigation extras', () => {
    const result = IonicNoSkipLocationChangeLaw.check(
      withOutlet({
        'src/app/wizard.ts':
          "export class W { done() { this.router.navigate(['/events', id, 'manage'], { skipLocationChange: true }); } }",
      })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/wizard\.ts:1: skipLocationChange — .*Use replaceUrl/),
    ]);
  });

  it('red: the routerLink input in a template', () => {
    const result = IonicNoSkipLocationChangeLaw.check(
      withOutlet({ 'src/app/a.html': '<a routerLink="/x" [skipLocationChange]="true">x</a>' })
    );
    expect(result.violations).toHaveLength(1);
  });

  it('green: replaceUrl, false, or a comment', () => {
    const result = IonicNoSkipLocationChangeLaw.check(
      withOutlet({
        'src/app/wizard.ts': [
          "this.router.navigate(['/x'], { replaceUrl: true });",
          '// skipLocationChange: true was the bug',
          "this.router.navigate(['/y'], { skipLocationChange: false });",
        ].join('\n'),
        'src/app/a.html': '<a routerLink="/x" [skipLocationChange]="false">x</a>',
      })
    );
    expect(result.violations).toEqual([]);
  });
});
