/**
 * The serverless platforms whose deploy commands and definitions Serverless
 * Deploy Pins Resources reads, and the flag or key that pins each setting.
 *
 * A registry, not one platform hard-coded: each row is a command (matched in
 * CI files, scripts, Makefiles and package.json scripts) or a definition file,
 * the settings it can pin, and the reference the flags were checked against.
 * A flag or key is listed only when that reference documents it; a setting a
 * command cannot pin (Lambda's reserved concurrency is a separate API call,
 * not a create-function option) is not demanded of it.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';

export type Setting = 'concurrency' | 'cpu' | 'max instances' | 'memory' | 'timeout';

const MEMORY: Setting = 'memory';
const TIMEOUT: Setting = 'timeout';
const MAX_INSTANCES: Setting = 'max instances';

export interface PinnedSetting {
  setting: Setting;
  /** Any one of these flags pins it. */
  flags: readonly string[];
}

export interface CommandPlatform {
  /** `gcloud run deploy` — how the finding names the command. */
  command: string;
  /** The command words, as they start the command. */
  start: RegExp;
  /** Judged only when one of these flags is present (a hosting plan that has the settings). */
  when?: readonly string[];
  /** Index of the positional argument that names the service (not a flag-valued expansion). */
  positionals: number;
  settings: readonly PinnedSetting[];
  /** What leaving a setting out does, for the finding. */
  consequence: string;
  reference: string;
}

const NEW_ON_DEFAULTS =
  'an existing service keeps what it has, but a new one (another region, a recreated service) starts on the platform defaults, and two services deployed by the same command can differ';

export const CLOUD_RUN_DEPLOY: CommandPlatform = {
  command: 'gcloud run deploy',
  start: /\bgcloud(?:\s+(?:alpha|beta))?\s+run\s+deploy\b/,
  positionals: 1,
  settings: [
    { setting: 'cpu', flags: ['--cpu'] },
    { setting: MEMORY, flags: ['--memory'] },
    { setting: 'concurrency', flags: ['--concurrency'] },
    { setting: TIMEOUT, flags: ['--timeout'] },
    { setting: MAX_INSTANCES, flags: ['--max-instances'] },
  ],
  consequence: NEW_ON_DEFAULTS,
  reference: 'https://cloud.google.com/sdk/gcloud/reference/run/deploy',
};

export const COMMAND_PLATFORMS: readonly CommandPlatform[] = [
  CLOUD_RUN_DEPLOY,
  {
    command: 'aws lambda create-function',
    start: /\baws\s+lambda\s+create-function\b/,
    positionals: 0,
    settings: [
      { setting: MEMORY, flags: ['--memory-size'] },
      { setting: TIMEOUT, flags: ['--timeout'] },
    ],
    consequence: 'the function is created on the defaults (128 MB, 3 s)',
    reference: 'https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html',
  },
  {
    command: 'az functionapp create (Flex Consumption)',
    start: /\baz\s+functionapp\s+create\b/,
    when: ['--flexconsumption-location', '-f'],
    positionals: 0,
    settings: [
      { setting: MEMORY, flags: ['--instance-memory'] },
      { setting: MAX_INSTANCES, flags: ['--maximum-instance-count'] },
    ],
    consequence: 'the app is created on the plan defaults',
    reference: 'https://learn.microsoft.com/cli/azure/functionapp#az-functionapp-create',
  },
];

/** A setting of a definition file, pinned by a key at the end of a YAML path. */
export interface PinnedKey {
  setting: Setting;
  /** Any one of these path suffixes pins it. */
  paths: ReadonlyArray<readonly string[]>;
}

/** Cloud Run service YAML (`gcloud run services replace`, the deploy action's `metadata`). */
export const CLOUD_RUN_SERVICE_KEYS: readonly PinnedKey[] = [
  { setting: 'cpu', paths: [['resources', 'limits', 'cpu']] },
  { setting: MEMORY, paths: [['resources', 'limits', 'memory']] },
  { setting: 'concurrency', paths: [['template', 'spec', 'containerConcurrency']] },
  { setting: TIMEOUT, paths: [['template', 'spec', 'timeoutSeconds']] },
  {
    setting: MAX_INSTANCES,
    paths: [
      ['annotations', 'autoscaling.knative.dev/maxScale'],
      ['annotations', 'run.googleapis.com/maxScale'],
    ],
  },
];
export const CLOUD_RUN_YAML_REFERENCE = 'https://cloud.google.com/run/docs/reference/yaml/v1';

/** AWS SAM / CloudFormation function properties (SAM also reads Globals.Function). */
export const LAMBDA_PROPERTIES: ReadonlyArray<{ setting: Setting; key: string }> = [
  { setting: MEMORY, key: 'MemorySize' },
  { setting: TIMEOUT, key: 'Timeout' },
];
export const LAMBDA_RESOURCE_TYPES = ['AWS::Serverless::Function', 'AWS::Lambda::Function'];
export const SAM_REFERENCE = 'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html';

/** Serverless Framework: provider-level or function-level keys. */
export const SERVERLESS_FRAMEWORK_KEYS: ReadonlyArray<{ setting: Setting; key: string }> = [
  { setting: MEMORY, key: 'memorySize' },
  { setting: TIMEOUT, key: 'timeout' },
];
export const SERVERLESS_FRAMEWORK_REFERENCE = 'https://www.serverless.com/framework/docs/providers/aws/guide/functions';

/** Azure Functions host.json (v2+). */
export const AZURE_HOST_JSON_TIMEOUT_KEY = 'functionTimeout';
export const AZURE_HOST_JSON_REFERENCE = 'https://learn.microsoft.com/azure/azure-functions/functions-host-json';

/** The Cloud Run deploy GitHub Action: its `flags` input carries gcloud flags, `timeout` the request timeout. */
export const DEPLOY_CLOUDRUN_ACTION = /^google-github-actions\/deploy-cloudrun@/;
export const DEPLOY_CLOUDRUN_ACTION_REFERENCE = 'https://github.com/google-github-actions/deploy-cloudrun/blob/main/action.yml';

/** `cpu (--cpu), memory (--memory)`. */
export function describeMissing(missing: ReadonlyArray<{ setting: Setting; names: readonly string[] }>): string {
  return missing.map(({ setting, names }) => `${setting} (${names.join(' / ')})`).join(', ');
}

/** Test trees hold fixtures, not the project's deploy. */
const TEST_TREES = ['**/test/**', '**/tests/**', '**/e2e/**', '**/__fixtures__/**', '**/fixtures/**'];

/** Files whose text is read for shell commands (CI YAML, scripts, Makefiles, package.json scripts). */
const COMMAND_FILES = ['**/*.{yml,yaml,template,sh,bash,ps1,mk}', '**/{Makefile,makefile,GNUmakefile}', '**/package.json'];
const YAML_FILES = ['**/*.{yml,yaml,template}'];

/**
 * Where a command may start on its line — the detector's own rule
 * (deploy-commands COMMAND_POSITION), as a prefix: the line start or a list
 * dash, a shell operator or keyword, a YAML key, an env assignment, Make's
 * `@`. A quote opens a command only when the command continues inside it.
 */
const POSITION = String.raw`(?:^[ \t]*(?:-[ \t]+)?|[;&|(` + '`' + String.raw`@][ \t]*|\$\([ \t]*|\b(?:then|do|else|exec|time|sudo|env|xargs)[ \t]+|:[ \t]*(?:[|>][-+]?)?[ \t]*|\b[A-Za-z_]\w*=\S*[ \t]+)`;
const COMMANDS = String.raw`(?:gcloud(?:[ \t]+(?:alpha|beta))?[ \t]+run[ \t]+(?:deploy|services[ \t]+replace)|aws[ \t]+lambda[ \t]+create-function)\b`;
/** az functionapp create is judged only on Flex Consumption: the flag on its line or a continuation line. */
const AZ_FLEX = String.raw`az[ \t]+functionapp[ \t]+create\b(?:[^\n]*[\\` + '`' + String.raw`^][ \t]*\r?\n)*[^\n]*?(?:--flexconsumption-location|[ \t]-f(?=[ \t=]))`;
const AT_COMMAND = String.raw`(?:${POSITION}(?:${COMMANDS}|${AZ_FLEX})|["'](?:${COMMANDS})(?!["']))`;

/** A Cloud Build step whose gcloud/aws entrypoint runs a registry command through `args`. */
const ARGS_STEP = [
  String.raw`(?:entrypoint:[ \t]*["']?gcloud["']?|name:[ \t]*["']?gcr\.io/cloud-builders/gcloud(?::[\w.-]+)?["']?)[ \t]*\r?\n(?:[ \t]+.*\r?\n)*?[ \t]*args:[ \t]*`,
  String.raw`(?:\[[ \t]*["']?run["']?[ \t]*,[ \t\r\n]*["']?(?:deploy|services)["']?|\r?\n[ \t]*-[ \t]*["']?run["']?[ \t]*\r?\n[ \t]*-[ \t]*["']?(?:deploy|services)\b)`,
].join('');
const AWS_ARGS_STEP = String.raw`entrypoint:[ \t]*["']?aws["']?[ \t]*\r?\n(?:[ \t]+.*\r?\n)*?[ \t]*args:[ \t]*(?:\[[ \t]*["']?lambda["']?[ \t]*,[ \t\r\n]*["']?create-function|\r?\n[ \t]*-[ \t]*["']?lambda["']?[ \t]*\r?\n[ \t]*-[ \t]*["']?create-function\b)`;

/**
 * The subject of the law, for `requires.anyFileContaining`, entry by entry
 * the same kinds of file and of text the law judges: a registry command at a
 * command position, a Cloud Build args step, the deploy action, a SAM /
 * CloudFormation function, serverless.yml functions, a v2 host.json. The law
 * reads exactly the files these entries match (readFilesContaining), so a
 * mention in prose, a JSON string or a git-ignored file selects nothing.
 */
export const REQUIRES_SERVERLESS_DEPLOY: LawRequirement = {
  anyFileContaining: [
    { files: COMMAND_FILES, pattern: AT_COMMAND, exclude: TEST_TREES },
    { files: YAML_FILES, pattern: `${ARGS_STEP}|${AWS_ARGS_STEP}`, exclude: TEST_TREES },
    { files: ['**/cloudbuild*.json'], pattern: String.raw`"entrypoint"\s*:\s*"gcloud"[^\]]*?"args"\s*:\s*\[\s*"run"\s*,\s*"(?:deploy|services)"`, exclude: TEST_TREES },
    { files: YAML_FILES, pattern: String.raw`^[ \t]*(?:-[ \t]+)?uses:[ \t]*["']?google-github-actions/deploy-cloudrun@`, exclude: TEST_TREES },
    { files: YAML_FILES, pattern: String.raw`^[ \t]*Type:[ \t]*["']?AWS::(?:Serverless|Lambda)::Function\b`, exclude: TEST_TREES },
    { files: ['**/*.json'], pattern: String.raw`"Type"\s*:\s*"AWS::(?:Serverless|Lambda)::Function"`, exclude: TEST_TREES },
    { files: ['**/serverless.{yml,yaml}'], pattern: String.raw`^functions:[ \t]*\r?\n[ \t]+[\w-]+[ \t]*:`, exclude: TEST_TREES },
    { files: ['**/host.json'], pattern: String.raw`"version"\s*:\s*"2`, exclude: TEST_TREES },
  ],
};
