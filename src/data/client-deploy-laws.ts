/**
 * Client and Deployment Laws Data Module
 *
 * What a screen asks of the network when it opens, what the browser has to
 * discover before the first layout settles, and what a deploy command leaves
 * to the platform's defaults. Each law reports every place it judged, file
 * and line; a law whose subject is absent from the project says it judged
 * nothing instead of passing.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_ANGULAR } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

export const CLIENT_DEPLOY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Startup Request Fan-Out',
      'A screen does not start more HTTP requests at once when it opens than the configured threshold',
      'performance'
    ),
    legacyId: 892,
    article: 'VI',
    subsection: '6.28',
    title: 'Startup Request Fan-Out',
    rationale:
      'A screen that opens with many independent API requests sends them within a few milliseconds. Alone each is fast; together they queue for the same backend instance, and the screen is usable only when the slowest returns. A per-endpoint latency budget measured one request at a time does not see this: every endpoint passes it, and the burst still finishes late.',
    satisfiedBy: {
      angular:
        'Start at most the threshold of requests from the constructor, ngOnInit and ionViewWillEnter: serve the first paint from one aggregate endpoint, defer below-the-fold calls (@defer on viewport, after the first render), or paint from kept data and refresh behind it.',
      ionic:
        'The same in a page: ionViewWillEnter runs on every visit, so a page that fans out there does it each time it is shown.',
    },
    detectionLimits: [
      'Angular only: each @Component class is judged on its own — the requests of a page and of the child components it renders are not added together. React (useEffect with an empty dependency list) is not read.',
      'Counted: HttpClient calls (get, post, put, patch, delete, head, options, request, jsonp) on a member injected as HttpClient (constructor parameter, inject(HttpClient), or a field typed HttpClient) and global fetch(), written in the constructor, ngOnInit or ionViewWillEnter, in a same-class method they call, or in a method of an injected service they call (one service hop, resolved by the class name of the injected type; for an abstract class used as the token, the first class extending or implementing it whose method sends a request). A request two services deep, through a store or effect, through a free function or an inject*() factory that receives the service, through a wrapper that is not HttpClient, or through an InjectionToken, is not counted.',
      'A call inside a nested function is treated as deferred and not counted (subscribe/then callbacks, setTimeout, event handlers, a Promise executor, a callback handed to a helper that may call it at once). Callbacks of forEach/map/filter/some/every/find/reduce/flatMap are counted once per call site, whatever the array length.',
      'A call is counted where it is made, whether or not its Observable is subscribed: an HttpClient call assigned to a field the template never subscribes to is still counted.',
      'The threshold is thresholds.performance.maxStartupRequests (default 4); more than that many requests is a finding. An invalid value is reported and the law does not judge.',
    ],
    emoji: '🌐',
    description:
      'A screen does not start more HTTP requests at once when it opens than the configured threshold',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'StartupRequestFanOutLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.28: A screen starts more HTTP requests at once when it opens than the threshold',
    remediation:
      'Serve the first paint from one aggregate endpoint, defer below-the-fold requests, or paint from kept data first',
  },
];
