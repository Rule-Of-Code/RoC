/**
 * #350 — a project with NO waivers must keep its output.
 *
 * The goldens under `__golden__/waivers-named-verdict/` were recorded from the
 * engine BEFORE #350 (base of the change), for one passing W = 0 project in
 * every mode a user can run: full, pre-commit, pre-push, fast. This test
 * replays the same project and compares the console text and the JSON with
 * them. Every law but the two always-on meta-gates is stubbed to pass, so the
 * output depends on the engine and the meta-gates only, never on the content
 * of a law that may change in another wave.
 *
 * The ONLY differences #350 is allowed to make for a W = 0 project, each
 * asserted to its exact value and then removed before the comparison:
 *   console  one line under the summary, the Audit Liveness floor and its
 *            source (asked for explicitly: the floor is printed on a pass too);
 *   JSON     the new fields — top-level `verdict`, `scope.applicableBeforeWaivers`,
 *            `scope.waivedLaws` (empty), `scope.liveness` — and the message of
 *            the Audit Liveness result, which now names the floor instead of
 *            "compliance verified".
 *   8.0.0    `scope.warningLaws` and `scope.judgedNothingLaws` (empty here) and
 *            `stats.judgedNothingLaws` (0): the lists behind the verdict.
 * Everything else must be byte-for-byte what it was, the victory art included.
 *
 * Record (only ever from code that predates the change being guarded):
 *   ROC_RECORD_GOLDEN=1 npx jest tests/regression/waivers-named-verdict-golden.test.ts
 */
import fs from 'fs';
import path from 'path';
import {
  GOLDEN_DIR,
  auditFixture,
  normalizeJson,
  normalizeText,
  stubLawChecks,
} from './waivers-named-verdict.harness';

interface Mode {
  name: string;
  mode: string | undefined;
  laws: Record<string, unknown>;
  verdict: string;
  liveness: string;
}

const DEFAULT_FLOOR =
  'floor 19 — default 25% of 73 stack-applicable laws (meta-gates included, counted before waivers)';
const MODES: Mode[] = [
  {
    name: 'full',
    mode: 'full',
    laws: {},
    verdict: 'compliance',
    liveness: DEFAULT_FLOOR,
  },
  {
    name: 'pre-commit',
    mode: 'pre-commit',
    laws: {},
    verdict: 'compliance',
    liveness: DEFAULT_FLOOR,
  },
  {
    name: 'pre-push',
    mode: 'pre-push',
    laws: {},
    verdict: 'compliance',
    liveness: DEFAULT_FLOOR,
  },
  {
    name: 'fast',
    mode: 'fast',
    laws: {},
    verdict: 'partial',
    liveness: 'floor 0 — narrowed by paretoMode; set laws.minLawsChecked',
  },
];

const RECORD = process.env.ROC_RECORD_GOLDEN === '1';

describe('#350 golden: a W = 0 project is unchanged in every mode', () => {
  stubLawChecks();

  it.each(MODES)(
    '$name',
    async ({ name, mode, laws, verdict, liveness }) => {
      const run = await auditFixture({ mode, laws });
      const text = normalizeText(run.text, run.root);
      const json = normalizeJson(run.json, run.root);
      const textFile = path.join(GOLDEN_DIR, `w0-${name}.txt`);
      const jsonFile = path.join(GOLDEN_DIR, `w0-${name}.json`);

      if (RECORD) {
        fs.mkdirSync(GOLDEN_DIR, { recursive: true });
        fs.writeFileSync(textFile, text);
        fs.writeFileSync(jsonFile, `${JSON.stringify(json, null, 2)}\n`);
        return;
      }

      expect(run.exitCode).toBe(0);

      // The allowed console line, exactly once, then out.
      const livenessLine = `  Audit Liveness: ${liveness}`;
      const lines = text.split('\n');
      expect(lines.filter(line => line === livenessLine)).toHaveLength(1);
      expect(lines.filter(line => line !== livenessLine).join('\n')).toBe(
        fs.readFileSync(textFile, 'utf8')
      );

      // The allowed JSON fields, to their exact values, then out.
      const { verdict: actualVerdict, ...rest } = json;
      expect(actualVerdict).toBe(verdict);
      const {
        applicableBeforeWaivers,
        waivedLaws,
        liveness: livenessJson,
        // 8.0.0: the laws that warned and that judged nothing, by name
        warningLaws: scopeWarnings,
        judgedNothingLaws: scopeJudgedNothing,
        ...scope
      } = rest.scope;
      expect(scopeWarnings).toEqual([]);
      expect(scopeJudgedNothing).toEqual([]);
      const { judgedNothingLaws: statsJudgedNothing, ...stats } = rest.stats;
      expect(statsJudgedNothing).toBe(0);
      expect(applicableBeforeWaivers).toBe(scope.applicableLaws);
      expect(waivedLaws).toEqual([]);
      expect(livenessJson.applicableLaws).toBe(73);
      const livenessResult = rest.results.find(
        (r: { lawTitle?: string }) => r.lawTitle === 'Audit Liveness Assertion'
      );
      expect(livenessResult.message).toBe(
        `Audit Liveness Assertion: ${scope.selectedLaws} laws selected — ${liveness}`
      );
      livenessResult.message = 'Audit Liveness Assertion compliance verified';
      expect({ ...rest, scope, stats }).toEqual(
        JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
      );
    },
    60000
  );
});
