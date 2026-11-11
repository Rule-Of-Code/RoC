/**
 * Ionic View Hooks Only On Pages (#258). A hook is bound only on a component
 * Ionic creates: red for a class rendered only from a template, green for
 * every way a class becomes a page or a controller-created component, and a
 * note (not a pass claim, not red) for a class the law cannot trace.
 */
import { IonicViewHooksOnlyOnPagesLaw as Law } from '../../../src/checkers/ionic-laws/ionic-view-hooks-only-on-pages';
import { removeProjects } from '../toolkit-fixture';
import { runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const run = runner(ctx => Law.check(ctx));

const CHILD = [
  "import { Component } from '@angular/core';",
  "@Component({ selector: 'app-child', template: '<p>child</p>' })",
  'export class ChildComponent {',
  '  ionViewWillEnter(): void { this.reload(); }',
  '  reload(): void {}',
  '}',
].join('\n');

const PARENT = [
  "import { Component } from '@angular/core';",
  "import { ChildComponent } from './child.component';",
  "@Component({ selector: 'app-home', imports: [ChildComponent], template: '<ion-content><app-child /></ion-content>' })",
  'export class HomePage {}',
].join('\n');

describe('IonicViewHooksOnlyOnPagesLaw', () => {
  it('red: a hook on a component rendered only from a template', () => {
    const result = run({
      'src/app/child.component.ts': CHILD,
      'src/app/home.page.ts': PARENT,
      'src/app/app.routes.ts': "import { HomePage } from './home.page';\nexport const routes = [{ path: '', component: HomePage }];",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/child\.component\.ts:4: ChildComponent\.ionViewWillEnter — ChildComponent is rendered only from a template \(listed at src\/app\/home\.page\.ts:3\)/
      ),
    ]);
  });

  it('red: a hook declared as an arrow-function field on a subclass', () => {
    const result = run({
      'src/app/child.component.ts': [
        "import { Component } from '@angular/core';",
        "import { ViewWillEnter } from '@ionic/angular/standalone';",
        "@Component({ selector: 'app-child', template: '' })",
        'export abstract class Base {}',
        'export class ChildComponent extends Base implements ViewWillEnter {',
        '  ionViewWillEnter = (): void => undefined;',
        '}',
      ].join('\n'),
      'src/app/home.page.ts': PARENT,
    });
    expect(result.violations).toEqual([expect.stringContaining('ChildComponent.ionViewWillEnter')]);
  });

  it('red: a class that only implements ViewWillEnter (the hook inherited) counts as declaring it', () => {
    const result = run({
      'src/app/child.component.ts': [
        "import { ViewWillEnter } from '@ionic/angular/standalone';",
        "@Component({ selector: 'app-child', template: '' })",
        'export class ChildComponent extends Reloading implements ViewWillEnter {}',
      ].join('\n'),
      'src/app/home.page.ts': PARENT,
    });
    expect(result.violations).toEqual([
      expect.stringContaining('ChildComponent implements ViewWillEnter — ChildComponent is rendered only from a template'),
    ]);
  });

  it('red: declared in an NgModule and never routed', () => {
    const result = run({
      'src/app/child.component.ts': CHILD,
      'src/app/child.module.ts': "import { ChildComponent } from './child.component';\n@NgModule({ declarations: [ChildComponent] })\nexport class ChildModule {}",
    });
    expect(result.violations).toEqual([expect.stringContaining('listed at src/app/child.module.ts:2')]);
  });

  it.each([
    ['a route component', "import { ChildComponent } from './child.component';\nexport const routes = [{ path: 'c', component: ChildComponent }];"],
    ['loadComponent … .then(m => m.X)', "export const routes = [{ path: 'c', loadComponent: () => import('./child.component').then((m) => m.ChildComponent) }];"],
    ['ModalController.create({ component })', "import { ChildComponent } from './child.component';\nexport class Opener { open(m: any) { return m.create({ component: ChildComponent }); } }"],
    ['ion-nav push', "import { ChildComponent } from './child.component';\nexport class Navs { go(nav: any) { return nav.push(ChildComponent); } }"],
  ])('green: %s, even though a template also renders it', (_label, creator) => {
    const result = run({
      'src/app/child.component.ts': CHILD,
      'src/app/home.page.ts': PARENT,
      'src/app/creator.ts': creator,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('green: a default export loaded by loadComponent', () => {
    const result = run({
      'src/app/child.component.ts': CHILD.replace('export class ChildComponent', 'export default class ChildComponent'),
      'src/app/home.page.ts': PARENT,
      'src/app/app.routes.ts': "export const routes = [{ path: 'c', loadComponent: () => import('./child.component') }];",
    });
    expect(result.violations).toEqual([]);
  });

  it('green: an abstract base, and a base class whose subclass is routed', () => {
    const result = run({
      'src/app/base.ts': [
        'export abstract class AbstractBase { ionViewWillEnter(): void {} }',
        'export class Base { ionViewDidEnter(): void {} }',
      ].join('\n'),
      'src/app/event.page.ts': "import { Base } from './base';\nexport class EventPage extends Base {}",
      'src/app/app.routes.ts': "import { EventPage } from './event.page';\nexport const routes = [{ path: 'e', component: EventPage }];",
    });
    expect(result.violations).toEqual([]);
  });

  it('not judged (a note, not red): a class passed through a variable', () => {
    const result = run({
      'src/app/child.component.ts': CHILD,
      'src/app/home.page.ts': PARENT.replace('export class HomePage {}', 'export class HomePage { readonly root = ChildComponent; }'),
    });
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([expect.stringMatching(/ChildComponent\.ionViewWillEnter not judged — it is passed by value at src\/app\/home\.page\.ts:4/)])
    );
  });

  it('a type, an interface or an object key with the same name is not a reference', () => {
    const result = run({
      'src/app/child.component.ts': CHILD,
      'src/app/home.page.ts': PARENT,
      'src/app/model.ts': "import type { ChildComponent } from './child.component';\nexport interface Holder { ChildComponent: ChildComponent }\nexport const k = { ChildComponent: 1 };",
    });
    expect(result.violations).toEqual([expect.stringContaining('ChildComponent.ionViewWillEnter')]);
  });

  it('control: a project without any ionView* hook has nothing to judge, and says nothing', () => {
    const result = run({ 'src/app/home.page.ts': PARENT });
    expect(result.passed).toBe(true);
    expect(result.suggestions).toEqual([]);
  });

  it('cannot read: an unreadable templateUrl is reported, never passed', () => {
    const result = run({
      'src/app/home.page.ts': "import { Component } from '@angular/core';\n@Component({ selector: 'app-home', templateUrl: './missing.html' })\nexport class HomePage {}",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining("'./missing.html' could not be read")]);
  });
});
