/**
 * Ionic E2E Locators Target The Shown Page (#152): a first-match ion-*
 * locator returns the hidden page, which Ionic keeps ahead of the shown one.
 */
import { IonicE2eLocatorsTargetTheShownPageLaw as Law } from '../../../src/checkers/ionic-laws/ionic-e2e-locators-target-the-shown-page';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ react: '18.0.0', '@ionic/react': '8.8.17' });
const run = (files: Record<string, string>) =>
  Law.check(ctx(project({ 'package.json': IONIC, ...files })));

describe('IonicE2eLocatorsTargetTheShownPageLaw', () => {
  it.each([
    ["page.locator('ion-content')"],
    ["page.locator('ion-button').first()"],
    ["document.querySelector('ion-content')"],
    ["cy.get('ion-list ion-item')"],
  ])('red: %s', expression => {
    const result = run({ 'e2e/flow.spec.ts': `await ${expression};` });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/e2e\/flow\.spec\.ts:1: '.*' matches the hidden page first/),
    ]);
  });

  it.each([
    ["page.locator('ion-content:visible')"],
    ["page.locator('.ion-page:not(.ion-page-hidden) ion-button')"],
    ["page.getByRole('button', { name: 'Save' })"],
    ["page.locator('ion-button').filter({ visible: true })"],
    ["page.locator('app-appbar button')"],
  ])('green: %s', expression => {
    const result = run({ 'e2e/flow.spec.ts': `await ${expression};` });
    expect(result.violations).toEqual([]);
  });

  it('reads Playwright, Cypress and *.e2e files, and nothing else', () => {
    const result = run({
      'apps/web-e2e/src/e2e/a.spec.ts': "page.locator('ion-content');",
      'cypress/e2e/b.cy.ts': "cy.get('ion-content');",
      'src/app/c.e2e.ts': "page.locator('ion-content');",
      'src/app/d.component.ts': "this.el.querySelector('ion-content');",
    });
    expect(result.violations).toHaveLength(3);
  });

  it('a locator in a comment is not a locator', () => {
    const result = run({ 'e2e/flow.spec.ts': "// page.locator('ion-content') matched the hidden page" });
    expect(result.violations).toEqual([]);
  });
});
