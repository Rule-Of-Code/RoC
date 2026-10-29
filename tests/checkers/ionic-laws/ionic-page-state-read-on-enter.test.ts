/**
 * Ionic Page State Read On Enter (#145). Red/green from the issue: per-visit
 * state read where a re-attached page never runs again.
 */
import { IonicPageStateReadOnEnterLaw as Law } from '../../../src/checkers/ionic-laws/ionic-page-state-read-on-enter';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IONIC = manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' });
const run = (files: Record<string, string>) =>
  Law.check(ctx(project({ 'package.json': IONIC, ...files })));
const page = (...body: string[]) =>
  ['export class LaunchPage {', ...body.map(line => `  ${line}`), '}'].join('\n');

describe('IonicPageStateReadOnEnterLaw', () => {
  it('red: navigation state read in a field initialiser', () => {
    const result = run({
      'src/app/launch.page.ts': page(
        'readonly #from = inject(Router).getCurrentNavigation()?.extras.state;'
      ),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /launch\.page\.ts:2: LaunchPage reads getCurrentNavigation\(\) in a field initialiser/
      ),
    ]);
  });

  it('red: route.snapshot read in ngOnInit', () => {
    const result = run({
      'src/app/item.page.ts': page(
        "ngOnInit() { this.id = this.route.snapshot.paramMap.get('id'); }"
      ),
    });
    expect(result.violations).toEqual([
      expect.stringContaining('reads route.snapshot in ngOnInit'),
    ]);
  });

  it('red: history.state read in the constructor', () => {
    const result = run({
      'src/app/item.page.ts': page('constructor() { this.from = history.state?.from; }'),
    });
    expect(result.violations).toEqual([
      expect.stringContaining('reads history.state in the constructor'),
    ]);
  });

  it('green: the same read in ionViewWillEnter', () => {
    const result = run({
      'src/app/item.page.ts': page(
        'ionViewWillEnter() { this.from = history.state?.from ?? null; }'
      ),
    });
    expect(result.violations).toEqual([]);
  });

  it('green: a reactive read', () => {
    const result = run({
      'src/app/item.page.ts': page(
        "readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));"
      ),
    });
    expect(result.violations).toEqual([]);
  });

  it('a component whose sibling template has <ion-content> is a page', () => {
    const result = run({
      'src/app/item/item.component.ts': page('ngOnInit() { this.s = history.state; }'),
      'src/app/item/item.component.html': '<ion-header></ion-header><ion-content></ion-content>',
    });
    expect(result.violations).toHaveLength(1);
  });

  it('a component that is not a page is not read', () => {
    const result = run({
      'src/app/widget.component.ts': page('ngOnInit() { this.s = history.state; }'),
    });
    expect(result.violations).toEqual([]);
  });

  it('a source named in a comment or string is not a read', () => {
    const result = run({
      'src/app/item.page.ts': page(
        '// history.state was read here once',
        "ngOnInit() { this.label = 'route.snapshot'; }"
      ),
    });
    expect(result.violations).toEqual([]);
  });
});
