/**
 * The `thresholds.next` and `thresholds.clientIp` keys, read with their shape
 * checked.
 *
 * A config value of the wrong shape is not "absent": a `publicRoutes` entry
 * without a reason, or an `authGuards` that is a string instead of a list, is
 * a declaration the law cannot honour. Each reader returns what it could read
 * and the problems it found, and a law reports the problems as violations —
 * a malformed declaration never widens what passes.
 */

import type { LawCheckContext } from '../../types/law.types';

export interface Read<T> {
  /** The value, or undefined when the key is absent or unusable. */
  value: T | undefined;
  /** What is wrong with the value as written. */
  problems: string[];
}

export interface ReasonedEntry {
  key: string;
  reason: string;
}

export type ExemptionMatch = 'exact' | 'glob' | 'prefix' | 'regex';

export interface GuardExemption {
  file: string;
  constant: string;
  match: ExemptionMatch;
}

const MATCH_MODES: readonly ExemptionMatch[] = ['exact', 'prefix', 'glob', 'regex'];

type Bag = Record<string, unknown>;

function nextBag(context: LawCheckContext): Bag {
  const bag = (context.config.thresholds as Bag | undefined)?.next;
  return bag && typeof bag === 'object' ? (bag as Bag) : {};
}

function clientIpBag(context: LawCheckContext): Bag {
  const bag = (context.config.thresholds as Bag | undefined)?.clientIp;
  return bag && typeof bag === 'object' ? (bag as Bag) : {};
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function stringList(bag: Bag, key: string, label: string): Read<string[]> {
  const raw = bag[key];
  if (raw === undefined) return { value: undefined, problems: [] };
  if (!Array.isArray(raw) || !raw.every(nonEmpty)) {
    return { value: undefined, problems: [`${label} must be a list of non-empty names`] };
  }
  return { value: raw.map(item => item.trim()), problems: [] };
}

function reasonText(bag: Bag, key: string, label: string): Read<string> {
  const raw = bag[key];
  if (raw === undefined) return { value: undefined, problems: [] };
  if (!nonEmpty(raw)) {
    return { value: undefined, problems: [`${label} must be a non-empty reason`] };
  }
  return { value: raw.trim(), problems: [] };
}

function reasonedList(bag: Bag, key: string, field: string, label: string): Read<ReasonedEntry[]> {
  const raw = bag[key];
  if (raw === undefined) return { value: undefined, problems: [] };
  if (!Array.isArray(raw)) {
    return { value: undefined, problems: [`${label} must be a list of { ${field}, reason }`] };
  }
  const value: ReasonedEntry[] = [];
  const problems: string[] = [];
  raw.forEach((entry: unknown, index) => {
    const item = (entry ?? {}) as Bag;
    if (!nonEmpty(item[field]) || !nonEmpty(item.reason)) {
      problems.push(`${label}[${index}] needs a non-empty ${field} and a non-empty reason — an exception without its reason is not accepted`);
      return;
    }
    value.push({ key: (item[field] as string).trim(), reason: (item.reason as string).trim() });
  });
  return { value, problems };
}

export const NextThresholds = {
  authGuards: (context: LawCheckContext): Read<string[]> =>
    stringList(nextBag(context), 'authGuards', 'thresholds.next.authGuards'),

  bodyValidators: (context: LawCheckContext): Read<string[]> =>
    stringList(nextBag(context), 'bodyValidators', 'thresholds.next.bodyValidators'),

  publicRoutes: (context: LawCheckContext): Read<ReasonedEntry[]> =>
    reasonedList(nextBag(context), 'publicRoutes', 'route', 'thresholds.next.publicRoutes'),

  serverModules: (context: LawCheckContext): Read<string[]> =>
    stringList(nextBag(context), 'serverModules', 'thresholds.next.serverModules'),

  requireServerOnlyMarker: (context: LawCheckContext): Read<boolean> => {
    const raw = nextBag(context).requireServerOnlyMarker;
    if (raw === undefined) return { value: true, problems: [] };
    if (typeof raw !== 'boolean') {
      return {
        value: true,
        problems: ['thresholds.next.requireServerOnlyMarker must be true or false'],
      };
    }
    return { value: raw, problems: [] };
  },

  proxyWithoutMatcher: (context: LawCheckContext): Read<string> =>
    reasonText(nextBag(context), 'proxyWithoutMatcher', 'thresholds.next.proxyWithoutMatcher'),

  publicEnvBuildSource: (context: LawCheckContext): Read<string> =>
    reasonText(nextBag(context), 'publicEnvBuildSource', 'thresholds.next.publicEnvBuildSource'),

  publicEnvAllowed: (context: LawCheckContext): Read<ReasonedEntry[]> =>
    reasonedList(nextBag(context), 'publicEnvAllowed', 'name', 'thresholds.next.publicEnvAllowed'),

  guardExemptions: (context: LawCheckContext): Read<GuardExemption[]> => {
    const label = 'thresholds.next.guardExemptions';
    const raw = nextBag(context).guardExemptions;
    if (raw === undefined) return { value: undefined, problems: [] };
    if (!Array.isArray(raw)) {
      return { value: undefined, problems: [`${label} must be a list of { file, constant, match }`] };
    }
    const value: GuardExemption[] = [];
    const problems: string[] = [];
    raw.forEach((entry: unknown, index) => {
      const item = (entry ?? {}) as Bag;
      const match = item.match as ExemptionMatch;
      if (!nonEmpty(item.file) || !nonEmpty(item.constant) || !MATCH_MODES.includes(match)) {
        problems.push(
          `${label}[${index}] needs a file, a constant and a match of ${MATCH_MODES.join(' | ')} — how the guard compares a pattern to a path decides what it covers`
        );
        return;
      }
      value.push({ file: (item.file as string).trim(), constant: (item.constant as string).trim(), match });
    });
    return { value, problems };
  },

  clientIpModule: (context: LawCheckContext): Read<string> =>
    reasonText(clientIpBag(context), 'module', 'thresholds.clientIp.module'),

  clientIpNotUsed: (context: LawCheckContext): Read<string> =>
    reasonText(clientIpBag(context), 'notUsed', 'thresholds.clientIp.notUsed'),
};

/**
 * Whether a call's callee names one of `names`: the callee text equals the
 * name, or ends with `.<name>` (`auth.requireUser` matches `requireUser`).
 */
export function calleeNamed(calleeText: string, names: readonly string[]): boolean {
  return names.some(name => calleeText === name || calleeText.endsWith(`.${name}`));
}
