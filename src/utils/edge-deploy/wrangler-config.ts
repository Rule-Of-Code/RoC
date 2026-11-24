/**
 * What a Wrangler configuration leaves Wrangler to decide about a Worker's
 * public addresses, and a secret uploaded before the Worker exists.
 *
 * From the Wrangler configuration reference: `workers_dev` "defaults to true
 * when the configuration has no route or routes"; `preview_urls` (Version
 * URLs and workers.dev Preview URLs) — "if omitted, Wrangler does not change
 * an existing setting" and its initial value depends on `workers_dev`. Both
 * are inheritable keys: an `[env.x]` section without them takes the
 * top-level value, so the top level is what is judged. Wrangler reads
 * wrangler.toml, and wrangler.json / wrangler.jsonc (3.91.0 and later).
 *
 * From the Wrangler source (secret/index.ts): `wrangler secret put` (and
 * `secret bulk`) for a Worker that does not exist asks to create it, and in
 * a non-interactive / CI context the answer defaults to yes — it uploads an
 * empty Worker (`export default { fetch() {} }`) to hold the secret.
 */

import { FileSystemOperations } from '../file-system-operations';
import {
  commandsInText,
  flagValue,
  type FoundCommand,
} from '../deployment/deploy-commands';
import { QUOTE_LENGTH } from './proxy-target';

export const PUBLIC_URL_KEYS = ['workers_dev', 'preview_urls'] as const;

const RUNNER = String.raw`(?:(?:npx|bunx|pnpm(?:\s+(?:exec|dlx))?|yarn)\s+)?`;
export const SECRET_UPLOAD = new RegExp(
  String.raw`\b${RUNNER}wrangler\s+secret\s+(?:put|bulk)\b`
);
const DEPLOY = new RegExp(
  String.raw`\b${RUNNER}wrangler\s+(?:deploy|publish)\b`
);

/** The keys a configuration sets at its top level, and the line to report; null when it cannot be read. */
export function topLevelKeys(
  rel: string,
  text: string
): { keys: Set<string>; line: number } | null {
  if (rel.endsWith('.toml')) return tomlTopLevel(text);
  try {
    const parsed: unknown = JSON.parse(
      FileSystemOperations.stripJsonComments(text.replace(/^﻿/, ''))
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return null;
    const nameLine = text
      .split(/\r?\n/)
      .findIndex(line => /^\s*"name"\s*:/.test(line));
    return {
      keys: new Set(Object.keys(parsed)),
      line: nameLine >= 0 ? nameLine + 1 : 1,
    };
  } catch {
    return null;
  }
}

/** TOML keys before the first table header (`[env.x]`, `[[routes]]`). */
function tomlTopLevel(text: string): { keys: Set<string>; line: number } {
  const keys = new Set<string>();
  let line = 1;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i] ?? '';
    if (/^\s*\[/.test(current)) break;
    const key = /^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_-]+))\s*=/.exec(
      current
    );
    const name = key?.[1] ?? key?.[2] ?? key?.[3];
    if (!name) continue;
    keys.add(name);
    if (name === 'name') line = i + 1;
  }
  return { keys, line };
}

/** Which Worker a wrangler command acts on: --name, --env and --config as written. */
function workerOf(command: FoundCommand): string {
  const value = (...names: string[]): string =>
    names
      .map(name => flagValue(command.text, name))
      .find(found => found !== null) ?? '';
  return `${value('--name')}|${value('--env', '-e')}|${value('--config', '-c')}`;
}

export interface SecretOrder {
  line: number;
  verdict: 'after-deploy' | 'before-deploy' | 'no-deploy';
  command: string;
}

/** Each secret upload in a script, against the deploys of the same Worker in the same file. */
export function secretUploads(text: string): SecretOrder[] {
  const deploys = commandsInText(text, DEPLOY).map(command => ({
    line: command.line,
    worker: workerOf(command),
  }));
  return commandsInText(text, SECRET_UPLOAD).map(secret => {
    const same = deploys.filter(deploy => deploy.worker === workerOf(secret));
    const verdict: SecretOrder['verdict'] =
      same.length === 0
        ? 'no-deploy'
        : same.some(deploy => deploy.line < secret.line)
          ? 'after-deploy'
          : 'before-deploy';
    return {
      line: secret.line,
      verdict,
      command: secret.text.trim().replace(/\s+/g, ' ').slice(0, QUOTE_LENGTH),
    };
  });
}
