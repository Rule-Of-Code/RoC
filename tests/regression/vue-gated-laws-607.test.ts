/**
 * #607 — four laws gated by `requires.anyFileContaining` over script files are
 * selected by `.vue` single-file components too, and judge them.
 *
 * Proxy Target Keeps Origin Host, Independent Awaits Run Concurrently,
 * Database Read Cache Safety and Async Cache Single-Flight were selected only
 * by `.ts` / `.js` files. In a project that keeps that code in `<script>`
 * blocks the law was not selected and nothing said so. Each case here is a
 * project whose only file with the pattern is a component:
 *  - the law is selected,
 *  - it reports at the component's own line, and gets no ".vue not read" note,
 *  - the same text in the `<template>` alone selects nothing: it is not code.
 */
import { AsyncCacheSingleFlightLaw } from '../../src/checkers/cache-harness-laws/async-cache-single-flight';
import { DatabaseReadCacheSafetyLaw } from '../../src/checkers/cache-harness-laws/database-read-cache-safety';
import { ProxyTargetKeepsOriginHostLaw } from '../../src/checkers/edge-deploy-laws/proxy-target-keeps-origin-host';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { CACHE_HARNESS_LAWS } from '../../src/data/cache-harness-laws';
import { EDGE_DEPLOY_SECURITY_LAWS } from '../../src/data/edge-deploy-security-laws';
import { REQUEST_PATH_LAWS } from '../../src/data/request-path-laws';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import type {
  EnhancedConstitutionalLaw,
  LawRequirement,
} from '../../src/types/enhanced-law.types';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const VUE_PACKAGE = (deps: Record<string, string> = {}): string =>
  JSON.stringify({
    name: 'app',
    version: '1.0.0',
    dependencies: { vue: '^3.5.0', ...deps },
    devDependencies: { vite: '^7.0.0', typescript: '^5.9.3' },
  });
const MAIN =
  "import { createApp } from 'vue';\nexport const app = createApp;\n";
const COMPONENT = 'src/components/Panel.vue';

/**
 * A component: one template line, then `<script lang="ts">`. Script line i
 * is file line 4 + i.
 */
const sfc = (template: string, script: string[]): string =>
  [
    '<template>',
    `  <pre>${template}</pre>`,
    '</template>',
    '<script lang="ts">',
    ...script,
    '</script>',
    '',
  ].join('\n');

function vueProject(
  component: string,
  deps: Record<string, string> = {}
): string {
  return project({
    'package.json': VUE_PACKAGE(deps),
    'src/main.ts': MAIN,
    [COMPONENT]: component,
  });
}

async function judge(
  root: string,
  check: (c: LawCheckContext) => LawResult
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(ctx(root)));
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT]) !== null,
  };
}

const requiresOf = (
  laws: readonly EnhancedConstitutionalLaw[],
  fn: string
): LawRequirement | undefined =>
  laws.find(law => law.checkFunction === fn)?.requires;

const at = (line: number): RegExp =>
  new RegExp(`^src/components/Panel\\.vue:${line}: `);

interface Case {
  law: string;
  requires: LawRequirement | undefined;
  check: (c: LawCheckContext) => LawResult;
  deps?: Record<string, string>;
  script: string[];
  /** The script's code as template text: must select nothing. */
  templateText: string;
  /** What the law reports for the script. */
  expected: RegExp[];
}

const CASES: Case[] = [
  {
    law: 'Proxy Target Keeps Origin Host',
    requires: requiresOf(
      EDGE_DEPLOY_SECURITY_LAWS,
      'ProxyTargetKeepsOriginHostLaw.check'
    ),
    check: c => ProxyTargetKeepsOriginHostLaw.check(c),
    script: [
      'export async function forward(request: Request, origin: string, secret: string) {', // 5
      '  const incoming = new URL(request.url);', //                                         6
      '  const target = new URL(incoming.pathname + incoming.search, origin);', //           7
      "  return fetch(target, { headers: { 'x-origin-verify': secret } });", //             8
      '}', //                                                                                9
    ],
    templateText:
      'const target = new URL(incoming.pathname + incoming.search, origin); fetch(target)',
    expected: [
      new RegExp(
        `${at(7).source}the upstream URL is resolved from the incoming request`
      ),
    ],
  },
  {
    law: 'Independent Awaits Run Concurrently',
    requires: requiresOf(
      REQUEST_PATH_LAWS,
      'IndependentAwaitsRunConcurrentlyLaw.check'
    ),
    check: c => IndependentAwaitsRunConcurrentlyLaw.check(c),
    script: [
      'export async function buildProfile(uid: string, repo: any) {', // 5
      '  const roles = await repo.roles.list(uid);', //                 6
      '  const levels = await repo.levels.list(uid);', //               7
      '  return { roles, levels };', //                                 8
      '}', //                                                           9
    ],
    templateText:
      'async function buildProfile(uid) { await repo.roles.list(uid) }',
    expected: [
      new RegExp(
        `${at(6).source}2 independent awaits .* in buildProfile\\(\\) — repo\\.roles\\.list\\(\\) \\(line 6\\), repo\\.levels\\.list\\(\\) \\(line 7\\)`
      ),
    ],
  },
  {
    law: 'Database Read Cache Safety',
    requires: requiresOf(
      CACHE_HARNESS_LAWS,
      'DatabaseReadCacheSafetyLaw.check'
    ),
    check: c => DatabaseReadCacheSafetyLaw.check(c),
    deps: { 'firebase-admin': '13.0.0' },
    script: [
      "import { getFirestore } from 'firebase-admin/firestore';", //  5
      'const db = getFirestore();', //                                6
      'const profileCache = new Map<string, unknown>();', //          7
      'export async function loadProfile(id: string) {', //           8
      '  const hit = profileCache.get(id);', //                       9
      '  if (hit) return hit;', //                                   10
      "  const snap = await db.collection('profiles').doc(id).get();", // 11
      '  const data = snap.data();', //                              12
      '  profileCache.set(id, data);', //                            13
      '  return data;', //                                           14
      '}', //                                                        15
    ],
    templateText: 'const profileCache = new Map()',
    expected: [
      new RegExp(`${at(7).source}.*no expiry`),
      new RegExp(`${at(7).source}.*no size bound`),
      new RegExp(`${at(7).source}.*no write path clears it`),
    ],
  },
  {
    law: 'Async Cache Single-Flight',
    requires: requiresOf(CACHE_HARNESS_LAWS, 'AsyncCacheSingleFlightLaw.check'),
    check: c => AsyncCacheSingleFlightLaw.check(c),
    script: [
      'declare function loadProfile(id: string): Promise<unknown>;', // 5
      'const profiles = new Map<string, unknown>();', //                6
      'export async function getProfile(id: string) {', //             7
      '  if (profiles.has(id)) return profiles.get(id);', //            8
      '  const value = await loadProfile(id);', //                      9
      '  profiles.set(id, value);', //                                 10
      '  return value;', //                                            11
      '}', //                                                          12
    ],
    templateText:
      'if (profiles.has(id)) { const v = await loadProfile(id); profiles.set(id, v) }',
    expected: [
      new RegExp(
        `${at(10).source}getProfile checks profiles \\(line 8\\) and stores into it only after awaiting loadProfile\\(…\\) \\(line 9\\)`
      ),
    ],
  },
];

describe('#607 laws gated by script files are selected by .vue components', () => {
  describe.each(CASES)('$law', c => {
    it('is selected where a component is the only file with the pattern', () => {
      expect(c.requires).toBeDefined();
      expect(
        lawRequirementsMet(c.requires, vueProject(sfc('', c.script), c.deps))
      ).toBe(true);
    });

    it("reports at the component's own line, without the not-read note", async () => {
      const r = await judge(vueProject(sfc('', c.script), c.deps), c.check);
      expect(r.violations).toEqual(
        c.expected.map(re => expect.stringMatching(re))
      );
      expect(r.unread).toBe(false);
    });

    it('the same text in the template alone selects nothing', () => {
      expect(
        lawRequirementsMet(
          c.requires,
          vueProject(sfc(c.templateText, ['export const a = 1;']), c.deps)
        )
      ).toBe(false);
    });
  });

  it('a line scan of the model reads the script, not the template: a cache written as template text is not a cache', () => {
    const dbCase = CASES.find(c => c.law === 'Database Read Cache Safety');
    const component = [
      '<template>',
      '  <pre>',
      'const sessionCache = new Map<string, unknown>();',
      '  </pre>',
      '</template>',
      '<script lang="ts">',
      ...(dbCase?.script ?? []),
      '</script>',
      '',
    ].join('\n');
    const result = DatabaseReadCacheSafetyLaw.check(
      ctx(vueProject(component, dbCase?.deps))
    );
    expect(result.metrics).toEqual(
      expect.objectContaining({ caches: 1, databaseReadCaches: 1 })
    );
    expect(result.violations).toHaveLength(3);
    for (const violation of result.violations ?? [])
      expect(violation).toMatch(/^src\/components\/Panel\.vue:9: /);
  });
});
