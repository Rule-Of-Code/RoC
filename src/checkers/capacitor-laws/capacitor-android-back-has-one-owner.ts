/**
 * Capacitor Android Back Has One Owner
 *
 * On Android the hardware back press reaches the app through one of two
 * doors. @capacitor/app's AppPlugin (handleOnBackPressed) goes back in the
 * WebView's history when JavaScript has registered no `backButton` listener,
 * and only when one exists does it notify it and fire the document
 * `backbutton` event — the event Ionic's whole back-button chain (overlays,
 * menus, the outlet) starts from (`hardware-back-button.js`). Neither Ionic
 * nor Capacitor registers that listener. So with none, an open modal or
 * sheet stays while the page under it goes back; with two, one press runs
 * twice; and with one that navigates while Ionic's chain is also on
 * (`hardwareBackButton` not false), one press navigates twice.
 *
 * The first two are reliable and fail the law. The third depends on telling
 * a navigating listener body from one that is not, by call name, so it is a
 * note, not a violation.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  configValue,
  resolvedProjects,
  withNotes,
} from '../../utils/capacitor/capacitor-law-support';
import { bridgeSources, listenerCalls, objectProperty } from '../../utils/capacitor/capacitor-sources';
import { declaredDependencies } from '../../utils/law-requirements';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const APP_PLUGIN = '@capacitor/app';
const BACK_EVENT = 'backButton';
/** Call names that move the router or the history (Location.back, NavController.*, Router.navigate*, history.back). */
const NAVIGATION_CALLS = new Set([
  'back',
  'navigate',
  'navigateByUrl',
  'navigateBack',
  'navigateForward',
  'navigateRoot',
  'pop',
]);

interface BackListener {
  where: string;
  call: TS.CallExpression;
  source: TsxSource;
}

/** What the Ionic config calls say about Ionic's own back-button chain. */
export interface IonicChain {
  /** provideIonicAngular / IonicModule.forRoot calls found. */
  configs: number;
  /** Every one of them sets `hardwareBackButton: false` (and there is at least one). */
  off: boolean;
}

export class CapacitorAndroidBackHasOneOwnerLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Android Back Has One Owner';

  static check(context: LawCheckContext): LawResult {
    const { sources, unread } = bridgeSources(context);
    const violations = unread.map(
      reason => `${reason} — a backButton listener in these files would not be counted, so this law does not pass on them`
    );
    const listeners: BackListener[] = sources.flatMap(source =>
      listenerCalls(source)
        .filter(call => call.event === BACK_EVENT && call.module === APP_PLUGIN)
        .map(call => ({
          where: `${ReactProject.relative(context, source.fileName).replace(/\\/g, '/')}:${call.line}`,
          call: call.call,
          source,
        }))
    );
    const notes: string[] = [];
    if (listeners.length === 0) {
      violations.push(...this.deadChain(context));
    } else if (listeners.length > 1) {
      violations.push(
        `${listeners.length} App.addListener('backButton') call sites: ${listeners.map(l => l.where).join(', ')} — every listener is notified on each press, so one press is handled ${listeners.length} times. Keep exactly one listener for the app`
      );
    } else {
      const [only] = listeners;
      const chain = this.ionicChain(sources);
      if (only && !chain.off && this.navigates(only)) {
        notes.push(
          `${only.where}: the backButton listener navigates while Ionic's back-button chain is on (hardwareBackButton is not false in provideIonicAngular / IonicModule.forRoot) — Capacitor fires 'backbutton' for Ionic too, so one press can go back twice. Either set hardwareBackButton: false and let the listener own back, or let Ionic own it and keep the listener to App.exitApp() at the root (PARTIAL: judged by call names in the listener body)`
        );
      }
    }
    return withNotes(
      this.createResult(
        violations,
        this.LAW_NAME,
        'FRAMEWORK',
        [
          "Register exactly one App.addListener('backButton') for the app (in a root service or app initializer)",
          'Either let Ionic own back (the listener only exits at the root) or set hardwareBackButton: false and let the listener close the top overlay first, then go back',
        ],
        context
      ),
      notes
    );
  }

  /**
   * No listener: the chain is dead unless the project switched Capacitor's
   * handler off natively (plugins.App.disableBackButtonHandler), in which case
   * the press reaches neither door and the project owns back itself.
   */
  private static deadChain(context: LawCheckContext): string[] {
    const { resolved, unresolved } = resolvedProjects(context);
    const ownedNatively =
      unresolved.length === 0 &&
      resolved.length > 0 &&
      resolved.every(({ config }) => configValue(config, 'plugins.App.disableBackButtonHandler') === true);
    if (ownedNatively) return [];
    const noPlugin = declaredDependencies(context.projectRoot).has(APP_PLUGIN)
      ? ''
      : ` (${APP_PLUGIN} is not even a dependency, so nothing can register it)`;
    return [
      `no App.addListener('backButton') in any source file${noPlugin} — without one, @capacitor/app goes back in the WebView history and never fires the 'backbutton' event Ionic's back-button chain starts from, so an open modal, sheet or menu stays while the page under it goes back`,
      ...unresolved.map(reason => `${reason} (plugins.App.disableBackButtonHandler could not be read)`),
    ];
  }

  /** Ionic's chain is off only where every config call sets hardwareBackButton: false. */
  static ionicChain(sources: readonly TsxSource[]): IonicChain {
    let configs = 0;
    let off = 0;
    for (const source of sources) {
      const ts = source.ts;
      source.walk(node => {
        if (!ts.isCallExpression(node) || !this.isIonicConfigCall(source, node)) return;
        configs++;
        const value = objectProperty(source, node.arguments[0], 'hardwareBackButton');
        if (value?.kind === ts.SyntaxKind.FalseKeyword) off++;
      });
    }
    return { configs, off: configs > 0 && off === configs };
  }

  private static isIonicConfigCall(source: TsxSource, node: TS.CallExpression): boolean {
    const ts = source.ts;
    const callee = node.expression;
    if (ts.isIdentifier(callee)) return callee.text === 'provideIonicAngular';
    return (
      ts.isPropertyAccessExpression(callee) &&
      callee.name.text === 'forRoot' &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === 'IonicModule'
    );
  }

  /** Does the listener's inline body call a navigation API? */
  private static navigates({ call, source }: BackListener): boolean {
    const ts = source.ts;
    const handler = call.arguments[1];
    if (!handler || !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))) return false;
    let found = false;
    const visit = (node: TS.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        NAVIGATION_CALLS.has(node.expression.name.text)
      ) {
        found = true;
      }
      if (!found) ts.forEachChild(node, visit);
    };
    visit(handler.body);
    return found;
  }
}
