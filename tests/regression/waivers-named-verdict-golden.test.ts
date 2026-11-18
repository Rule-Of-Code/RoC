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
 * Record (only ever from code that predates the change being guarded):
 *   ROC_RECORD_GOLDEN=1 npx jest tests/regression/waivers-named-verdict-golden.test.ts
 */
import fs from 'fs';
import path from 'path';
import { GOLDEN_DIR, auditFixture, normalizeJson, normalizeText, stubLawChecks } from './waivers-named-verdict.harness';

const MODES: Array<{ name: string; mode: string | undefined; laws: Record<string, unknown> }> = [
  { name: 'full', mode: 'full', laws: {} },
  { name: 'pre-commit', mode: 'pre-commit', laws: {} },
  { name: 'pre-push', mode: 'pre-push', laws: {} },
  { name: 'fast', mode: 'fast', laws: {} },
];

const RECORD = process.env.ROC_RECORD_GOLDEN === '1';

describe('#350 golden: a W = 0 project is unchanged in every mode', () => {
  stubLawChecks();

  it.each(MODES)('$name', async ({ name, mode, laws }) => {
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
    expect(text).toBe(fs.readFileSync(textFile, 'utf8'));
    expect(json).toEqual(JSON.parse(fs.readFileSync(jsonFile, 'utf8')));
  }, 60000);
});
