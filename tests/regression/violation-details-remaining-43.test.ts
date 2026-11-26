/**
 * #43, package 8 (integrity, measurement, client-deploy, request-path, test
 * integrity, the leftover Ionic count) — laws whose violation line counts or
 * cuts what they found name every artefact in `violationDetails`, at its
 * place. The violation lines are unchanged.
 */
import { StartupRequestFanOutLaw } from '../../src/checkers/client-deploy-laws/startup-request-fan-out';
import { TsconfigExcludeLeavesCodeUntypedLaw } from '../../src/checkers/integrity-laws/tsconfig-exclude-leaves-code-untyped';
import { IonicSingleBuildSystemLaw } from '../../src/checkers/ionic-laws/ionic-single-build-system';
import { TestServerLoopbackAddressMatchLaw } from '../../src/checkers/measurement-laws/test-server-loopback-address-match';
import { DocumentReadOncePerRequestLaw } from '../../src/checkers/request-path-laws/document-read-once-per-request';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { PlaywrightLocatorsUserFacingLaw } from '../../src/checkers/testing-laws/playwright-locators-user-facing';
import { RtlQueryByRoleLaw } from '../../src/checkers/testing-laws/rtl-query-by-role';
import type { ViolationDetail } from '../../src/types/law.types';
import { gitProject } from '../checkers/integrity-laws/integrity-fixture';
import { runner } from '../checkers/ionic-laws/ionic-rendering-fixture';
import {
  ctx,
  manifest,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const SIX = [1, 2, 3, 4, 5, 6];
const places = (details: ViolationDetail[] | undefined): string[] =>
  (details ?? []).map(d => `${d.file}:${d.line ?? '-'} ${d.message}`);

describe('#43 package 8: the remaining laws name every artefact they counted', () => {
  it('Tsconfig Exclude Leaves Code Untyped: every file left in no tsconfig, not three', () => {
    const files: Record<string, string> = {
      'tsconfig.json': JSON.stringify({
        include: ['src/**/*.ts'],
        exclude: ['e2e'],
      }),
      'src/app.ts': 'export const app = 1;\n',
    };
    for (const n of [1, 2, 3, 4])
      files[`e2e/f${n}.ts`] = `export const f${n} = 1;\n`;
    const result = TsconfigExcludeLeavesCodeUntypedLaw.check(
      ctx(gitProject(files))
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^tsconfig\.json: exclude "e2e" leaves 4 TypeScript file\(s\) in no tsconfig \(e2e\/f\d\.ts, e2e\/f\d\.ts, e2e\/f\d\.ts, …\)/
      ),
    ]);
    expect(places(result.violationDetails).sort()).toEqual(
      [1, 2, 3, 4].map(
        n =>
          `e2e/f${n}.ts:- in no tsconfig: left out by exclude "e2e" in tsconfig.json`
      )
    );
  });

  it('Test Server Loopback Address Match: every client, not five', () => {
    const files: Record<string, string> = {
      'perf/mock-api.js':
        "const http = require('http');\nhttp.createServer(() => {}).listen(4010, '127.0.0.1');\n",
    };
    for (const n of SIX)
      files[`e2e/c${n}.spec.ts`] =
        `export const url${n} = 'http://localhost:4010/a${n}';\n`;
    const result = TestServerLoopbackAddressMatchLaw.check(ctx(project(files)));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^perf\/mock-api\.js:2: the test server binds 127\.0\.0\.1 only on port 4010, while the client calls localhost — .* and 1 more;/
      ),
    ]);
    expect(places(result.violationDetails).sort()).toEqual(
      SIX.map(
        n =>
          `e2e/c${n}.spec.ts:1 calls http://localhost:4010 — the test server at perf/mock-api.js:2 binds 127.0.0.1 only`
      )
    );
  });

  it('Startup Request Fan-Out: each request a component starts when it opens', () => {
    const page = [
      "import { Component, OnInit, inject } from '@angular/core';", //   1
      "import { HttpClient } from '@angular/common/http';", //           2
      "@Component({ selector: 'app-p', template: '<p>p</p>' })", //      3
      'export class ProfilePage implements OnInit {', //                 4
      '  private http = inject(HttpClient);', //                         5
      '  ngOnInit(): void {', //                                         6
      ...SIX.map(n => `    this.http.get('/api/r${n}').subscribe();`), // 7-12
      '  }',
      '}',
    ].join('\n');
    const result = StartupRequestFanOutLaw.check(
      ctx(
        project({
          'package.json': manifest({
            '@angular/core': '20.0.0',
            '@angular/common': '20.0.0',
          }),
          'src/app/profile.page.ts': page,
        })
      )
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/profile\.page\.ts:4: ProfilePage starts 6 HTTP requests when it opens/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      SIX.map(
        n =>
          `src/app/profile.page.ts:${n + 6} GET '/api/r${n}' — one of 6 requests ProfilePage starts when it opens`
      )
    );
  });

  it('Independent Awaits Run Concurrently: each await of a run', () => {
    const result = IndependentAwaitsRunConcurrentlyLaw.check(
      ctx(
        project({
          'package.json': '{ "name": "svc", "private": true }',
          'src/profile.ts': [
            'export async function buildProfile(uid: string, repo: any) {', // 1
            '  const roles = await repo.roles.list(uid);', //                 2
            '  const levels = await repo.levels.list(uid);', //               3
            '  const memberships = await repo.memberships.list(uid);', //     4
            '  return { roles, levels, memberships };',
            '}',
          ].join('\n'),
        })
      )
    );
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/profile\.ts:2: 3 independent awaits/),
    ]);
    expect(places(result.violationDetails)).toEqual([
      'src/profile.ts:2 repo.roles.list() — one of 3 independent awaits in buildProfile()',
      'src/profile.ts:3 repo.levels.list() — one of 3 independent awaits in buildProfile()',
      'src/profile.ts:4 repo.memberships.list() — one of 3 independent awaits in buildProfile()',
    ]);
  });

  it('Document Read Once Per Request: each read of the document, with the call that reaches it', () => {
    const result = DocumentReadOncePerRequestLaw.check(
      ctx(
        project({
          'package.json': JSON.stringify({
            name: 'svc',
            dependencies: { firebase: '^11.0.0' },
          }),
          'src/handler.ts': [
            "import { loadPrefs } from './prefs';", //                 1
            "import * as blocks from './blocks';", //                  2
            'export async function getMe(uid: string) {', //           3
            '  const prefs = await loadPrefs(uid);', //                4
            '  const list = await blocks.loadBlocks(uid);', //         5
            '  return { prefs, list };',
            '}',
          ].join('\n'),
          'src/prefs.ts': [
            "import { doc, getDoc } from 'firebase/firestore';",
            'export async function loadPrefs(id: string) {',
            "  const snap = await getDoc(doc(db, 'users', id));", //   3
            '  return snap.data()?.prefs;',
            '}',
          ].join('\n'),
          'src/blocks.ts': [
            "import { doc, getDoc } from 'firebase/firestore';",
            'export async function loadBlocks(uid: string) {',
            "  const ref = doc(db, 'users', uid);",
            '  const snap = await getDoc(ref);', //                    4
            '  return snap.data()?.blocks;',
            '}',
          ].join('\n'),
        })
      )
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/prefs\.ts:3: users\/\{uid\} is read 2 times while serving getMe\(\)/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual([
      'src/prefs.ts:3 users/{uid} read in loadPrefs() (called at src/handler.ts:4) — one of 2 reads while serving getMe()',
      'src/blocks.ts:4 users/{uid} read in loadBlocks() (called at src/handler.ts:5) — one of 2 reads while serving getMe()',
    ]);
  });

  it('Playwright Locators User Facing: every file with implementation locators, not five', () => {
    const spec = (n: number) =>
      `import { test } from '@playwright/test';\ntest('t', async ({ page }) => {\n${"  await page.getByTestId('x').click();\n".repeat(n)}});\n`;
    const files: Record<string, string> = {
      'package.json': manifest({ '@playwright/test': '1.62.1' }),
      'playwright.config.ts': "export default { testDir: 'e2e' };",
    };
    for (const n of SIX) files[`e2e/s${n}.spec.ts`] = spec(n);
    const result = PlaywrightLocatorsUserFacingLaw.check(ctx(project(files)));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /Most getByTestId\/locator\(\): e2e\/s6\.spec\.ts \(6\), e2e\/s5\.spec\.ts \(5\), e2e\/s4\.spec\.ts \(4\), e2e\/s3\.spec\.ts \(3\), e2e\/s2\.spec\.ts \(2\)$/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      [6, 5, 4, 3, 2, 1].map(
        n => `e2e/s${n}.spec.ts:- ${n} getByTestId/locator()`
      )
    );
  });

  it('RTL Query By Role: every file with test-id/selector queries, not five', () => {
    const test = (n: number) =>
      `import { render, screen } from '@testing-library/react';\nit('r', () => {\n  render(<F />);\n${"  screen.getByTestId('x');\n".repeat(n)}});\n`;
    const files: Record<string, string> = {
      'package.json': manifest({
        react: '19.3.0',
        '@testing-library/react': '16.0.0',
      }),
    };
    for (const n of SIX) files[`src/C${n}.test.tsx`] = test(n);
    const result = RtlQueryByRoleLaw.check(ctx(project(files)));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /Most ByTestId\/querySelector: src\/C6\.test\.tsx \(6\), .*src\/C2\.test\.tsx \(2\)$/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      [6, 5, 4, 3, 2, 1].map(
        n => `src/C${n}.test.tsx:- ${n} ByTestId/querySelector`
      )
    );
  });

  it('Ionic Single Build System: each import behind "both entries are imported (N, M) … NOT judged"', () => {
    const run = runner(context => IonicSingleBuildSystemLaw.check(context));
    const result = run({
      'src/main.ts':
        "import { IonContent } from '@ionic/angular/standalone';\nexport const x = IonContent;\n",
      'src/app/share.ts':
        "import { ModalController } from '@ionic/angular';\nexport const m = ModalController;\n",
    });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^both entries are imported \(1 from '@ionic\/angular\/standalone', 1 from '@ionic\/angular'\) .* NOT judged$/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual([
      "src/main.ts:1 imports from '@ionic/angular/standalone'",
      "src/app/share.ts:1 imports from '@ionic/angular'",
    ]);
  });
});
