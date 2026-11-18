/**
 * Test Rig Keeps Route Guards (#367): a test that re-declares an app route by
 * hand drops the guards, resolvers and redirects the route has in the app.
 * The finding names the test route's line and the app route's file and
 * line; a test that imports the routes, or declares a path the app does not
 * have, is green.
 */
import { TestRigKeepsRouteGuardsLaw } from '../../../src/checkers/cache-harness-laws/test-rig-keeps-route-guards';
import { CACHE_HARNESS_LAWS } from '../../../src/data/cache-harness-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = CACHE_HARNESS_LAWS.find(
  law => law.checkFunction === 'TestRigKeepsRouteGuardsLaw.check'
);
const PKG = manifest({
  '@angular/core': '20.0.0',
  '@angular/router': '20.0.0',
});

const APP_ROUTES = `import { Routes } from '@angular/router';
import { catalogueGuard } from './catalogue.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./home.page').then(m => m.HomePage) },
  {
    path: 'items',
    canMatch: [catalogueGuard],
    children: [{ path: ':itemId', loadComponent: () => import('./item.page').then(m => m.ItemPage) }],
  },
];
`;

const spec = (
  routes: string
): string => `import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ItemPage } from './item.page';

describe('ItemPage', () => {
  it('opens an item', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(${routes})],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/items/42', ItemPage);
  });
});
`;

const run = (files: Record<string, string>) =>
  TestRigKeepsRouteGuardsLaw.check(
    ctx(
      project({
        'package.json': PKG,
        'src/app/app.routes.ts': APP_ROUTES,
        ...files,
      })
    )
  );

describe('TestRigKeepsRouteGuardsLaw (#367)', () => {
  it('is selected only where @angular/router is declared and a test declares a route by hand', () => {
    expect(LAW?.requires).toBeDefined();
    const handWritten = {
      'src/app/item.page.spec.ts': spec(
        "[{ path: 'items/:id', component: ItemPage }]"
      ),
    };
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'package.json': PKG, ...handWritten })
      )
    ).toBe(true);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'package.json': manifest({ react: '19.0.0' }),
          ...handWritten,
        })
      )
    ).toBe(false);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'package.json': PKG,
          'src/app/item.page.spec.ts': spec('routes'),
        })
      )
    ).toBe(false);
  });

  it('red: the spec re-declares a route that sits behind canMatch in the app (inherited from its parent)', () => {
    const result = run({
      'src/app/item.page.spec.ts': spec(
        "[{ path: 'items/:id', component: ItemPage }]"
      ),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/item\.page\.spec\.ts:9: the test re-declares the route 'items\/:id' by hand; in the app \(src\/app\/app\.routes\.ts:10\) it has canMatch, which the test route drops/
      ),
    ]);
  });

  it('red: the same through RouterTestingModule.withRoutes and a routes variable of the spec', () => {
    const testingModule = `import { RouterTestingModule } from '@angular/router/testing';

export const testRoutes = [{ path: 'items', children: [{ path: ':id', component: ItemPage }] }];

TestBed.configureTestingModule({ imports: [RouterTestingModule.withRoutes(testRoutes)] });
`;
    expect(run({ 'src/app/items.spec.ts': testingModule }).violations).toEqual([
      expect.stringMatching(
        /^src\/app\/items\.spec\.ts:3: the test re-declares the route 'items' by hand; in the app \(src\/app\/app\.routes\.ts:7\) it has canMatch/
      ),
      expect.stringMatching(
        /^src\/app\/items\.spec\.ts:3: the test re-declares the route ':id' by hand; in the app \(src\/app\/app\.routes\.ts:10\) it has canMatch/
      ),
    ]);
  });

  it('a routes variable given to two router setups in one spec is one declaration: reported once', () => {
    const twice = `const testRoutes = [{ path: 'items/:id', component: ItemPage }];

TestBed.configureTestingModule({ providers: [provideRouter(testRoutes)] });
TestBed.configureTestingModule({ providers: [provideRouter(testRoutes)] });
`;
    const result = run({ 'src/app/items.spec.ts': twice });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/items\.spec\.ts:1: the test re-declares the route 'items\/:id'/
      ),
    ]);
    expect(result.metrics).toMatchObject({
      routerSetups: 2,
      handDeclaredRoutes: 1,
    });
  });

  it('green: the spec imports the app routes, with the counter in the message and metrics', () => {
    const imported = spec('routes').replace(
      "import { ItemPage } from './item.page';",
      "import { ItemPage } from './item.page';\nimport { routes } from './app.routes';"
    );
    const result = run({
      'src/app/item.page.spec.ts':
        imported + "// a stub record: { path: 'x' }\n",
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 router setup\(s\) in 1 test file\(s\), 0 route\(s\) declared by hand/
    );
    expect(result.metrics).toMatchObject({
      filesRead: 1,
      routerSetups: 1,
      handDeclaredRoutes: 0,
    });
  });

  it('green: a spec route whose path the app does not have', () => {
    expect(
      run({
        'src/app/item.page.spec.ts': spec(
          "[{ path: 'test-host/:id', component: ItemPage }]"
        ),
      }).violations
    ).toEqual([]);
  });

  it('green: a spec route that keeps the guard key with a stub guard', () => {
    const stubbed = spec(
      "[{ path: 'items/:id', component: ItemPage, canMatch: [() => true] }]"
    );
    expect(run({ 'src/app/item.page.spec.ts': stubbed }).violations).toEqual(
      []
    );
  });

  it('a redirect in the app is a guard key too; the root path "" is not compared', () => {
    const redirected = APP_ROUTES.replace(
      "{ path: 'home', loadComponent",
      "{ path: 'start', redirectTo: 'home' },\n  { path: 'home', loadComponent"
    );
    const result = TestRigKeepsRouteGuardsLaw.check(
      ctx(
        project({
          'package.json': PKG,
          'src/app/app.routes.ts': redirected,
          'src/app/start.spec.ts': spec(
            "[{ path: '', component: ItemPage }, { path: 'start', component: ItemPage }]"
          ),
        })
      )
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /route 'start' by hand; in the app \(src\/app\/app\.routes\.ts:6\) it has redirectTo/
      ),
    ]);
  });

  it('judged nothing when the selecting text holds no router setup (a comment)', () => {
    const commented =
      "// provideRouter([{ path: 'items' }]) was replaced by the harness\nexport const x = { path: 'y' };\n";
    const result = run({ 'src/app/notes.spec.ts': commented });
    expect(result.passed).toBe(false);
    expect(result.judgedNothing).toBe(true);
  });
});
