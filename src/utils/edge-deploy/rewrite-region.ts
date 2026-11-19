/**
 * Where a hosting rewrite sends traffic, and where the repository deploys
 * the service it names.
 *
 * Rewrites that pin a serverless region (a registry):
 *   - Firebase Hosting `rewrites[].run` — `serviceId` and `region`; Firebase
 *     documents `region` as optional, "if omitted, default is us-central1".
 *   - A Cloud Run deterministic URL as a rewrite / redirect destination in
 *     vercel.json, netlify.toml or a Netlify `_redirects` file — Cloud Run
 *     documents the form `https://[TAG---]SERVICE_NAME-PROJECT_NUMBER.REGION.run.app`.
 *     (Vercel and Netlify rewrites have no region field of their own; the
 *     region is in the URL. The other Cloud Run URL form, SERVICE_IDENTIFIER.run.app,
 *     carries no readable region and is not read.)
 *
 * Deploy configuration read (a registry): `gcloud [alpha|beta] run deploy
 * SERVICE --region R` in scripts, CI YAML (also the Cloud Build
 * `entrypoint` + `args` form), Makefiles and package.json scripts; the
 * google-github-actions/deploy-cloudrun action's `service` and `region`
 * inputs (its documented default region is us-central1). A `$VAR`,
 * `${VAR}`, `${VAR:-default}` or `${{ env.VAR }}` value is resolved from an
 * assignment or YAML key of that name in the same file; anything else is
 * left unknown, never guessed.
 */

import {
  argsCommands,
  commandsInText,
  flagValue,
  foldedLines,
  type FoundCommand,
  wordCount,
} from '../deployment/deploy-commands';
import { yamlEntries } from '../deployment/yaml-lines';
import { lineAt } from './gate-files';

export const DEFAULT_REGION = 'us-central1';

export interface RewriteTarget {
  service: string;
  region: string;
  /** The region was omitted and is the documented default. */
  defaulted: boolean;
  line: number;
}

export interface DeployTarget {
  service: string | null;
  region: string | null;
  line: number;
  via: string;
}

/** A Cloud Run deterministic URL: service, project number, region. */
export const RUN_APP_URL = String.raw`https?://(?:[a-z0-9-]+---)?([a-z0-9][a-z0-9-]*)-(\d+)\.([a-z]+-[a-z]+\d+)\.run\.app`;

const RUN_DEPLOY = /\bgcloud(?:\s+(?:alpha|beta))?\s+run\s+deploy\b/;
const DEPLOY_ACTION = /^["']?google-github-actions\/deploy-cloudrun@/;

type HostingSite = {
  rewrites?: Array<{ run?: { serviceId?: unknown; region?: unknown } }>;
};

/** Firebase Hosting `run` rewrites; null when firebase.json cannot be parsed. */
export function firebaseRunRewrites(text: string): RewriteTarget[] | null {
  let parsed: { hosting?: HostingSite | HostingSite[] };
  try {
    parsed = JSON.parse(text.replace(/^﻿/, '')) as {
      hosting?: HostingSite | HostingSite[];
    };
  } catch {
    return null;
  }
  const sites = Array.isArray(parsed.hosting)
    ? parsed.hosting
    : parsed.hosting
      ? [parsed.hosting]
      : [];
  const lines = [...text.matchAll(/"serviceId"\s*:/g)].map(match =>
    lineAt(text, match.index ?? 0)
  );
  let seen = 0;
  const targets: RewriteTarget[] = [];
  for (const rewrite of sites.flatMap(site =>
    Array.isArray(site?.rewrites) ? site.rewrites : []
  )) {
    const run = rewrite?.run;
    if (!run || run.serviceId === undefined) continue;
    const line = lines[seen++] ?? 1;
    if (typeof run.serviceId !== 'string') continue;
    const region = typeof run.region === 'string' ? run.region : DEFAULT_REGION;
    targets.push({
      service: run.serviceId,
      region,
      defaulted: typeof run.region !== 'string',
      line,
    });
  }
  return targets;
}

/** Cloud Run deterministic URLs written in a hosting rewrite / redirect file. */
export function runAppUrlRewrites(text: string): RewriteTarget[] {
  return [...text.matchAll(new RegExp(RUN_APP_URL, 'g'))].map(match => ({
    service: match[1] ?? '',
    region: match[3] ?? '',
    defaulted: false,
    line: lineAt(text, match.index ?? 0),
  }));
}

/** A value as written, with `$VAR`-style references resolved from the same file; null when unknown. */
export function resolveValue(
  raw: string | null | undefined,
  text: string,
  depth = 0
): string | null {
  if (!raw) return null;
  const value = raw.replace(/^["']|["']$/g, '');
  if (!value.includes('$')) return value;
  const reference =
    /^\$\{\{\s*env\.([A-Za-z_]\w*)\s*\}\}$|^\$\{([A-Za-z_]\w*)(?::?-([^}]*))?\}$|^\$([A-Za-z_]\w*)$/.exec(
      value
    );
  if (!reference || depth > 2) return null;
  const name = reference[1] ?? reference[2] ?? reference[4] ?? '';
  const assigned = new RegExp(
    String.raw`^[ \t]*(?:-[ \t]+)?(?:export[ \t]+)?${name}[ \t]*[:=][ \t]*(["']?)([^\s"'#]+)\1`,
    'm'
  ).exec(text);
  const resolved = assigned ? resolveValue(assigned[2], text, depth + 1) : null;
  return (
    resolved ??
    (reference[3] !== undefined && reference[3] !== '' ? reference[3] : null)
  );
}

/** The first positional argument after the command words (`gcloud run deploy SERVICE`). */
function firstPositional(command: FoundCommand): string | null {
  const words = command.text
    .trim()
    .split(/\s+/)
    .slice(wordCount(command.text, RUN_DEPLOY));
  const first = words[0];
  return first && !first.startsWith('-')
    ? first.replace(/^["']|["']$/g, '')
    : null;
}

function fromCommand(command: FoundCommand, text: string): DeployTarget {
  return {
    service: resolveValue(firstPositional(command), text),
    region: resolveValue(flagValue(command.text, '--region'), text),
    line: command.line,
    via: 'gcloud run deploy',
  };
}

/** Every Cloud Run deploy target a file declares. */
export function cloudRunDeploys(rel: string, text: string): DeployTarget[] {
  if (!/\.ya?ml$/i.test(rel))
    return commandsInText(text, RUN_DEPLOY).map(command =>
      fromCommand(command, text)
    );
  const entries = yamlEntries(text);
  const commands = [
    ...commandsInText(text, RUN_DEPLOY, foldedLines(entries)),
    ...argsCommands(entries).filter(command => RUN_DEPLOY.test(command.text)),
  ];
  const actions = entries
    .filter(entry => entry.key === 'uses' && DEPLOY_ACTION.test(entry.value))
    .flatMap(uses => {
      const input = (name: string): string | undefined =>
        entries.find(
          entry =>
            entry.item === uses.item &&
            entry.path[entry.path.length - 2] === 'with' &&
            entry.key === name
        )?.value;
      const service = input('service');
      if (service === undefined) return [];
      const region = input('region');
      return [
        {
          service: resolveValue(service, text),
          region:
            region === undefined ? DEFAULT_REGION : resolveValue(region, text),
          line: uses.line,
          via: 'deploy-cloudrun',
        },
      ];
    });
  return [...commands.map(command => fromCommand(command, text)), ...actions];
}
