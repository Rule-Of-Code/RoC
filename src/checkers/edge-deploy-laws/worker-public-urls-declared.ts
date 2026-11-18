/**
 * Worker Public URLs Declared
 *
 * A Worker deployed from a configuration that does not set `workers_dev`
 * and `preview_urls` gets the addresses Wrangler decides: a public
 * *.workers.dev URL when there are no routes, and preview URLs per version.
 * For a Worker that fronts a private origin, each is an extra public entry
 * point nobody reviewed. A secret uploaded before the first deploy creates
 * an empty Worker in CI. What Wrangler does is quoted in
 * utils/edge-deploy/wrangler-config.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { gateFiles } from '../../utils/edge-deploy/gate-files';
import { REQUIRES_WRANGLER_CONFIG } from '../../utils/edge-deploy/requirements';
import {
  PUBLIC_URL_KEYS,
  secretUploads,
  topLevelKeys,
} from '../../utils/edge-deploy/wrangler-config';
import {
  EdgeDeployLawBase,
  newTally,
  type Tally,
} from './edge-deploy-law-base';

const CONFIG = /(?:^|\/)wrangler\.(?:toml|jsonc?)$/;

export class WorkerPublicUrlsDeclaredLaw extends EdgeDeployLawBase {
  static readonly LAW_NAME = 'Worker Public URLs Declared';

  static check(context: LawCheckContext): LawResult {
    const tally = newTally();
    const files = gateFiles(context, REQUIRES_WRANGLER_CONFIG);
    let configs = 0;
    for (const file of files) {
      if (CONFIG.test(file.rel)) {
        configs++;
        this.config(file.rel, file.content, tally);
      } else {
        this.script(file.rel, file.content, tally);
      }
    }
    return this.conclude(context, {
      name: this.LAW_NAME,
      category: 'DEPLOYMENT',
      tally,
      filesRead: files.length,
      subject: 'a wrangler configuration or secret upload',
      unit: 'wrangler configuration(s) / secret upload(s) judged',
      notSeen:
        'routes and custom domains, settings changed in the dashboard, the order of steps split across files or jobs',
      recommendations: [
        'Set workers_dev and preview_urls at the top level of the wrangler configuration (false for a Worker that fronts a private origin), and declare its routes explicitly',
        'Deploy the Worker before uploading its secrets (wrangler deploy, then wrangler secret put)',
      ],
      metrics: { configurations: configs },
    });
  }

  private static config(rel: string, text: string, tally: Tally): void {
    const read = topLevelKeys(rel, text);
    if (!read) {
      tally.notes.push(
        `${rel}: could not be parsed as a wrangler configuration — not judged`
      );
      return;
    }
    tally.judged++;
    const missing = PUBLIC_URL_KEYS.filter(key => !read.keys.has(key));
    if (missing.length === 0) return;
    tally.findings.push(
      `${rel}:${read.line}: ${missing.join(' and ')} not set at the top level — Wrangler then decides the Worker's public addresses (workers.dev is on by default when there are no routes; preview URLs keep whatever setting exists or follow workers_dev); set ${missing.length > 1 ? 'both' : 'it'} explicitly`
    );
  }

  private static script(rel: string, text: string, tally: Tally): void {
    for (const upload of secretUploads(text)) {
      if (upload.verdict === 'no-deploy') {
        tally.notes.push(
          `${rel}:${upload.line}: ${upload.command} — no wrangler deploy of the same Worker in this file, so the order is not judged`
        );
        continue;
      }
      tally.judged++;
      if (upload.verdict === 'before-deploy') {
        tally.findings.push(
          `${rel}:${upload.line}: ${upload.command} runs before the first wrangler deploy of the same Worker in this file — on a Worker that does not exist yet, Wrangler creates an empty one in a non-interactive run; deploy first, then upload the secret`
        );
      }
    }
  }
}
