/**
 * Serverless Deploy Pins Resources: the judges. Each takes one deploy
 * command, definition, service YAML or GitHub Action step the law found and
 * adds to the tally what it pins, leaves to the platform defaults, or could
 * not read.
 */

import * as fs from 'fs';
import type { LawCheckContext } from '../../types/law.types';
import {
  flagValue,
  flagsOf,
  type FoundCommand,
  opaqueArguments,
  wordCount,
} from '../../utils/deployment/deploy-commands';
import {
  cloudRunServiceGaps,
  type Gap,
  type Judged,
  type Missing,
} from '../../utils/deployment/deploy-definitions';
import {
  CLOUD_RUN_DEPLOY,
  type CommandPlatform,
  DEPLOY_CLOUDRUN_ACTION,
  describeMissing,
} from '../../utils/deployment/serverless-platforms';
import { yamlEntries, type YamlEntry } from '../../utils/deployment/yaml-lines';
import { PathOperations } from '../../utils/path-operations';

/** A file that selected the law, as the gate read it. */
export interface DeployFile {
  abs: string;
  rel: string;
  name: string;
  text: string;
}

/** What the judges found across the files. */
export interface Tally {
  findings: string[];
  notes: string[];
  judged: number;
}

/** `gcloud run services replace`: applies a service YAML. */
export const REPLACE =
  /\bgcloud(?:\s+(?:alpha|beta))?\s+run\s+services\s+replace\b/;

const DEFINITION_CONSEQUENCE =
  'every deploy applies this file as the whole configuration, so what it leaves out is the platform default';

function finding(
  where: string,
  subject: string,
  missing: Missing[],
  consequence: string
): string {
  return `${where}: ${subject} leaves ${describeMissing(missing)} to the platform defaults — ${consequence}; pin them where the service is deployed`;
}

/** A deploy definition's gaps, units and notes, into the tally. */
export function judgeDefinition(
  file: DeployFile,
  judged: Judged | null,
  tally: Tally
): void {
  if (!judged) return;
  tally.judged += judged.units;
  tally.notes.push(...judged.notes);
  tally.findings.push(
    ...judged.gaps.map((gap: Gap) =>
      finding(
        `${file.rel}:${gap.line}`,
        gap.unit,
        gap.missing,
        DEFINITION_CONSEQUENCE
      )
    )
  );
}

/** One deploy command of one platform. */
export function judgeCommand(
  context: LawCheckContext,
  file: DeployFile,
  platform: CommandPlatform,
  command: FoundCommand,
  tally: Tally
): void {
  const where = `${file.rel}:${command.line}`;
  const flags = flagsOf(command.text);
  if (platform.when && !platform.when.some(flag => flags.has(flag))) return;
  const fromFile = flagsFile(context, file, command.text);
  if (fromFile === null) {
    tally.notes.push(
      `${where}: ${platform.command} reads --flags-file from a path that could not be read — not judged`
    );
    return;
  }
  fromFile.forEach(flag => flags.add(flag));
  const missing = platform.settings
    .filter(pinned => !pinned.flags.some(flag => flags.has(flag)))
    .map(pinned => ({ setting: pinned.setting, names: pinned.flags }));
  const opaque =
    missing.length > 0
      ? opaqueArguments(
          command.text,
          wordCount(command.text, platform.start),
          platform.positionals
        )
      : [];
  if (opaque.length > 0) {
    tally.notes.push(
      `${where}: ${platform.command} passes ${opaque.join(' ')}, which may carry ${describeMissing(missing)} — not judged`
    );
    return;
  }
  tally.judged++;
  if (missing.length > 0)
    tally.findings.push(
      finding(where, platform.command, missing, platform.consequence)
    );
}

/** Flags from `--flags-file` (a YAML of `--flag: value`); [] without one, null when it cannot be read. */
function flagsFile(
  context: LawCheckContext,
  file: DeployFile,
  text: string
): string[] | null {
  const path = flagValue(text, '--flags-file');
  if (path === null) return [];
  const content = resolve(context, file, path);
  if (content === null) return null;
  return [...content.matchAll(/^\s*(--[a-z][a-z0-9-]*)\s*:/gim)].map(match =>
    (match[1] ?? '').toLowerCase()
  );
}

/** A path a command names, read relative to the project root or the file's directory. */
function resolve(
  context: LawCheckContext,
  file: DeployFile,
  path: string
): string | null {
  if (/[$%{}]/.test(path)) return null;
  for (const base of [
    context.projectRoot,
    PathOperations.getDirectory(file.abs),
  ]) {
    try {
      return fs.readFileSync(PathOperations.resolve(base, path), 'utf8');
    } catch {
      // try the next base
    }
  }
  return null;
}

/** `gcloud run services replace <file>`: the service YAML it applies. */
export function judgeServicesReplace(
  context: LawCheckContext,
  file: DeployFile,
  command: FoundCommand,
  tally: Tally
): void {
  const words = command.text
    .trim()
    .split(/\s+/)
    .slice(wordCount(command.text, REPLACE));
  const path = words
    .find(
      (word, i) =>
        !word.startsWith('-') &&
        !(words[i - 1] ?? '').match(/^--?[a-z][\w-]*$/i)
    )
    ?.replace(/^["']|["']$/g, '');
  judgeServiceYaml(
    context,
    file,
    `${file.rel}:${command.line}`,
    'gcloud run services replace',
    path,
    tally
  );
}

function judgeServiceYaml(
  context: LawCheckContext,
  file: DeployFile,
  where: string,
  subject: string,
  path: string | undefined,
  tally: Tally
): void {
  const content = path ? resolve(context, file, path) : null;
  if (content === null) {
    tally.notes.push(
      `${where}: ${subject} applies a service YAML (${path ?? 'no path'}) that could not be read — not judged`
    );
    return;
  }
  tally.judged++;
  const missing = cloudRunServiceGaps(yamlEntries(content));
  if (missing.length > 0)
    tally.findings.push(
      finding(where, `${subject} ${path}`, missing, DEFINITION_CONSEQUENCE)
    );
}

/** The Cloud Run deploy GitHub Action: `flags` and `timeout` inputs, or a `metadata` service YAML. */
export function judgeDeployAction(
  context: LawCheckContext,
  file: DeployFile,
  entries: YamlEntry[],
  tally: Tally
): void {
  for (const uses of entries.filter(
    entry => entry.key === 'uses' && DEPLOY_CLOUDRUN_ACTION.test(entry.value)
  )) {
    const input = (name: string): YamlEntry | undefined =>
      entries.find(
        entry =>
          entry.item === uses.item &&
          entry.path[entry.path.length - 2] === 'with' &&
          entry.key === name
      );
    if (input('job')) continue;
    const where = `${file.rel}:${uses.line}`;
    const metadata = input('metadata');
    if (metadata) {
      judgeServiceYaml(
        context,
        file,
        where,
        'google-github-actions/deploy-cloudrun metadata',
        metadata.value,
        tally
      );
      continue;
    }
    const flagsInput = input('flags');
    const text = `${flagsInput?.value ?? ''} ${(flagsInput?.block ?? []).map(line => line.text).join(' ')}`;
    const flags = flagsOf(text);
    if (input('timeout')) flags.add('--timeout');
    const missing = CLOUD_RUN_DEPLOY.settings
      .filter(pinned => !pinned.flags.some(flag => flags.has(flag)))
      .map(pinned => ({ setting: pinned.setting, names: pinned.flags }));
    if (missing.length > 0 && /\$\{\{/.test(text)) {
      tally.notes.push(
        `${where}: the deploy-cloudrun flags input is an expression, which may carry ${describeMissing(missing)} — not judged`
      );
      continue;
    }
    tally.judged++;
    if (missing.length > 0)
      tally.findings.push(
        finding(
          where,
          'google-github-actions/deploy-cloudrun (flags input)',
          missing,
          CLOUD_RUN_DEPLOY.consequence
        )
      );
  }
}
