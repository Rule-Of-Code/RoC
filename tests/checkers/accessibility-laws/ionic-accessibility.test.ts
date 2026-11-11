/**
 * The five accessibility laws on Ionic templates (#252): ion-* controls are
 * read with the naming Ionic gives them, a component presented by ion-modal is
 * a dialog because ion-modal makes it one, and a template that cannot be read
 * is reported, never passed.
 */
import { DisclosureControlAriaStateLaw } from '../../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../../src/checkers/accessibility-laws/form-control-labeling';
import { ModalDialogAccessibilityLaw } from '../../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import { TemplateMarkup } from '../../../src/checkers/accessibility-laws/template-markup';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const V = (r: { violations?: string[] }): string[] => r.violations ?? [];

const IONIC = { 'package.json': manifest({ '@ionic/angular': '^8.0.0' }) };
const run = (
  law: { check: typeof FormControlLabelingLaw.check },
  files: Record<string, string>
) => law.check(ctx(project({ ...IONIC, ...files })));

describe('TemplateMarkup', () => {
  it('reads an attribute value that contains ">"', () => {
    const doc = TemplateMarkup.parse('<button (click)="n > 0 && go()" type="button">x</button>');
    expect(doc.error).toBeNull();
    expect(doc.elements.map(el => el.tag)).toEqual(['button']);
    expect(TemplateMarkup.has(doc.elements[0]!, 'type')).toBe(true);
  });

  it('does not take <button-group> for a button, nor data-type for type', () => {
    const doc = TemplateMarkup.parse('<button-group></button-group><button data-type="x"></button>');
    expect(doc.elements.map(el => el.tag)).toEqual(['button-group', 'button']);
    expect(TemplateMarkup.has(doc.elements[1]!, 'type')).toBe(false);
  });

  it('treats "<" without a tag name, interpolations and comments as text', () => {
    const doc = TemplateMarkup.parse(
      '@if (a < b) { {{ x<y }} }<!-- <button> -->\n<input id="a">'
    );
    expect(doc.error).toBeNull();
    expect(doc.elements.map(el => `${el.tag}:${el.line}`)).toEqual(['input:2']);
  });

  it('reports an opening tag that never ends instead of reading past it', () => {
    expect(TemplateMarkup.parse('<div>\n<button type="button"').error).toMatch(
      /line 2: <button> is never closed/
    );
    expect(TemplateMarkup.parse('<input aria-label="never closed>').error).toMatch(
      /value of aria-label on <input> never ends/
    );
  });
});

describe('a template that cannot be read fails every template law', () => {
  const broken = { 'src/app/broken.component.html': '<ion-input label="Name"\n' };
  it.each([
    ['FormControlLabeling', FormControlLabelingLaw],
    ['ExplicitButtonType', ExplicitButtonTypeLaw],
    ['DisclosureControlAriaState', DisclosureControlAriaStateLaw],
  ])('%s', (_name, law) => {
    const result = run(law, broken);
    expect(result.passed).toBe(false);
    expect(V(result)).toEqual([
      expect.stringMatching(/broken\.component\.html: could not be read as markup .* NOT checked/),
    ]);
  });

  it('ModalDialogAccessibility', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/x-modal.component.html': '<div role="dialog"\n',
    });
    expect(result.passed).toBe(false);
    expect(V(result).join()).toMatch(/could not be read as markup/);
  });
});

describe('FormControlLabelingLaw on ion-* controls (#252 row 1)', () => {
  it('red: an unlabeled ion-input, ion-select, ion-textarea, ion-range, ion-checkbox, ion-toggle, ion-radio', () => {
    const result = run(FormControlLabelingLaw, {
      'src/app/form.component.html': [
        '<ion-input placeholder="Email"></ion-input>',
        '<ion-select placeholder="Pick"><ion-select-option value="a">A</ion-select-option></ion-select>',
        '<ion-textarea></ion-textarea>',
        '<ion-range></ion-range>',
        '<ion-checkbox></ion-checkbox>',
        '<ion-toggle slot="end"></ion-toggle>',
        '<ion-radio value="a"></ion-radio>',
      ].join('\n'),
    });
    expect(result.passed).toBe(false);
    expect(V(result)).toHaveLength(1);
    const [message] = V(result);
    expect(message).toContain('7 Ionic control(s) without an accessible name');
    for (const tag of ['ion-input', 'ion-select', 'ion-textarea', 'ion-range', 'ion-checkbox', 'ion-toggle', 'ion-radio']) {
      expect(message).toContain(`<${tag}>`);
    }
  });

  it('green: every way Ionic names a control', () => {
    const result = run(FormControlLabelingLaw, {
      'src/app/form.component.html': [
        '<ion-input label="Email"></ion-input>',
        '<ion-input [label]="emailLabel"></ion-input>',
        '<ion-input><div slot="label">Email <ion-text color="danger">*</ion-text></div></ion-input>',
        '<ion-input aria-label="Search"></ion-input>',
        '<ion-input aria-labelledby="h1"></ion-input>',
        '<label>Name <ion-input></ion-input></label>',
        '<ion-textarea label="Notes"></ion-textarea>',
        '<ion-select label="Size"></ion-select>',
        '<ion-select [attr.aria-label]="sizeLabel"></ion-select>',
        '<ion-range><div slot="label">Volume</div></ion-range>',
        '<ion-checkbox>I agree</ion-checkbox>',
        '<ion-toggle>{{ label }}</ion-toggle>',
        '<ion-radio value="a"><span>Option A</span></ion-radio>',
        '<ion-searchbar></ion-searchbar>',
      ].join('\n'),
    });
    expect(V(result)).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: names Ionic does not forward', () => {
    const result = run(FormControlLabelingLaw, {
      'src/app/form.component.html': [
        // ion-select copies only aria-label to its inner button.
        '<ion-select aria-labelledby="h1"></ion-select>',
        // shadow-DOM controls are not reached by a wrapping <label>.
        '<label>Agree <ion-checkbox></ion-checkbox></label>',
        // an empty label is no name.
        '<ion-input label=""></ion-input>',
        // the slot text belongs to a named slot, not the default one.
        '<ion-toggle><span slot="start">x</span></ion-toggle>',
      ].join('\n'),
    });
    expect(V(result).join()).toContain('4 Ionic control(s) without an accessible name');
  });

  it('native controls: a wrapping <label> names the control; data-id is not an id', () => {
    expect(
      run(FormControlLabelingLaw, {
        'src/app/a.component.html': '<label>Name <input type="text"></label>',
      }).passed
    ).toBe(true);
    const red = run(FormControlLabelingLaw, {
      'src/app/a.component.html': '<input data-id="x" placeholder="Name">',
    });
    expect(V(red).join()).toContain('1 form control(s) without an accessible label');
  });
});

describe('ExplicitButtonTypeLaw on Ionic (#252 row 2)', () => {
  it('does not read ion-button / ion-fab-button (both default to type="button")', () => {
    const result = run(ExplicitButtonTypeLaw, {
      'src/app/a.page.html': '<ion-button>Save</ion-button><ion-fab-button>+</ion-fab-button>',
    });
    expect(result.passed).toBe(true);
  });

  it('control: the same template with a native <button> is red', () => {
    const result = run(ExplicitButtonTypeLaw, {
      'src/app/a.page.html': '<ion-button>Save</ion-button>\n<button>Go</button>',
    });
    expect(V(result)).toEqual([
      expect.stringContaining('1 <button> without an explicit type (defaults to submit) at line 2'),
    ]);
  });
});

describe('DisclosureControlAriaStateLaw on Ionic (#252 row 4)', () => {
  it('red: ion-button and ion-item[button] toggles without aria-expanded', () => {
    const result = run(DisclosureControlAriaStateLaw, {
      'src/app/a.page.html': [
        '<ion-button (click)="open = !open">More</ion-button>',
        '<ion-item button (click)="toggleDetails()">Details</ion-item>',
      ].join('\n'),
    });
    expect(V(result)).toEqual([
      expect.stringContaining('2 disclosure button(s) toggling a panel/menu without [attr.aria-expanded] at lines 1, 2'),
    ]);
  });

  it('red: aria-expanded on ion-button / ion-item does not follow the state', () => {
    const result = run(DisclosureControlAriaStateLaw, {
      'src/app/a.page.html': [
        '<ion-button (click)="open = !open" [attr.aria-expanded]="open">More</ion-button>',
        '<ion-item button (click)="toggle()" [attr.aria-expanded]="open">Details</ion-item>',
      ].join('\n'),
    });
    expect(V(result)).toEqual([
      expect.stringMatching(/aria-expanded on <ion-button> line 1, <ion-item> line 2 does not follow the state/),
    ]);
  });

  it('green: inside ion-accordion, an ion-item that is not a button, a native button with the state', () => {
    const result = run(DisclosureControlAriaStateLaw, {
      'src/app/a.page.html': [
        '<ion-accordion-group><ion-accordion value="a">',
        '  <ion-item slot="header" button (click)="toggle()">A</ion-item>',
        '</ion-accordion></ion-accordion-group>',
        '<ion-item (click)="toggle()">not a button</ion-item>',
        '<ion-item [button]="false" (click)="toggle()">explicitly not a button</ion-item>',
        '<button type="button" (click)="toggle()" [attr.aria-expanded]="open">ok</button>',
        '<ion-button (click)="toggleTheme()" [attr.aria-pressed]="dark">Theme</ion-button>',
      ].join('\n'),
    });
    expect(V(result)).toEqual([]);
  });
});

describe('ModalDialogAccessibilityLaw on Ionic (#252 row 3)', () => {
  const sheet = '<ion-header><ion-toolbar><ion-title>Pick</ion-title></ion-toolbar></ion-header><ion-content>x</ion-content>\n';
  const component = (cls: string, selector: string, template: string) =>
    `import { Component } from '@angular/core';\n@Component({ selector: '${selector}', standalone: true, templateUrl: './${template}' })\nexport class ${cls} {}\n`;

  it('red control: a *-modal component nobody presents through ion-modal', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/pick/pick-modal.component.html': sheet,
      'src/app/pick/pick-modal.component.ts': component('PickModalComponent', 'app-pick-modal', 'pick-modal.component.html'),
    });
    expect(V(result)).toEqual([
      expect.stringContaining('pick-modal.component.html: dialog without role="dialog" + aria-modal="true" + a focus trap (cdkTrapFocus)'),
    ]);
  });

  it('green: the same component opened by ModalController.create', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/pick/pick-modal.component.html': sheet,
      'src/app/pick/pick-modal.component.ts': component('PickModalComponent', 'app-pick-modal', 'pick-modal.component.html'),
      'src/app/home/home.page.ts': [
        "import { Component, inject } from '@angular/core';",
        "import { ModalController } from '@ionic/angular/standalone';",
        "import { PickModalComponent } from '../pick/pick-modal.component';",
        "@Component({ selector: 'app-home', template: '' })",
        'export class HomePage {',
        '  private readonly modals = inject(ModalController);',
        '  async pick(): Promise<void> {',
        '    const modal = await this.modals.create({ component: PickModalComponent, breakpoints: [0, 1] });',
        '    await modal.present();',
        '  }',
        '}',
      ].join('\n'),
    });
    expect(V(result)).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: ModalController.create with focusTrap: false and no trap of its own', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/pick/pick-modal.component.html': sheet,
      'src/app/pick/pick-modal.component.ts': component('PickModalComponent', 'app-pick-modal', 'pick-modal.component.html'),
      'src/app/home/home.page.ts': [
        "import { ModalController } from '@ionic/angular';",
        "import { PickModalComponent } from '../pick/pick-modal.component';",
        'export class HomePage {',
        '  constructor(private readonly modals: ModalController) {}',
        '  open() { return this.modals.create({ component: PickModalComponent, focusTrap: false }); }',
        '}',
      ].join('\n'),
    });
    expect(V(result)).toEqual([
      expect.stringMatching(/pick-modal\.component\.html: presented by ModalController\.create in src\/app\/home\/home\.page\.ts with focusTrap set to false/),
    ]);
  });

  it('a create() call without a ModalController import is not taken for one', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/pick/pick-modal.component.html': sheet,
      'src/app/pick/pick-modal.component.ts': component('PickModalComponent', 'app-pick-modal', 'pick-modal.component.html'),
      'src/app/home/home.page.ts':
        "import { PickModalComponent } from '../pick/pick-modal.component';\nexport const x = (f: { create(o: unknown): void }) => f.create({ component: PickModalComponent });\n",
    });
    expect(result.passed).toBe(false);
  });

  it('green: a component whose selector is nested in an inline <ion-modal>', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/pick/pick-modal.component.html': sheet,
      'src/app/pick/pick-modal.component.ts': component('PickModalComponent', 'app-pick-modal', 'pick-modal.component.html'),
      'src/app/home/home.page.html':
        '<ion-content><ion-modal [isOpen]="open"><ng-template><app-pick-modal></app-pick-modal></ng-template></ion-modal></ion-content>',
    });
    expect(V(result)).toEqual([]);
  });

  it('inline <ion-modal> in the modal template itself: green, unless focusTrap is off', () => {
    const own = '<div class="fixed inset-0"><ion-modal [isOpen]="true">x</ion-modal></div>';
    expect(run(ModalDialogAccessibilityLaw, { 'src/app/a.page.html': own }).passed).toBe(true);
    const off = run(ModalDialogAccessibilityLaw, {
      'src/app/a.page.html': own.replace('[isOpen]="true"', '[isOpen]="true" [focusTrap]="false"'),
    });
    expect(V(off)).toEqual([
      expect.stringContaining('dialog without a focus trap (cdkTrapFocus)'),
    ]);
  });

  it('a component file that cannot be parsed is named when it decides the verdict', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/pick/pick-modal.component.html': sheet,
      'src/app/pick/pick-modal.component.ts': 'export class PickModalComponent { templateUrl = "x"; foo( }\n',
    });
    expect(result.passed).toBe(false);
    expect(V(result).join()).toMatch(/pick-modal\.component\.ts: could not be parsed/);
  });
});
