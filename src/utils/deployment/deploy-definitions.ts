/**
 * Serverless deploy definitions — files that ARE the deployed configuration,
 * read for the resource and scaling keys they leave out: a Cloud Run service
 * YAML, an AWS SAM / CloudFormation template, a Serverless Framework
 * `serverless.yml`, and an Azure Functions `host.json`.
 *
 * Each judge returns one gap per deployed unit (a service, a function, a
 * function app) that leaves a setting out, with the line it is declared on;
 * an empty list when every unit pins them; null when the file holds no unit
 * this judge knows (it is then not counted as judged).
 */

import {
  AZURE_HOST_JSON_TIMEOUT_KEY,
  CLOUD_RUN_SERVICE_KEYS,
  LAMBDA_PROPERTIES,
  LAMBDA_RESOURCE_TYPES,
  SERVERLESS_FRAMEWORK_KEYS,
  type Setting,
} from './serverless-platforms';
import { hasPathSuffix, type YamlEntry } from './yaml-lines';

export interface Missing {
  setting: Setting;
  names: readonly string[];
}

export interface Gap {
  line: number;
  /** `function Api (AWS::Serverless::Function)`. */
  unit: string;
  missing: Missing[];
}

export interface Judged {
  /** Units read. */
  units: number;
  gaps: Gap[];
  /** What could not be read. */
  notes: string[];
}

/** The settings of a Cloud Run service YAML that no key pins. */
export function cloudRunServiceGaps(entries: YamlEntry[]): Missing[] {
  return CLOUD_RUN_SERVICE_KEYS.filter(
    pinned => !pinned.paths.some(path => hasPathSuffix(entries, path))
  ).map(pinned => ({
    setting: pinned.setting,
    names: pinned.paths.map(path => path.join('.')),
  }));
}

const lineOfKey = (text: string, key: string, from = 0): number => {
  const index = text.indexOf(`"${key}"`, from);
  return index < 0 ? 1 : text.slice(0, index).split('\n').length;
};

function lambdaMissing(
  present: (key: string) => boolean,
  global: (key: string) => boolean
): Missing[] {
  return LAMBDA_PROPERTIES.filter(
    ({ key }) => !present(key) && !global(key)
  ).map(({ setting, key }) => ({ setting, names: [key] }));
}

/** AWS SAM / CloudFormation YAML: every function resource, with SAM's Globals.Function. */
export function samYamlGaps(entries: YamlEntry[]): Judged | null {
  const functions = entries.filter(
    entry =>
      entry.path.length === 3 &&
      entry.path[0] === 'Resources' &&
      entry.key === 'Type' &&
      LAMBDA_RESOURCE_TYPES.includes(entry.value)
  );
  if (functions.length === 0) return null;
  const has = (path: string[]): boolean =>
    entries.some(entry => entry.path.join('\0') === path.join('\0'));
  const gaps = functions.flatMap(type => {
    const name = type.path[1] ?? '';
    const sam = type.value === 'AWS::Serverless::Function';
    const missing = lambdaMissing(
      key => has(['Resources', name, 'Properties', key]),
      key => sam && has(['Globals', 'Function', key])
    );
    const line =
      entries.find(
        entry =>
          entry.path.length === 2 &&
          entry.path[0] === 'Resources' &&
          entry.key === name
      )?.line ?? type.line;
    return missing.length > 0
      ? [{ line, unit: `function ${name} (${type.value})`, missing }]
      : [];
  });
  return { units: functions.length, gaps, notes: [] };
}

type Bag = Record<string, unknown>;
const bag = (value: unknown): Bag =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Bag)
    : {};

/** AWS SAM / CloudFormation JSON. */
export function samJsonGaps(text: string, parsed: unknown): Judged | null {
  const resources = Object.entries(bag(bag(parsed).Resources)).filter(
    ([, resource]) => LAMBDA_RESOURCE_TYPES.includes(String(bag(resource).Type))
  );
  if (resources.length === 0) return null;
  const globals = bag(bag(bag(parsed).Globals).Function);
  const resourcesAt = text.indexOf('"Resources"');
  const gaps = resources.flatMap(([name, resource]) => {
    const type = String(bag(resource).Type);
    const properties = bag(bag(resource).Properties);
    const missing = lambdaMissing(
      key => key in properties,
      key => type === 'AWS::Serverless::Function' && key in globals
    );
    return missing.length > 0
      ? [
          {
            line: lineOfKey(text, name, resourcesAt),
            unit: `function ${name} (${type})`,
            missing,
          },
        ]
      : [];
  });
  return { units: resources.length, gaps, notes: [] };
}

/** Serverless Framework: each function, falling back to provider-level keys. */
export function serverlessFrameworkGaps(
  entries: YamlEntry[],
  rel: string
): Judged | null {
  const block = entries.find(
    entry => entry.path.length === 1 && entry.key === 'functions'
  );
  if (!block) return null;
  if (block.value || block.items.length > 0) {
    return {
      units: 0,
      gaps: [],
      notes: [
        `${rel}:${block.line}: functions are included from another file (${block.value || block.items.map(item => item.text).join(', ')}) — not read`,
      ],
    };
  }
  const functions = entries.filter(
    entry => entry.path.length === 2 && entry.path[0] === 'functions'
  );
  const has = (path: string[]): boolean =>
    entries.some(
      entry => entry.path.join('\0') === path.join('\0') && entry.value !== ''
    );
  const gaps = functions.flatMap(fn => {
    const missing = SERVERLESS_FRAMEWORK_KEYS.filter(
      ({ key }) => !has(['functions', fn.key, key]) && !has(['provider', key])
    ).map(({ setting, key }) => ({
      setting,
      names: [`provider.${key}`, `functions.${fn.key}.${key}`],
    }));
    return missing.length > 0
      ? [{ line: fn.line, unit: `function ${fn.key}`, missing }]
      : [];
  });
  return { units: functions.length, gaps, notes: [] };
}

/** Azure Functions host.json (schema version 2+). */
export function hostJsonGaps(text: string, parsed: unknown): Judged | null {
  const host = bag(parsed);
  if (typeof host.version !== 'string' || !host.version.startsWith('2'))
    return null;
  const gaps =
    AZURE_HOST_JSON_TIMEOUT_KEY in host
      ? []
      : [
          {
            line: lineOfKey(text, 'version'),
            unit: 'function app',
            missing: [
              {
                setting: 'timeout' as Setting,
                names: [AZURE_HOST_JSON_TIMEOUT_KEY],
              },
            ],
          },
        ];
  return { units: 1, gaps, notes: [] };
}
