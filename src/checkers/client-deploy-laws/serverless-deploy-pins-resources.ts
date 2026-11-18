/**
 * Serverless Deploy Pins Resources
 *
 * A serverless deploy that leaves cpu, memory, concurrency, timeout or the
 * instance cap out of its command relies on the platform's defaults. An
 * existing service keeps what it has; a new one — another region, a
 * recreated service — silently starts on the defaults, and a comparison
 * between the two measures the settings, not the code.
 *
 * Read: deploy commands in CI files, shell/PowerShell scripts, Makefiles and
 * package.json scripts, the Cloud Build `entrypoint` + `args` form, the Cloud
 * Run deploy GitHub Action, and deploy definitions (Cloud Run service YAML,
 * SAM/CloudFormation, serverless.yml, host.json). The platforms and their
 * flags are a registry (utils/deployment/serverless-platforms).
 */

import * as fs from 'fs';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ciConfigPaths } from '../../utils/project-discovery';
import {
  argsCommands,
  commandsInText,
  flagValue,
  flagsOf,
  foldedLines,
  type FoundCommand,
  opaqueArguments,
  wordCount,
} from '../../utils/deployment/deploy-commands';
import {
  cloudRunServiceGaps,
  type Gap,
  hostJsonGaps,
  type Judged,
  type Missing,
  samJsonGaps,
  samYamlGaps,
  serverlessFrameworkGaps,
} from '../../utils/deployment/deploy-definitions';
import {
  CLOUD_RUN_DEPLOY,
  COMMAND_PLATFORMS,
  type CommandPlatform,
  DEPLOY_CLOUDRUN_ACTION,
  DEPLOY_FILE_GLOBS,
  describeMissing,
  LAMBDA_RESOURCE_TYPES,
} from '../../utils/deployment/serverless-platforms';
import { yamlEntries, type YamlEntry } from '../../utils/deployment/yaml-lines';
import { FileFilterUtils } from '../../utils/file-filter-utils';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { withNotes } from '../../utils/ionic/law-notes';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

interface DeployFile {
  abs: string;
  rel: string;
  name: string;
  text: string;
}

interface Tally {
  findings: string[];
  notes: string[];
  judged: number;
}

const NOT_SOURCE = [
  '**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**', '**/.aws-sam/**', '**/cdk.out/**', '**/.serverless/**',
  '**/.venv/**', '**/venv/**', '**/vendor/**', '**/.terraform/**', '**/.angular/**', '**/.nx/**', '**/package-lock.json',
];
/** Test trees hold fixtures, not the project's deploy. */
const TEST_TREES = ['**/test/**', '**/tests/**', '**/e2e/**', '**/__fixtures__/**', '**/fixtures/**'];
const MAX_BYTES = 2 * 1024 * 1024;
const REPLACE = /\bgcloud(?:\s+(?:alpha|beta))?\s+run\s+services\s+replace\b/;
const YAML_FILE = /\.ya?ml$/i;
const SHELL_FILE = /(?:\.(?:sh|bash|ps1|mk)|^(?:gnu)?makefile)$/i;

function readFile(context: LawCheckContext, abs: string): DeployFile | null {
  try {
    if (fs.statSync(abs).size > MAX_BYTES) return null;
    const rel = PathOperations.getRelative(context.projectRoot, abs).replace(/\\/g, '/');
    return { abs, rel, name: (rel.split('/').pop() ?? '').toLowerCase(), text: fs.readFileSync(abs, 'utf8') };
  } catch {
    return null;
  }
}

/**
 * The project's own ignores (ignores.global and this law's ignores.byRule) and
 * test trees. Not the scanners' built-in code ignores: those leave out
 * scripts/, which is where deploy scripts live.
 */
function ignored(context: LawCheckContext, rel: string): boolean {
  const ignores = context.config.ignores ?? { global: [] };
  const byRule = (ignores as { byRule?: Record<string, string[]> }).byRule ?? {};
  const keys = [context.lawId, FileFilterUtils.currentLawConfigKey].filter((key): key is string => Boolean(key));
  const patterns = [...TEST_TREES, ...(ignores.global ?? []), ...keys.flatMap(key => byRule[key] ?? [])];
  return patterns.some(pattern => minimatch(rel, pattern, { dot: true }));
}

/** Every file a deploy command or definition can live in, through the project's ignores. */
function deployFiles(context: LawCheckContext): DeployFile[] {
  const root = context.projectRoot;
  const ci = ciConfigPaths(root, context.config).flatMap(path =>
    FileUtils.isDirectory(path) ? glob.sync('*.{yml,yaml}', { cwd: path, absolute: true }) : [path]
  );
  const found = glob.sync([...DEPLOY_FILE_GLOBS], { cwd: root, absolute: true, dot: true, nodir: true, ignore: NOT_SOURCE });
  const unique = [...new Set([...ci, ...found].map(path => PathOperations.normalize(path)))];
  return unique
    .filter(abs => !ignored(context, PathOperations.getRelative(root, abs).replace(/\\/g, '/')))
    .map(abs => readFile(context, abs))
    .filter((file): file is DeployFile => file !== null);
}

function finding(where: string, subject: string, missing: Missing[], consequence: string): string {
  return `${where}: ${subject} leaves ${describeMissing(missing)} to the platform defaults — ${consequence}; pin them where the service is deployed`;
}

const DEFINITION_CONSEQUENCE = 'every deploy applies this file as the whole configuration, so what it leaves out is the platform default';

export class ServerlessDeployPinsResourcesLaw extends LawBase {
  static readonly LAW_NAME = 'Serverless Deploy Pins Resources';

  static check(context: LawCheckContext): LawResult {
    const tally: Tally = { findings: [], notes: [], judged: 0 };
    for (const file of deployFiles(context)) this.judgeFile(context, file, tally);
    if (tally.judged === 0) {
      const result = this.createResult(
        [
          'found no serverless deploy command (gcloud run deploy / services replace, aws lambda create-function, az functionapp create --flexconsumption-location, the Cloud Run deploy action) and no deploy definition (Cloud Run service YAML, SAM/CloudFormation function, serverless.yml function, host.json) it could read — this law judged nothing. It was selected because a file names one of them; a mention in prose or a comment is not a command, and what could not be read is listed in the notes',
        ],
        this.LAW_NAME,
        'DEPLOYMENT',
        [],
        context
      );
      return withNotes(markJudgedNothing(result), tally.notes);
    }
    const result = this.createResult(
      [...tally.findings].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      this.LAW_NAME,
      'DEPLOYMENT',
      [
        'Pass every resource and scaling flag in the deploy command (Cloud Run: --cpu --memory --concurrency --timeout --max-instances)',
        'Or keep them in the definition the deploy applies (service YAML, SAM template, serverless.yml, host.json)',
      ],
      context
    );
    return withNotes(result, tally.notes);
  }

  private static judgeFile(context: LawCheckContext, file: DeployFile, tally: Tally): void {
    if (file.name === 'package.json') return this.packageScripts(context, file, tally);
    if (file.name.endsWith('.json')) return this.jsonFile(context, file, tally);
    if (YAML_FILE.test(file.name) || file.name.endsWith('.template')) return this.yamlFile(context, file, tally);
    if (SHELL_FILE.test(file.name)) this.commands(context, file, commandsInText.bind(null, file.text), tally);
  }

  private static yamlFile(context: LawCheckContext, file: DeployFile, tally: Tally): void {
    if (!/(?:run|lambda|functionapp|Function|functions|deploy-cloudrun)/.test(file.text)) return;
    const entries = yamlEntries(file.text);
    if (/^serverless\.ya?ml$/.test(file.name)) this.definition(file, serverlessFrameworkGaps(entries, file.rel), tally);
    if (LAMBDA_RESOURCE_TYPES.some(type => file.text.includes(type))) this.definition(file, samYamlGaps(entries), tally);
    const folded = foldedLines(entries);
    this.commands(context, file, start => [...commandsInText(file.text, start, folded), ...argsCommands(entries).filter(cmd => start.test(cmd.text))], tally);
    this.deployAction(context, file, entries, tally);
  }

  private static jsonFile(context: LawCheckContext, file: DeployFile, tally: Tally): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      return;
    }
    if (file.name === 'host.json') this.definition(file, hostJsonGaps(file.text, parsed), tally);
    if (LAMBDA_RESOURCE_TYPES.some(type => file.text.includes(type))) this.definition(file, samJsonGaps(file.text, parsed), tally);
    if (/^cloudbuild.*\.json$/.test(file.name)) {
      const steps = (parsed as { steps?: unknown }).steps;
      const commands = Array.isArray(steps) ? steps.flatMap((step, index) => this.jsonStep(file.text, step, index)) : [];
      this.commands(context, file, start => commands.filter(cmd => start.test(cmd.text)), tally);
    }
  }

  private static jsonStep(text: string, step: unknown, index: number): FoundCommand[] {
    const { entrypoint, name, args } = (step ?? {}) as { entrypoint?: unknown; name?: unknown; args?: unknown };
    const program = typeof entrypoint === 'string' ? entrypoint : /cloud-builders\/gcloud(?::|$)/.test(String(name ?? '')) ? 'gcloud' : '';
    if (!['gcloud', 'aws', 'az'].includes(program) || !Array.isArray(args)) return [];
    let at = -1;
    for (let i = 0; i <= index; i++) at = text.indexOf('"args"', at + 1);
    return [{ line: at < 0 ? 1 : text.slice(0, at).split('\n').length, text: [program, ...args.map(String)].join(' ') }];
  }

  private static packageScripts(context: LawCheckContext, file: DeployFile, tally: Tally): void {
    let scripts: Record<string, unknown> = {};
    try {
      scripts = (JSON.parse(file.text) as { scripts?: Record<string, unknown> }).scripts ?? {};
    } catch {
      return;
    }
    const entries = Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    this.commands(
      context,
      file,
      start =>
        entries.flatMap(([name, command]) =>
          commandsInText(command, start).map(found => ({ line: file.text.slice(0, file.text.indexOf(`"${name}"`)).split('\n').length, text: found.text }))
        ),
      tally
    );
  }

  private static definition(file: DeployFile, judged: Judged | null, tally: Tally): void {
    if (!judged) return;
    tally.judged += judged.units;
    tally.notes.push(...judged.notes);
    tally.findings.push(...judged.gaps.map((gap: Gap) => finding(`${file.rel}:${gap.line}`, gap.unit, gap.missing, DEFINITION_CONSEQUENCE)));
  }

  /** Judge every command of every platform the file holds. */
  private static commands(context: LawCheckContext, file: DeployFile, find: (start: RegExp) => FoundCommand[], tally: Tally): void {
    for (const platform of COMMAND_PLATFORMS) {
      for (const command of find(platform.start)) this.judgeCommand(context, file, platform, command, tally);
    }
    for (const command of find(REPLACE)) this.servicesReplace(context, file, command, tally);
  }

  private static judgeCommand(context: LawCheckContext, file: DeployFile, platform: CommandPlatform, command: FoundCommand, tally: Tally): void {
    const where = `${file.rel}:${command.line}`;
    const flags = flagsOf(command.text);
    if (platform.when && !platform.when.some(flag => flags.has(flag))) return;
    const fromFile = this.flagsFile(context, file, command.text);
    if (fromFile === null) {
      tally.notes.push(`${where}: ${platform.command} reads --flags-file from a path that could not be read — not judged`);
      return;
    }
    fromFile.forEach(flag => flags.add(flag));
    const missing = platform.settings.filter(pinned => !pinned.flags.some(flag => flags.has(flag))).map(pinned => ({ setting: pinned.setting, names: pinned.flags }));
    const opaque = missing.length > 0 ? opaqueArguments(command.text, wordCount(command.text, platform.start), platform.positionals) : [];
    if (opaque.length > 0) {
      tally.notes.push(`${where}: ${platform.command} passes ${opaque.join(' ')}, which may carry ${describeMissing(missing)} — not judged`);
      return;
    }
    tally.judged++;
    if (missing.length > 0) tally.findings.push(finding(where, platform.command, missing, platform.consequence));
  }

  /** Flags from `--flags-file` (a YAML of `--flag: value`); [] without one, null when it cannot be read. */
  private static flagsFile(context: LawCheckContext, file: DeployFile, text: string): string[] | null {
    const path = flagValue(text, '--flags-file');
    if (path === null) return [];
    const content = this.resolve(context, file, path);
    if (content === null) return null;
    return [...content.matchAll(/^\s*(--[a-z][a-z0-9-]*)\s*:/gim)].map(match => (match[1] ?? '').toLowerCase());
  }

  /** A path a command names, read relative to the project root or the file's directory. */
  private static resolve(context: LawCheckContext, file: DeployFile, path: string): string | null {
    if (/[$%{}]/.test(path)) return null;
    for (const base of [context.projectRoot, PathOperations.getDirectory(file.abs)]) {
      try {
        return fs.readFileSync(PathOperations.resolve(base, path), 'utf8');
      } catch {
        // try the next base
      }
    }
    return null;
  }

  private static servicesReplace(context: LawCheckContext, file: DeployFile, command: FoundCommand, tally: Tally): void {
    const words = command.text.trim().split(/\s+/).slice(wordCount(command.text, REPLACE));
    const path = words.find((word, i) => !word.startsWith('-') && !(words[i - 1] ?? '').match(/^--?[a-z][\w-]*$/i))?.replace(/^["']|["']$/g, '');
    this.serviceYaml(context, file, `${file.rel}:${command.line}`, 'gcloud run services replace', path, tally);
  }

  private static serviceYaml(context: LawCheckContext, file: DeployFile, where: string, subject: string, path: string | undefined, tally: Tally): void {
    const content = path ? this.resolve(context, file, path) : null;
    if (content === null) {
      tally.notes.push(`${where}: ${subject} applies a service YAML (${path ?? 'no path'}) that could not be read — not judged`);
      return;
    }
    tally.judged++;
    const missing = cloudRunServiceGaps(yamlEntries(content));
    if (missing.length > 0) tally.findings.push(finding(where, `${subject} ${path}`, missing, DEFINITION_CONSEQUENCE));
  }

  /** The Cloud Run deploy GitHub Action: `flags` and `timeout` inputs, or a `metadata` service YAML. */
  private static deployAction(context: LawCheckContext, file: DeployFile, entries: YamlEntry[], tally: Tally): void {
    for (const uses of entries.filter(entry => entry.key === 'uses' && DEPLOY_CLOUDRUN_ACTION.test(entry.value))) {
      const input = (name: string): YamlEntry | undefined =>
        entries.find(entry => entry.item === uses.item && entry.path[entry.path.length - 2] === 'with' && entry.key === name);
      if (input('job')) continue;
      const where = `${file.rel}:${uses.line}`;
      const metadata = input('metadata');
      if (metadata) {
        this.serviceYaml(context, file, where, 'google-github-actions/deploy-cloudrun metadata', metadata.value, tally);
        continue;
      }
      const flagsInput = input('flags');
      const text = `${flagsInput?.value ?? ''} ${(flagsInput?.block ?? []).map(line => line.text).join(' ')}`;
      const flags = flagsOf(text);
      if (input('timeout')) flags.add('--timeout');
      const missing = CLOUD_RUN_DEPLOY.settings.filter(pinned => !pinned.flags.some(flag => flags.has(flag))).map(pinned => ({ setting: pinned.setting, names: pinned.flags }));
      if (missing.length > 0 && /\$\{\{/.test(text)) {
        tally.notes.push(`${where}: the deploy-cloudrun flags input is an expression, which may carry ${describeMissing(missing)} — not judged`);
        continue;
      }
      tally.judged++;
      if (missing.length > 0) tally.findings.push(finding(where, 'google-github-actions/deploy-cloudrun (flags input)', missing, CLOUD_RUN_DEPLOY.consequence));
    }
  }
}
