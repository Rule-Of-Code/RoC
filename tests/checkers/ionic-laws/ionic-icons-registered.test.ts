/**
 * Ionic Icons Registered (#262). Names are judged the way ionicons looks
 * them up: lower-cased, against the keys addIcons registers as written and
 * in kebab case.
 */
import { IonicIconsRegisteredLaw as Law, ioniconsKebab } from '../../../src/checkers/ionic-laws/ionic-icons-registered';
import { removeProjects } from '../toolkit-fixture';
import { component, runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const run = runner(ctx => Law.check(ctx));
const STANDALONE_HEAD = "import { IonIcon } from '@ionic/angular/standalone';\nimport { addIcons } from 'ionicons';\nimport { trashOutline, addCircleOutline } from 'ionicons/icons';";

const page = (template: string, body = 'constructor() { addIcons({ trashOutline, addCircleOutline }); }') =>
  component('src/app/list.page.ts', 'ListPage', {
    selector: 'app-list',
    template,
    head: STANDALONE_HEAD,
    body,
  });

describe('IonicIconsRegisteredLaw', () => {
  it('uses ionicons\' kebab-case rule', () => {
    expect(ioniconsKebab('trashOutline')).toBe('trash-outline');
    expect(ioniconsKebab('addCircleOutline')).toBe('add-circle-outline');
    expect(ioniconsKebab('logoIonic')).toBe('logo-ionic');
  });

  it('red: a template name no addIcons call registers, with the import that would', () => {
    const result = run(page('<ion-icon name="trash-outline"></ion-icon>\n<ion-icon name="heart-outline"></ion-icon>'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/list\.page\.html:2: <ion-icon name="heart-outline"> is not registered with addIcons .* import \{ heartOutline \} from 'ionicons\/icons'/
      ),
    ]);
  });

  it('green: every name registered, in either attribute form, ios/md included', () => {
    const result = run(
      page('<ion-icon name="trash-outline" />\n<ion-icon [name]="\'add-circle-outline\'" />\n<ion-icon ios="trash-outline" md="add-circle-outline" />')
    );
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: ios / md are names too', () => {
    const result = run(page('<ion-icon ios="logo-apple" md="trash-outline"></ion-icon>'));
    expect(result.violations).toEqual([expect.stringContaining('<ion-icon ios="logo-apple">')]);
  });

  it('green: registration in another file counts (project-wide), and explicit string keys count', () => {
    const result = run({
      ...page('<ion-icon name="my-logo"></ion-icon><ion-icon name="trash-outline"></ion-icon>', ''),
      'src/app/icons.ts': "import { addIcons } from 'ionicons';\nimport { trashOutline } from 'ionicons/icons';\naddIcons({ trashOutline, 'my-logo': 'data:image/svg+xml;utf8,<svg/>' });",
    });
    expect(result.violations).toEqual([]);
  });

  it('green: addIcons with the whole ionicons/icons namespace registers everything', () => {
    const result = run({
      ...page('<ion-icon name="heart-outline"></ion-icon>', ''),
      'src/app/icons.ts': "import { addIcons } from 'ionicons';\nimport * as all from 'ionicons/icons';\naddIcons(all);",
    });
    expect(result.violations).toEqual([]);
  });

  it('notes, not violations: a computed name, and a registered key no template uses', () => {
    const result = run(page('<ion-icon [name]="icon()"></ion-icon><ion-icon name="trash-outline"></ion-icon>'));
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('[name]="icon()"> is computed — not judged'),
        expect.stringContaining("'add-circle-outline' is registered but no template names it"),
      ])
    );
  });

  it('[icon] with SVG data and src= bypass the map and are not judged', () => {
    const result = run(page('<ion-icon [icon]="heartOutline"></ion-icon><ion-icon src="/assets/x.svg"></ion-icon><ion-icon name="trash-outline"></ion-icon>'));
    expect(result.violations).toEqual([]);
  });

  it('a name inside an HTML comment is not a template use', () => {
    const result = run(page('<!-- <ion-icon name="heart-outline"></ion-icon> -->\n<ion-icon name="trash-outline"></ion-icon>'));
    expect(result.violations).toEqual([]);
  });

  it('inline templates are read too', () => {
    const result = run(
      component('src/app/a.component.ts', 'AComponent', {
        selector: 'app-a',
        inline: true,
        template: '<ion-icon name="star"></ion-icon>',
        head: STANDALONE_HEAD,
      })
    );
    expect(result.violations).toEqual([expect.stringContaining('src/app/a.component.ts:')]);
  });

  it('out of scope: the module build (no @ionic/angular/standalone import) is not judged, and says so', () => {
    const result = run(
      component('src/app/a.component.ts', 'AComponent', { selector: 'app-a', template: '<ion-icon name="star"></ion-icon>' })
    );
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([expect.stringContaining('module build resolves icon names through its asset path')]);
  });

  it('cannot read: addIcons with a non-literal argument is reported, never passed', () => {
    const result = run(page('<ion-icon name="heart-outline"></ion-icon>', 'constructor() { addIcons(this.icons); }'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringContaining('what it registers was NOT read')])
    );
  });
});
