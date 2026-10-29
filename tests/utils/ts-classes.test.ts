import { TsClasses } from '../../src/utils/ts-classes';

describe('TsClasses.mask', () => {
  it('keeps length and newlines, blanks comments', () => {
    const src = "a(); // b()\n/* c()\n d() */ e();";
    const masked = TsClasses.mask(src);
    expect(masked).toHaveLength(src.length);
    expect(masked.split('\n')).toHaveLength(3);
    expect(masked).not.toMatch(/[bcd]\(/);
    expect(masked).toMatch(/e\(\)/);
  });

  it('does not read // inside a string as a comment', () => {
    const masked = TsClasses.mask("const u = 'https://x'; f();");
    expect(masked).toContain("'https://x'");
    expect(masked).toContain('f();');
  });

  it('blanks string contents on request, keeping the quotes', () => {
    const masked = TsClasses.mask("x('{ ionViewWillEnter }')", 'commentsAndStrings');
    expect(masked).toBe("x('                    ')");
  });
});

describe('TsClasses.parse', () => {
  const page = [
    "import { ViewWillEnter } from '@ionic/angular/standalone';",
    '',
    '@Component({ selector: "app-a", template: "<ion-content>{{ x }}</ion-content>" })',
    'export class APage implements OnInit, ViewWillEnter {',
    "  readonly #from = inject(Router).getCurrentNavigation()?.extras.state;",
    '  private readonly svc = inject(Svc);',
    '  handler = (e: Event) => { this.go(e); };',
    "  @Input() label = '}';",
    '  constructor(private readonly r: Router) { this.r.navigate([]); }',
    '  // ionViewDidEnter() {}',
    '  ngOnInit(): void { this.id = this.route.snapshot.paramMap.get("id"); }',
    '  async ionViewWillEnter(): Promise<void> {',
    '    if (this.x) { await this.reload(); }',
    '  }',
    '  get title(): string { return "t"; }',
    '}',
    '',
    'class Helper { run() { return 1; } }',
  ].join('\n');

  const [a, helper] = TsClasses.parse(page);

  it('finds both classes in the file', () => {
    expect(TsClasses.parse(page).map(c => c.name)).toEqual(['APage', 'Helper']);
  });

  it('reads the implements list', () => {
    expect(a?.implementsList).toEqual(['OnInit', 'ViewWillEnter']);
    expect(helper?.implementsList).toEqual([]);
  });

  it('lists members with their kind, in order, and skips the commented one', () => {
    expect(a?.members.map(m => `${m.kind}:${m.name}`)).toEqual([
      'field:#from',
      'field:svc',
      'field:handler',
      'field:label',
      'constructor:constructor',
      'method:ngOnInit',
      'method:ionViewWillEnter',
      'method:title',
    ]);
  });

  it('gives the line of each member', () => {
    const line = (name: string) => a?.members.find(m => m.name === name)?.line;
    expect(line('#from')).toBe(5);
    expect(line('ionViewWillEnter')).toBe(12);
  });

  it('gives a method its body and a field its initializer', () => {
    const member = (name: string) => a?.members.find(m => m.name === name);
    expect(member('ngOnInit')?.body).toContain('route.snapshot');
    expect(member('ionViewWillEnter')?.body).toContain('await this.reload()');
    expect(member('#from')?.body).toBe('inject(Router).getCurrentNavigation()?.extras.state');
    expect(member('constructor')?.body).toContain('this.r.navigate');
  });

  it('a field without a semicolon ends at the next member', () => {
    const [c] = TsClasses.parse('class C {\n  a = 1\n  b(): void {}\n}');
    expect(c?.members.map(m => m.name)).toEqual(['a', 'b']);
  });
});
