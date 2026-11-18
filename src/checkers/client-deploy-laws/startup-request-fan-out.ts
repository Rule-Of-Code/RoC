/**
 * Startup Request Fan-Out
 *
 * A screen that opens with many independent API requests sends them within a
 * few milliseconds. Each is fast alone; together they queue for the same
 * backend instance, and the screen is usable only when the slowest returns.
 * The count that matters is the requests one component starts synchronously
 * from the hooks that run when it opens (constructor, ngOnInit,
 * ionViewWillEnter), directly or through one service method — see
 * utils/angular/startup-requests for what is counted and what is deferred.
 *
 * The threshold is `thresholds.performance.maxStartupRequests` (default 4):
 * more than that many requests is a finding listing every one, file:line.
 */

import * as path from 'path';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  classModels,
  OPENING_HOOKS,
  REQUIRES_ANGULAR_COMPONENT,
  startupRequests,
  type StartupRequest,
} from '../../utils/angular/startup-requests';
import { AngularComponents } from '../../utils/ionic/angular-components';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { readFilesContaining } from '../../utils/law-requirements';
import { loadTypeScript, parserUnavailable, TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

export const DEFAULT_MAX_STARTUP_REQUESTS = 4;
export const MAX_STARTUP_REQUESTS_KEY = 'thresholds.performance.maxStartupRequests';

/** The configured threshold, or the problem with what is configured. */
export function maxStartupRequests(context: LawCheckContext): { value: number } | { problem: string } {
  const raw = (context.config.thresholds?.performance as { maxStartupRequests?: unknown } | undefined)?.maxStartupRequests;
  if (raw === undefined) return { value: DEFAULT_MAX_STARTUP_REQUESTS };
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) return { value: raw };
  return {
    problem: `${MAX_STARTUP_REQUESTS_KEY} is ${JSON.stringify(raw)} — it must be a whole number of requests, 1 or more; the start-up requests were NOT judged`,
  };
}

function listed(request: StartupRequest): string {
  return request.via ? `${request.label} (${request.at}, via ${request.via})` : `${request.label} (${request.at})`;
}

export class StartupRequestFanOutLaw extends LawBase {
  static readonly LAW_NAME = 'Startup Request Fan-Out';

  static check(context: LawCheckContext): LawResult {
    const threshold = maxStartupRequests(context);
    if ('problem' in threshold) {
      return this.createResult([threshold.problem], this.LAW_NAME, 'PERFORMANCE', [`Set ${MAX_STARTUP_REQUESTS_KEY} to a whole number, or remove it for the default of ${DEFAULT_MAX_STARTUP_REQUESTS}`], context);
    }
    const rel = (file: string): string => AngularComponents.relative(context, file);
    // The component files are exactly the ones that selected the law
    // (requires.anyFileContaining, read through the gate's reader).
    const componentFiles = (REQUIRES_ANGULAR_COMPONENT.anyFileContaining ?? []).flatMap(entry =>
      readFilesContaining(context.projectRoot, entry, context.config.ignores?.global ?? [])
    );
    const ts = loadTypeScript(context.projectRoot);
    if (componentFiles.length === 0 || !ts) {
      const why = !ts ? parserUnavailable(context.projectRoot) : 'read no file that declares an Angular component';
      return markJudgedNothing(this.createResult([`${why} — this law judged nothing`], this.LAW_NAME, 'PERFORMANCE', [], context));
    }
    const componentSources = componentFiles.map(found => TsxSource.parse(ts, found.file, found.content));
    const own = new Set(componentFiles.map(found => samePath(found.file)));
    // Services are resolved among the project's other sources too.
    const services = AngularComponents.scan(context).sources.filter(source => !own.has(samePath(source.fileName)));
    const models = classModels([...componentSources, ...services]);
    const components = [...models.values()].flat().filter(model => model.component && componentSources.includes(model.source));
    const violations: string[] = [];
    let withHook = 0;
    let most = 0;
    for (const model of components) {
      if (OPENING_HOOKS.some(hook => model.methods.has(hook))) withHook++;
      const requests = startupRequests(model, models, rel);
      most = Math.max(most, requests.length);
      if (requests.length <= threshold.value) continue;
      violations.push(
        `${rel(model.source.fileName)}:${model.line}: ${model.name} starts ${requests.length} HTTP requests when it opens (${OPENING_HOOKS.join(' / ')}; threshold ${threshold.value}): ${requests.map(listed).join('; ')} — sent together, they queue on the same backend and the screen waits for the slowest`
      );
    }
    const counts = { componentFilesRead: componentFiles.length, components: components.length, componentsWithOpeningHook: withHook, threshold: threshold.value, mostRequests: most };
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Serve what the first paint needs from one aggregate endpoint',
        'Defer below-the-fold requests (@defer on viewport, on scroll, after the first render)',
        'Paint first from kept data (a cache or the last response) and refresh behind it',
        `Tune the threshold with ${MAX_STARTUP_REQUESTS_KEY} (default ${DEFAULT_MAX_STARTUP_REQUESTS})`,
      ],
      context
    );
    return { ...(result.passed ? { ...result, message: this.passMessage(counts) } : result), metrics: counts };
  }

  /** A pass names what was read and what the count does not follow — "compliance verified" alone would claim more. */
  private static passMessage(counts: { componentFilesRead: number; components: number; componentsWithOpeningHook: number; threshold: number; mostRequests: number }): string {
    return `${this.LAW_NAME}: ${counts.componentFilesRead} component file(s) read (${counts.components} component(s), ${counts.componentsWithOpeningHook} with an opening hook), none starts more than ${counts.threshold} requests on open (most: ${counts.mostRequests}); not followed: ${NOT_FOLLOWED}`;
  }
}

/** One spelling of a path for comparison (separators and, on Windows, case). */
function samePath(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/** What the count does not see (detectionLimits says the same). */
const NOT_FOLLOWED =
  'a callback handed to a helper, free functions that receive a service, inject*() factories, a second service hop, stores and effects';
