/**
 * Startup Request Fan-Out (#356): the HTTP requests one Angular component
 * starts synchronously from its opening hooks, directly or through one
 * service method, against thresholds.performance.maxStartupRequests.
 */
import { StartupRequestFanOutLaw as Law } from '../../../src/checkers/client-deploy-laws/startup-request-fan-out';
import { ConfigLoader } from '../../../src/config/loader';
import { RuleOfCodeAuditor } from '../../../src/core/auditing/audit-engine';
import { AuditResultProcessor } from '../../../src/core/auditing/result-processor';
import { CLIENT_DEPLOY_LAWS } from '../../../src/data/client-deploy-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const ANGULAR = manifest({
  '@angular/core': '20.0.0',
  '@angular/common': '20.0.0',
});
const LAW = CLIENT_DEPLOY_LAWS.find(
  law => law.checkFunction === 'StartupRequestFanOutLaw.check'
);

const page = (body: string, extraImports = ''): string =>
  [
    "import { Component, OnInit, inject } from '@angular/core';",
    "import { HttpClient } from '@angular/common/http';",
    extraImports,
    "@Component({ selector: 'app-profile', template: '<p>profile</p>' })",
    'export class ProfilePage implements OnInit {',
    body,
    '}',
  ].join('\n');

const run = (
  files: Record<string, string>,
  thresholds: Record<string, unknown> = {}
) =>
  Law.check(
    ctx(project({ 'package.json': ANGULAR, ...files }), { thresholds })
  );

const SIX_IN_NG_ON_INIT = page(
  [
    '  private http = inject(HttpClient);',
    '  ngOnInit(): void {',
    "    this.http.get('/api/me').subscribe();",
    "    this.http.get('/api/stats').subscribe();",
    "    this.http.get('/api/friends').subscribe();",
    "    this.http.get('/api/badges').subscribe();",
    "    this.http.post('/api/seen', {}).subscribe();",
    '    this.http.get(`/api/feed?page=${1}`).subscribe();',
    '  }',
  ].join('\n')
);

describe('StartupRequestFanOutLaw', () => {
  it('red: six requests in ngOnInit — one finding that lists all six, file:line each', () => {
    const result = run({ 'src/app/profile.page.ts': SIX_IN_NG_ON_INIT });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    const [finding] = result.violations ?? [];
    expect(finding).toMatch(
      /^src\/app\/profile\.page\.ts:5: ProfilePage starts 6 HTTP requests when it opens .*threshold 4\)/
    );
    for (const [label, line] of [
      ["GET '/api/me'", 8],
      ["GET '/api/stats'", 9],
      ["GET '/api/friends'", 10],
      ["GET '/api/badges'", 11],
      ["POST '/api/seen'", 12],
      ['GET `/api/feed?page=${1}`', 13],
    ] as const) {
      expect(finding).toContain(`${label} (src/app/profile.page.ts:${line})`);
    }
  });

  it('green: two requests on open and the rest deferred (subscribe callback, setTimeout, a click handler)', () => {
    const result = run({
      'src/app/profile.page.ts': page(
        [
          '  constructor(private http: HttpClient) {}',
          '  ngOnInit(): void {',
          "    this.http.get('/api/me').subscribe(me => {",
          "      this.http.get('/api/friends/' + me).subscribe();",
          "      this.http.get('/api/badges/' + me).subscribe();",
          '    });',
          "    this.http.get('/api/stats').subscribe();",
          "    setTimeout(() => this.http.get('/api/feed').subscribe(), 0);",
          '  }',
          "  more(): void { this.http.get('/api/more').subscribe(); this.http.get('/api/more2').subscribe(); }",
        ].join('\n')
      ),
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: through one service hop and a same-class method, reporting where the hook reaches the service', () => {
    const service = [
      "import { Injectable, inject } from '@angular/core';",
      "import { HttpClient } from '@angular/common/http';",
      "@Injectable({ providedIn: 'root' })",
      'export class ProfileApi {',
      '  private readonly http = inject(HttpClient);',
      "  me() { return this.http.get('/api/me'); }",
      '  dashboard() {',
      "    return [this.http.get('/api/stats'), this.http.get('/api/badges'), this.http.get('/api/friends')];",
      '  }',
      '}',
    ].join('\n');
    const result = run({
      'src/app/profile.api.ts': service,
      'src/app/profile.page.ts': page(
        [
          '  private api = inject(ProfileApi);',
          '  private http = inject(HttpClient);',
          '  ngOnInit(): void { this.load(); }',
          "  ionViewWillEnter(): void { this.http.get('/api/notifications').subscribe(); }",
          '  private load(): void {',
          '    this.api.me().subscribe();',
          '    this.api.dashboard();',
          '  }',
        ].join('\n'),
        "import { ProfileApi } from './profile.api';"
      ),
    });
    expect(result.violations).toHaveLength(1);
    const [finding] = result.violations ?? [];
    expect(finding).toContain('starts 5 HTTP requests');
    expect(finding).toContain(
      "GET '/api/me' (src/app/profile.api.ts:6, via src/app/profile.page.ts:11)"
    );
    expect(finding).toContain(
      "GET '/api/friends' (src/app/profile.api.ts:8, via src/app/profile.page.ts:12)"
    );
    expect(finding).toContain(
      "GET '/api/notifications' (src/app/profile.page.ts:9)"
    );
  });

  it('red: an abstract class as the DI token — the implementation that sends requests counts once', () => {
    const token =
      'export abstract class FeedSource { abstract page(): unknown; abstract head(): unknown; }';
    const http = [
      "import { HttpClient } from '@angular/common/http';",
      "import { FeedSource } from './feed-source';",
      'export class HttpFeedSource extends FeedSource {',
      '  constructor(private http: HttpClient) { super(); }',
      "  page() { return this.http.get('/api/feed'); }",
      "  head() { return this.http.head('/api/feed'); }",
      '}',
    ].join('\n');
    const memory =
      "import { FeedSource } from './feed-source';\nexport class MemoryFeedSource implements FeedSource { page() { return []; } head() { return null; } }";
    const result = run(
      {
        'src/app/feed-source.ts': token,
        'src/app/http-feed-source.ts': http,
        'src/app/memory-feed-source.ts': memory,
        'src/app/profile.page.ts': page(
          '  private feed = inject(FeedSource);\n  ngOnInit() { this.feed.page(); this.feed.head(); }',
          "import { FeedSource } from './feed-source';"
        ),
      },
      { performance: { maxStartupRequests: 1 } }
    );
    expect(result.violations).toEqual([
      expect.stringContaining('starts 2 HTTP requests'),
    ]);
    expect(result.violations?.[0]).toContain(
      "GET '/api/feed' (src/app/http-feed-source.ts:5, via src/app/profile.page.ts:7)"
    );
    expect(result.violations?.[0]).toContain(
      "HEAD '/api/feed' (src/app/http-feed-source.ts:6, via src/app/profile.page.ts:7)"
    );
  });

  it('a request two services deep is not counted (one hop only)', () => {
    const inner =
      "import { HttpClient } from '@angular/common/http';\nexport class Inner { constructor(private http: HttpClient) {}\n  a() { this.http.get('/a'); this.http.get('/b'); this.http.get('/c'); this.http.get('/d'); this.http.get('/e'); } }";
    const outer =
      "import { Inner } from './inner';\nexport class Outer { constructor(private inner: Inner) {}\n  load() { this.inner.a(); } }";
    const result = run({
      'src/app/inner.ts': inner,
      'src/app/outer.ts': outer,
      'src/app/profile.page.ts': page(
        '  constructor(private outer: Outer) {}\n  ngOnInit() { this.outer.load(); }',
        "import { Outer } from './outer';"
      ),
    });
    expect(result.violations).toEqual([]);
  });

  it('the threshold is configurable; exactly at the threshold is green', () => {
    expect(
      run(
        { 'src/app/profile.page.ts': SIX_IN_NG_ON_INIT },
        { performance: { maxStartupRequests: 6 } }
      ).violations
    ).toEqual([]);
    expect(
      run(
        { 'src/app/profile.page.ts': SIX_IN_NG_ON_INIT },
        { performance: { maxStartupRequests: 5 } }
      ).violations
    ).toHaveLength(1);
  });

  it('cannot read: an invalid threshold is reported, never replaced by the default', () => {
    const result = run(
      { 'src/app/profile.page.ts': SIX_IN_NG_ON_INIT },
      { performance: { maxStartupRequests: 0 } }
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining('thresholds.performance.maxStartupRequests is 0'),
    ]);
  });

  it('forEach callbacks run in the hook: each call site inside counts once', () => {
    const result = run(
      {
        'src/app/profile.page.ts': page(
          "  constructor(private http: HttpClient) {}\n  ngOnInit() { ['a', 'b'].forEach(id => this.http.get('/api/' + id)); fetch('/api/x'); }"
        ),
      },
      { performance: { maxStartupRequests: 1 } }
    );
    expect(result.violations).toEqual([
      expect.stringContaining('starts 2 HTTP requests'),
    ]);
    expect(result.violations?.[0]).toContain("fetch('/api/x')");
  });

  const LIBRARY = {
    'package.json': ANGULAR,
    'libs/api/src/user.service.ts':
      "import { HttpClient } from '@angular/common/http';\nexport class UserService { constructor(private http: HttpClient) {} me() { return this.http.get('/me'); } }",
    'libs/api/src/index.ts': "export * from './user.service';",
    'libs/api/src/user.service.spec.ts':
      "@Component({ selector: 'x', template: '' }) class Host {}",
  };

  it('a library without a component (a test host does not count) does not select the law', () => {
    expect(lawRequirementsMet(LAW?.requires, project(LIBRARY))).toBe(false);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ ...LIBRARY, 'src/app/profile.page.ts': SIX_IN_NG_ON_INIT })
      )
    ).toBe(true);
  });

  it('run anyway on a project without a component file, it is not a pass', () => {
    const result = run(LIBRARY);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.judgedNothing).toBe(true);
  });

  it('components under the threshold: a pass that counts the component files and says what it does not follow', () => {
    const result = run({
      'src/app/profile.page.ts': page(
        "  constructor(private http: HttpClient) {}\n  ngOnInit() { this.http.get('/api/me').subscribe(); }"
      ),
    });
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /^Startup Request Fan-Out: 1 component file\(s\) read \(1 component\(s\), 1 with an opening hook\), none starts more than 4 requests on open \(most: 1\)/
    );
    expect(result.message).toContain(
      'not followed: a callback handed to a helper, free functions that receive a service, inject*() factories'
    );
    expect(result.metrics).toMatchObject({
      componentFilesRead: 1,
      components: 1,
      componentsWithOpeningHook: 1,
      threshold: 4,
      mostRequests: 1,
    });
  });

  it('the engine does not count it on a library without a component', async () => {
    const applicable = async (
      files: Record<string, string>
    ): Promise<number> => {
      const root = project({
        ...files,
        'ruleofcode.config.json': JSON.stringify({
          project: { type: 'angular' },
          laws: { minLawsChecked: 9999 },
        }),
      });
      const spies = [
        jest.spyOn(console, 'log').mockImplementation(() => undefined),
        jest.spyOn(console, 'warn').mockImplementation(() => undefined),
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
      ];
      try {
        const auditor = await RuleOfCodeAuditor.create({
          projectRoot: root,
          config: ConfigLoader.load(root),
          mode: 'full',
        });
        return (await auditor.audit()).scope?.applicableLaws ?? -1;
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
    };
    const library = await applicable(LIBRARY);
    const withComponent = await applicable({
      ...LIBRARY,
      'src/app/profile.page.ts': page('  ngOnInit() {}'),
    });
    expect(withComponent).toBe(library + 1);
  });

  it('the counts reach the JSON report (results[].metrics)', async () => {
    const root = project({
      'package.json': ANGULAR,
      'src/app/profile.page.ts': page(
        "  constructor(private http: HttpClient) {}\n  ngOnInit() { this.http.get('/api/me').subscribe(); }"
      ),
      'ruleofcode.config.json': JSON.stringify({
        project: { type: 'angular' },
        laws: { enabled: { 'Startup Request Fan-Out': true } },
      }),
    });
    const spies = [
      jest.spyOn(console, 'log').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
      jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
    ];
    try {
      const auditor = await RuleOfCodeAuditor.create({
        projectRoot: root,
        config: ConfigLoader.load(root),
        mode: 'full',
      });
      const json = JSON.parse(
        AuditResultProcessor.exportResults(await auditor.audit(), 'json')
      ) as {
        results: Array<{
          lawName?: string;
          passed?: boolean;
          metrics?: Record<string, unknown>;
        }>;
      };
      const mine = json.results.find(
        entry => entry.lawName === 'startup-request-fan-out'
      );
      expect(mine).toMatchObject({
        passed: true,
        metrics: { componentFilesRead: 1, components: 1 },
      });
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});
