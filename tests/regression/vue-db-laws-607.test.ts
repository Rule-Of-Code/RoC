/**
 * #607, P7 — three database laws read `.vue` single-file components through
 * the request-path sources: Count With An Aggregation, Document Read Once Per
 * Request and Database Query Optimization. A Firebase component that counts
 * by fetching, reads one document twice and awaits a read per loop item: each
 * law reports it at the component's line (they passed before, with the
 * ".vue not read" note). The same calls written in the template are not code.
 */
import { CountWithAggregationLaw } from '../../src/checkers/request-path-laws/count-with-aggregation';
import { DocumentReadOncePerRequestLaw } from '../../src/checkers/request-path-laws/document-read-once-per-request';
import { DatabaseQueryOptimizationLaw } from '../../src/laws/performance/database-query-optimization';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Profile.vue';
const PROFILE = [
  '<template>', //                                                                    1
  '  <p>{{ (await getDocs(q)).size }} for (const id of ids) await getDoc(doc(db, "users", id))</p>', // 2
  '</template>', //                                                                   3
  '<script setup lang="ts">', //                                                      4
  "import { doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';", //       5
  'const db = getFirestore();', //                                                    6
  'export async function countUsers(q: any) {', //                                    7
  '  return (await getDocs(q)).size;', //                                             8
  '}', //                                                                             9
  'export async function loadAll(ids: string[]) {', //                               10
  '  const out = [];', //                                                            11
  '  for (const id of ids) {', //                                                    12
  "    out.push(await getDoc(doc(db, 'users', id)));", //                            13
  '  }', //                                                                          14
  '  return out;', //                                                                15
  '}', //                                                                            16
  'export async function getMe(uid: string) {', //                                   17
  "  const a = await getDoc(doc(db, 'users', uid));", //                             18
  "  const b = await getDoc(doc(db, 'users', uid));", //                             19
  '  return [a, b];', //                                                             20
  '}', //                                                                            21
  '</script>', //                                                                    22
  '',
].join('\n');

const vueProject = (): string =>
  project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0', firebase: '^11.0.0' },
      devDependencies: { typescript: '^5.9.3' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    [COMPONENT]: PROFILE,
  });

async function judge(
  check: (c: LawCheckContext) => LawResult | Promise<LawResult>
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(ctx(vueProject())));
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT]) !== null,
  };
}

const AT = (line: number): string => `${COMPONENT}:${line}: `;

describe('#607 P7 the database laws read .vue components', () => {
  it('Count With An Aggregation: the count by fetch at line 8, not the template', async () => {
    const r = await judge(c => CountWithAggregationLaw.check(c));
    expect(r.violations).toEqual([
      expect.stringContaining(
        `${AT(8)}(await getDocs(q)).size fetches every document only to count them`
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('Document Read Once Per Request: users/{uid} read at lines 18 and 19', async () => {
    const r = await judge(c => DocumentReadOncePerRequestLaw.check(c));
    expect(r.violations).toEqual([
      expect.stringContaining(
        `${AT(18)}users/{uid} is read 2 times while serving getMe()`
      ),
    ]);
    expect(r.violations[0]).toContain(`${COMPONENT}:19 in getMe()`);
    expect(r.unread).toBe(false);
  });

  it('Database Query Optimization: the component uses a database, and the read in the loop is N+1', async () => {
    const r = await judge(c => DatabaseQueryOptimizationLaw.check(c));
    const nPlusOne = r.violations.filter(v => /\(N\+1\)/.test(v));
    expect(nPlusOne).toEqual([
      expect.stringContaining(
        `${AT(13)}await getDoc() runs once per item of the for-of loop at line 12 in loadAll()`
      ),
    ]);
    expect(r.unread).toBe(false);
  });
});
