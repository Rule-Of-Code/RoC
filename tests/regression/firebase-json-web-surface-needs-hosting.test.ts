import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CdnCachingStrategyLaw } from '../../src/laws/performance/cdn-caching-strategy';
import { FileUtils } from '../../src/utils';
import {
  describeRequirement,
  lawRequirementsMet,
} from '../../src/utils/law-requirements';
import {
  firebaseHosting,
  REQUIRES_PRODUCTION_SUBJECT,
  REQUIRES_WEB_SURFACE,
} from '../../src/utils/production-subject-requirements';

/**
 * #547. firebase.json configures several products; only its `hosting` key
 * declares something a browser loads. A Python API whose firebase.json holds
 * Firestore rules and indexes was asked by CDN and Caching Strategy for a
 * CDN, caching headers and a service worker: both the selector
 * (REQUIRES_WEB_SURFACE) and the law's own `hasWebAssets` said yes on the
 * file name alone. Both now parse it; one that does not parse selects the
 * law (fail-closed), which then says it was not read.
 */
describe('firebase.json is a web surface only when it declares hosting', () => {
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
  );

  const pythonApi = (firebaseJson: string): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-547-'));
    roots.push(root);
    const files: Record<string, string> = {
      'pyproject.toml':
        '[project]\nname = "api"\nversion = "1.0.0"\ndependencies = ["fastapi"]\n',
      'api/main.py':
        'from fastapi import FastAPI\napp = FastAPI()\n\n@app.get("/health")\ndef health():\n    return {"ok": True}\n',
      'firebase.json': firebaseJson,
    };
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    }
    return root;
  };

  const check = (root: string) =>
    CdnCachingStrategyLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });

  const FIRESTORE_ONLY = JSON.stringify({
    firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
  });
  const WITH_HOSTING = JSON.stringify({ hosting: { public: 'public' } });

  it('a firebase.json with Firestore only makes the law not applicable', async () => {
    const result = await check(pythonApi(FIRESTORE_ONLY));

    expect(result.violations).toEqual([]);
    expect(result.message).toContain('Not applicable');
  });

  it('"hosting" under emulators is not hosting', () => {
    const root = pythonApi(
      JSON.stringify({ emulators: { hosting: { port: 5000 } } })
    );

    expect(firebaseHosting(root)).toEqual({ hosting: false, unreadable: [] });
  });

  it('a firebase.json with hosting still judges the law', async () => {
    const result = await check(pythonApi(WITH_HOSTING));

    expect(result.message).not.toContain('Not applicable');
    expect(result.violations?.length).toBeGreaterThan(0);
  });

  it('a firebase.json that does not parse is not read, never a pass', async () => {
    const result = await check(pythonApi('{ "hosting": { "public": '));

    expect(result).toMatchObject({
      judgedNothing: true,
      passed: false,
      score: 0,
    });
    expect(result.message).toMatch(/firebase\.json could not be read/);
  });

  describe('the selector (REQUIRES_WEB_SURFACE)', () => {
    it('a firebase.json with Firestore only does not select the law', () => {
      expect(
        lawRequirementsMet(REQUIRES_WEB_SURFACE, pythonApi(FIRESTORE_ONLY))
      ).toBe(false);
    });

    it('a firebase.json with hosting selects it', () => {
      expect(
        lawRequirementsMet(REQUIRES_WEB_SURFACE, pythonApi(WITH_HOSTING))
      ).toBe(true);
    });

    it('a firebase.json that does not parse selects it (fail-closed)', () => {
      expect(
        lawRequirementsMet(
          REQUIRES_WEB_SURFACE,
          pythonApi('{ "hosting": { "public": ')
        )
      ).toBe(true);
    });

    it('says what it asks for', () => {
      expect(describeRequirement(REQUIRES_WEB_SURFACE)).toContain(
        'firebase.json with a top-level "hosting" key'
      );
    });

    it('production-subject laws are not narrowed: firebase.json stays a deploy target', () => {
      // No HTTP framework, so only the deploy-target alternative can select it.
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-547-'));
      roots.push(root);
      fs.writeFileSync(path.join(root, 'firebase.json'), FIRESTORE_ONLY);

      expect(lawRequirementsMet(REQUIRES_PRODUCTION_SUBJECT, root)).toBe(true);
    });
  });
});
