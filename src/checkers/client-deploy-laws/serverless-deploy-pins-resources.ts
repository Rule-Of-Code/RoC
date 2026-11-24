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

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  argsCommands,
  commandsInText,
  foldedLines,
  type FoundCommand,
} from '../../utils/deployment/deploy-commands';
import {
  hostJsonGaps,
  samJsonGaps,
  samYamlGaps,
  serverlessFrameworkGaps,
} from '../../utils/deployment/deploy-definitions';
import {
  COMMAND_PLATFORMS,
  LAMBDA_RESOURCE_TYPES,
  REQUIRES_SERVERLESS_DEPLOY,
} from '../../utils/deployment/serverless-platforms';
import { yamlEntries } from '../../utils/deployment/yaml-lines';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { readFilesContaining } from '../../utils/law-requirements';
import { withNotes } from '../../utils/ionic/law-notes';
import { LawBase } from '../law-base';
import {
  type DeployFile,
  judgeCommand,
  judgeDefinition,
  judgeDeployAction,
  judgeServicesReplace,
  REPLACE,
  type Tally,
} from './serverless-deploy-judges';

const YAML_FILE = /\.ya?ml$/i;
const SHELL_FILE = /(?:\.(?:sh|bash|ps1|mk)|^(?:gnu)?makefile)$/i;

/**
 * The files that selected the law — its `requires.anyFileContaining` set,
 * read through the gate's own reader (what git publishes, a tracked file
 * from the index; the disk outside git) — so the law judges exactly what
 * selected it, and a file the gate never saw cannot be judged.
 */
function deployFiles(context: LawCheckContext): DeployFile[] {
  const byRel = new Map<string, DeployFile>();
  for (const entry of REQUIRES_SERVERLESS_DEPLOY.anyFileContaining ?? []) {
    for (const found of readFilesContaining(
      context.projectRoot,
      entry,
      context.config.ignores?.global ?? []
    )) {
      byRel.set(found.rel, {
        abs: found.file,
        rel: found.rel,
        name: (found.rel.split('/').pop() ?? '').toLowerCase(),
        text: found.content,
      });
    }
  }
  return [...byRel.values()].sort((a, b) => a.rel.localeCompare(b.rel));
}

export class ServerlessDeployPinsResourcesLaw extends LawBase {
  static readonly LAW_NAME = 'Serverless Deploy Pins Resources';

  static check(context: LawCheckContext): LawResult {
    const tally: Tally = { findings: [], notes: [], judged: 0 };
    const files = deployFiles(context);
    for (const file of files) this.judgeFile(context, file, tally);
    const metrics = {
      filesRead: files.length,
      commandsAndDefinitionsJudged: tally.judged,
      notJudged: tally.notes.length,
    };
    if (tally.judged === 0)
      return { ...this.unjudged(context, files.length, tally.notes), metrics };
    const result = this.createResult(
      [...tally.findings].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
      this.LAW_NAME,
      'DEPLOYMENT',
      [
        'Pass every resource and scaling flag in the deploy command (Cloud Run: --cpu --memory --concurrency --timeout --max-instances)',
        'Or keep them in the definition the deploy applies (service YAML, SAM template, serverless.yml, host.json)',
      ],
      context
    );
    const counted = result.passed
      ? {
          ...result,
          message: `${result.message} — ${tally.judged} deploy command(s) / definition(s) judged in ${files.length} file(s)`,
        }
      : result;
    return { ...withNotes(counted, tally.notes), metrics };
  }

  /**
   * Selected, but nothing judged. Every command it saw left unread (a
   * whole-argument expansion, an unresolvable file) is judged nothing; a gate
   * match the detector does not take for a command (a commented-out line)
   * read its files and found nothing to judge — a pass that says so; no file
   * read at all is judged nothing.
   */
  private static unjudged(
    context: LawCheckContext,
    filesRead: number,
    notes: string[]
  ): LawResult {
    if (filesRead > 0 && notes.length === 0) {
      const result = this.createResult(
        [],
        this.LAW_NAME,
        'DEPLOYMENT',
        [],
        context
      );
      return {
        ...result,
        message: `${this.LAW_NAME}: ${filesRead} file(s) read, no serverless deploy command or definition in them to judge (what selected the law is not a command here, e.g. a commented-out line)`,
      };
    }
    const why =
      filesRead === 0
        ? 'read no file with a serverless deploy command or definition'
        : `saw deploy commands in ${filesRead} file(s) but could read none of them (see the notes)`;
    const result = this.createResult(
      [`${this.LAW_NAME} ${why} — this law judged nothing`],
      this.LAW_NAME,
      'DEPLOYMENT',
      [],
      context
    );
    return withNotes(markJudgedNothing(result), notes);
  }

  private static judgeFile(
    context: LawCheckContext,
    file: DeployFile,
    tally: Tally
  ): void {
    if (file.name === 'package.json')
      return this.packageScripts(context, file, tally);
    if (file.name.endsWith('.json')) return this.jsonFile(context, file, tally);
    if (YAML_FILE.test(file.name) || file.name.endsWith('.template'))
      return this.yamlFile(context, file, tally);
    if (SHELL_FILE.test(file.name))
      this.commands(context, file, commandsInText.bind(null, file.text), tally);
  }

  private static yamlFile(
    context: LawCheckContext,
    file: DeployFile,
    tally: Tally
  ): void {
    if (
      !/(?:run|lambda|functionapp|Function|functions|deploy-cloudrun)/.test(
        file.text
      )
    )
      return;
    const entries = yamlEntries(file.text);
    if (/^serverless\.ya?ml$/.test(file.name))
      judgeDefinition(file, serverlessFrameworkGaps(entries, file.rel), tally);
    if (LAMBDA_RESOURCE_TYPES.some(type => file.text.includes(type)))
      judgeDefinition(file, samYamlGaps(entries), tally);
    const folded = foldedLines(entries);
    this.commands(
      context,
      file,
      start => [
        ...commandsInText(file.text, start, folded),
        ...argsCommands(entries).filter(cmd => start.test(cmd.text)),
      ],
      tally
    );
    judgeDeployAction(context, file, entries, tally);
  }

  private static jsonFile(
    context: LawCheckContext,
    file: DeployFile,
    tally: Tally
  ): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      return;
    }
    if (file.name === 'host.json')
      judgeDefinition(file, hostJsonGaps(file.text, parsed), tally);
    if (LAMBDA_RESOURCE_TYPES.some(type => file.text.includes(type)))
      judgeDefinition(file, samJsonGaps(file.text, parsed), tally);
    if (/^cloudbuild.*\.json$/.test(file.name)) {
      const steps = (parsed as { steps?: unknown }).steps;
      const commands = Array.isArray(steps)
        ? steps.flatMap((step, index) => this.jsonStep(file.text, step, index))
        : [];
      this.commands(
        context,
        file,
        start => commands.filter(cmd => start.test(cmd.text)),
        tally
      );
    }
  }

  private static jsonStep(
    text: string,
    step: unknown,
    index: number
  ): FoundCommand[] {
    const { entrypoint, name, args } = (step ?? {}) as {
      entrypoint?: unknown;
      name?: unknown;
      args?: unknown;
    };
    const program =
      typeof entrypoint === 'string'
        ? entrypoint
        : /cloud-builders\/gcloud(?::|$)/.test(String(name ?? ''))
          ? 'gcloud'
          : '';
    if (!['gcloud', 'aws', 'az'].includes(program) || !Array.isArray(args))
      return [];
    let at = -1;
    for (let i = 0; i <= index; i++) at = text.indexOf('"args"', at + 1);
    return [
      {
        line: at < 0 ? 1 : text.slice(0, at).split('\n').length,
        text: [program, ...args.map(String)].join(' '),
      },
    ];
  }

  private static packageScripts(
    context: LawCheckContext,
    file: DeployFile,
    tally: Tally
  ): void {
    let scripts: Record<string, unknown> = {};
    try {
      scripts =
        (JSON.parse(file.text) as { scripts?: Record<string, unknown> })
          .scripts ?? {};
    } catch {
      return;
    }
    const entries = Object.entries(scripts).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    );
    this.commands(
      context,
      file,
      start =>
        entries.flatMap(([name, command]) =>
          commandsInText(command, start).map(found => ({
            line: file.text.slice(0, file.text.indexOf(`"${name}"`)).split('\n')
              .length,
            text: found.text,
          }))
        ),
      tally
    );
  }

  /** Judge every command of every platform the file holds. */
  private static commands(
    context: LawCheckContext,
    file: DeployFile,
    find: (start: RegExp) => FoundCommand[],
    tally: Tally
  ): void {
    for (const platform of COMMAND_PLATFORMS) {
      for (const command of find(platform.start))
        judgeCommand(context, file, platform, command, tally);
    }
    for (const command of find(REPLACE))
      judgeServicesReplace(context, file, command, tally);
  }
}
