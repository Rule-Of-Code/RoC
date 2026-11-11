/**
 * Capacitor Service Worker Native Decision
 *
 * A Capacitor shell already serves the web bundle from the app package. An
 * Angular service worker registered with the usual `enabled: !isDevMode()`
 * is also active inside the native WebView, whose origin is the app's own,
 * and there it keeps a second copy of the bundle across an in-place store
 * update: on the first cold start after the update the worker, which still
 * controls the origin, answers from its cache of the previous release.
 *
 * Two decisions answer it: turn the worker off on native (the `enabled`
 * expression consults the platform), or keep it and handle
 * SwUpdate.versionUpdates VERSION_READY with a reload and `unrecoverable` —
 * which shortens the stale window but does not remove the first stale start,
 * and the law says so. Angular's own SwUpdate.activateUpdate() documentation
 * says to update a client by reloading the page, so activateUpdate() is not
 * required, the reload is.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative, withNotes } from '../../utils/capacitor/capacitor-law-support';
import { bridgeSources, methodCalls, objectProperty } from '../../utils/capacitor/capacitor-sources';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const SW_MODULE = '@angular/service-worker';
const PLATFORM_CALLS = new Set(['isNativePlatform', 'getPlatform']);
const VERSION_READY = 'VERSION_READY';
const BOTH_WAYS_OUT =
  'Either turn it off on native (enabled: !isDevMode() && !Capacitor.isNativePlatform(), or a flag named in thresholds.capacitor.nativeFlag), or keep it and handle SwUpdate.versionUpdates VERSION_READY with a reload at a safe moment and SwUpdate.unrecoverable';

/** One service-worker registration in source. */
export interface Registration {
  where: string;
  /** The `enabled` expression; undefined when absent (Angular's default is true). */
  enabled: TS.Expression | undefined;
  /** The options could not be read (not an object literal or a same-file const). */
  unreadable: boolean;
  source: TsxSource;
}

/** What the project does with SwUpdate, across all its sources. */
export interface UpdateHandling {
  versionReady: boolean;
  reload: boolean;
  unrecoverable: boolean;
}

export class CapacitorServiceWorkerNativeDecisionLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Service Worker Native Decision';

  static check(context: LawCheckContext): LawResult {
    const { sources, unread } = bridgeSources(context);
    const violations = unread.map(
      reason => `${reason} — a service-worker registration or SwUpdate handler in these files would not be read, so this law does not pass on them`
    );
    const flags = new Set(context.config.thresholds?.capacitor?.nativeFlag ?? []);
    const registrations = sources.flatMap(source => this.registrations(context, source));
    const handling = this.updateHandling(sources);
    const handled = handling.versionReady && handling.reload && handling.unrecoverable;
    const notes: string[] = [];
    for (const registration of registrations) {
      if (this.offOnNative(registration, flags)) continue;
      if (handled) {
        notes.push(
          `${registration.where}: the service worker stays on in the native shell; the SwUpdate VERSION_READY reload and the unrecoverable handler shorten the stale window after a store update, but do not remove the first cold start served from the previous release — prove on a device which bundle the WebView ran`
        );
        continue;
      }
      violations.push(this.warning(registration, handling));
    }
    return withNotes(
      this.createResult(violations, this.LAW_NAME, 'PERFORMANCE', [BOTH_WAYS_OUT], context),
      notes
    );
  }

  private static warning(registration: Registration, handling: UpdateHandling): string {
    const missing = [
      handling.versionReady ? null : 'versionUpdates VERSION_READY',
      handling.reload ? null : 'a location.reload()',
      handling.unrecoverable ? null : 'unrecoverable',
    ].filter(Boolean);
    const enabled = registration.unreadable
      ? 'its options could not be read'
      : registration.enabled
        ? `enabled: ${registration.enabled.getText(registration.source.sourceFile)}`
        : 'enabled is not set (Angular defaults to true)';
    return `${registration.where}: the Angular service worker is registered (${enabled}) and nothing turns it off in the native shell, where it keeps the previous release across an in-place store update and serves it on the first cold start; SwUpdate handling lacks ${missing.join(', ')}. ${BOTH_WAYS_OUT}`;
  }

  /** provideServiceWorker(…) and ServiceWorkerModule.register(…) calls, as imported here. */
  static registrations(context: LawCheckContext, source: TsxSource): Registration[] {
    const ts = source.ts;
    const imported = new Map<string, string>();
    for (const info of source.imports()) {
      if (info.module !== SW_MODULE) continue;
      for (const { imported: name, local } of info.named) imported.set(local, name);
    }
    if (imported.size === 0) return [];
    const found: Registration[] = [];
    source.walk(node => {
      if (!ts.isCallExpression(node) || !this.isRegistration(source, node, imported)) return;
      const options = this.options(source, node.arguments[1]);
      found.push({
        where: `${relative(context, source.fileName)}:${source.lineOf(node)}`,
        enabled: options ? objectProperty(source, options, 'enabled') : undefined,
        unreadable: node.arguments[1] !== undefined && !options,
        source,
      });
    });
    return found;
  }

  private static isRegistration(source: TsxSource, node: TS.CallExpression, imported: Map<string, string>): boolean {
    const ts = source.ts;
    const callee = node.expression;
    if (ts.isIdentifier(callee)) return imported.get(callee.text) === 'provideServiceWorker';
    return (
      ts.isPropertyAccessExpression(callee) &&
      callee.name.text === 'register' &&
      ts.isIdentifier(callee.expression) &&
      imported.get(callee.expression.text) === 'ServiceWorkerModule'
    );
  }

  /** The options object: a literal, or a same-file const initialised with one. */
  private static options(source: TsxSource, argument: TS.Expression | undefined): TS.ObjectLiteralExpression | null {
    const ts = source.ts;
    if (!argument) return null;
    if (ts.isObjectLiteralExpression(argument)) return argument;
    if (!ts.isIdentifier(argument)) return null;
    let found: TS.ObjectLiteralExpression | null = null;
    source.walk(node => {
      if (
        !found &&
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === argument.text &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        found = node.initializer;
      }
    });
    return found;
  }

  /** `enabled: false`, or an expression that consults the native platform or a declared flag. */
  static offOnNative(registration: Registration, flags: ReadonlySet<string>): boolean {
    const { enabled, source } = registration;
    if (!enabled) return false;
    const ts = source.ts;
    if (enabled.kind === ts.SyntaxKind.FalseKeyword) return true;
    let consults = false;
    const visit = (node: TS.Node): void => {
      if (ts.isPropertyAccessExpression(node) && PLATFORM_CALLS.has(node.name.text) && node.expression.getText(source.sourceFile) === 'Capacitor') {
        consults = true;
      }
      if ((ts.isIdentifier(node) && flags.has(node.text)) || (ts.isPropertyAccessExpression(node) && flags.has(node.name.text))) {
        consults = true;
      }
      if (!consults) ts.forEachChild(node, visit);
    };
    visit(enabled);
    return consults;
  }

  /** VERSION_READY next to versionUpdates in one file, a location reload, and unrecoverable — anywhere. */
  static updateHandling(sources: readonly TsxSource[]): UpdateHandling {
    const handling: UpdateHandling = { versionReady: false, reload: false, unrecoverable: false };
    for (const source of sources) {
      const ts = source.ts;
      let versionUpdates = false;
      let ready = false;
      source.walk(node => {
        if (ts.isPropertyAccessExpression(node)) {
          if (node.name.text === 'versionUpdates') versionUpdates = true;
          if (node.name.text === 'unrecoverable') handling.unrecoverable = true;
        }
        if (ts.isStringLiteralLike(node) && node.text === VERSION_READY) ready = true;
      });
      if (versionUpdates && ready) handling.versionReady = true;
      if (methodCalls(source, source.sourceFile, 'reload').some(call => this.isLocationReload(source, call))) {
        handling.reload = true;
      }
    }
    return handling;
  }

  private static isLocationReload(source: TsxSource, call: TS.CallExpression): boolean {
    const callee = call.expression as TS.PropertyAccessExpression;
    return /(?:^|\.)location$/.test(callee.expression.getText(source.sourceFile));
  }
}
