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
import { REQUIRES_SERVERLESS_DEPLOY } from '../utils/deployment/serverless-platforms';
import { generateLawId } from '../utils/id-generator';
import { REQUIRES_UNICODE_RANGE_FONT } from '../utils/performance/font-subsets';

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
      'A pass says what it read (TypeScript files, components, components with an opening hook, the most requests one starts; also in the result\'s metrics) and what it does not follow. A project with TypeScript sources and no component (a library of services) passes with "0 Angular components"; only a project with no TypeScript source to read, or no parser for it, is judged nothing.',
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

  {
    id: generateLawId(
      'Primary Locale Font Preloaded',
      "The web-font subset that covers the app's default locale is preloaded, not discovered at first layout",
      'performance'
    ),
    legacyId: 893,
    article: 'VI',
    subsection: '6.29',
    title: 'Primary Locale Font Preloaded',
    rationale:
      "With @font-face split by unicode-range, the browser requests a subset only when text in that range is laid out. When the app's own language needs a subset other than Latin — Cyrillic for Bulgarian or Russian, Greek, Hebrew — that file is requested at first layout, arrives after it, and the relayout it forces lands right before the screen is usable. A preconnect hint does not help: the request is not known until layout.",
    satisfiedBy: {
      angular:
        'In src/index.html: <link rel="preload" as="font" type="font/woff2" href="assets/fonts/<family>-cyrillic.woff2" crossorigin> for the subset of the sourceLocale / <html lang>.',
      react:
        'In the root layout or index.html: a <link rel="preload" as="font" href="…" crossorigin> for the subset of <html lang> (next/font preloads the subsets it is given on its own, outside the stylesheets this law reads).',
    },
    detectionLimits: [
      "Faces are read from the project's own .css/.scss/.sass/.less files and <style> blocks; @font-face rules that come from node_modules (an @import of a font package), from a font CDN stylesheet, or are generated by a framework (next/font) are not seen.",
      'Selected only where a project file (.css/.scss/.sass/.less/.html/.htm/.tsx/.jsx/.vue/.svelte/.astro, up to eight directories deep, outside installed and built trees, test and story files excluded) holds an @font-face block with a unicode-range; inside a git work tree only the files git publishes are read (tracked ones from the index when the working copy differs, untracked ones that are not ignored), so a git-ignored file — generated output, a local note — never selects it; outside git the disk is walked. The faces are read from exactly those files (the gate\'s set), so the project\'s ignores do not narrow them. A selected project whose faces form no split family passes and says so; the pass names the files, split families and locales it judged (also in the result\'s metrics).',
      "The default locale is read from <html lang> (a literal) in .html/.tsx/.jsx/.vue/.svelte/.astro files, i18n.sourceLocale in angular.json/project.json, a provide: LOCALE_ID, useValue: '<literal>' provider and i18n.defaultLocale in next.config.*; a locale chosen at runtime is not seen. Every declared locale counts, so a workspace whose apps declare different locales is judged on all of them together.",
      'Locale → script is a table of Cyrillic, Greek, Hebrew, Arabic, Armenian, Georgian, Devanagari, Thai and Latin languages (a script subtag such as sr-Latn wins); a language not in it is not judged. A Latin locale gives no finding. A subset covers a script when its unicode-range reaches the basic letters (Cyrillic U+0410–044F, …), so an extended-only subset does not.',
      'A preload matches a face by the file name of its URL, in a <link rel="preload" as="font"> of any document the scan reads (not only the one that loads the stylesheet) or a Link header with rel=preload in firebase.json, _headers, vercel.json, netlify.toml or staticwebapp.config.json. A <link> preload without crossorigin is a finding (the browser does not reuse it for the font). A preload whose href is not a literal is listed, not matched.',
    ],
    emoji: '🔤',
    description:
      "The web-font subset that covers the app's default locale is preloaded, not discovered at first layout",
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    stack: 'frontend',
    staticSiteHtml: true,
    requires: REQUIRES_UNICODE_RANGE_FONT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PrimaryLocaleFontPreloadedLaw.check',
    violationMessage:
      "CONSTITUTIONAL VIOLATION Article VI.6.29: The font subset for the app's locale is not preloaded",
    remediation:
      'Preload the unicode-range subset that covers the default locale in the entry document, with crossorigin',
  },

  {
    id: generateLawId(
      'Serverless Deploy Pins Resources',
      'A serverless deploy command or definition pins cpu, memory, concurrency, timeout and the instance cap instead of inheriting platform defaults',
      'deployment'
    ),
    legacyId: 894,
    article: 'VIII',
    subsection: '8.12',
    title: 'Serverless Deploy Pins Resources',
    rationale:
      'A deploy command that omits resource and scaling flags relies on the platform defaults. The running service keeps what it was given once, so nothing looks wrong — until the same command creates a new service (another region, a recreated one), which silently starts on the defaults. The two then differ in cpu, memory and concurrency, and a latency comparison between them measures the settings, not the code.',
    satisfiedBy: {
      python:
        'Cloud Run: gcloud run deploy <service> --cpu=1 --memory=512Mi --concurrency=80 --timeout=60 --max-instances=10 in the CI step (or the same keys in the service YAML it applies).',
      typescript:
        'The same flags in the deploy step; AWS SAM: MemorySize and Timeout on each function or in Globals.Function; Serverless Framework: provider.memorySize and provider.timeout; Azure Functions: functionTimeout in host.json.',
    },
    detectionLimits: [
      'A registry of platforms, each flag checked against the platform reference: gcloud run deploy (--cpu, --memory, --concurrency, --timeout, --max-instances), gcloud run services replace and the deploy-cloudrun GitHub Action metadata (resources.limits.cpu/memory, template.spec.containerConcurrency, template.spec.timeoutSeconds, autoscaling.knative.dev/maxScale or run.googleapis.com/maxScale), the deploy-cloudrun action flags/timeout inputs, aws lambda create-function (--memory-size, --timeout), az functionapp create with --flexconsumption-location (--instance-memory, --maximum-instance-count), SAM/CloudFormation function MemorySize/Timeout (SAM Globals.Function counts), serverless.yml memorySize/timeout (provider or function) and host.json functionTimeout. Other platforms and tools (gcloud functions deploy, Cloud Run jobs, Terraform, Pulumi, CDK, Knative CLI) are not read.',
      'Not demanded: Lambda reserved concurrency (a separate put-function-concurrency call, and reserving it also takes from the account pool), Azure Functions concurrency (set after creation with scale config) and settings of plans that fix them (Azure Consumption, an App Service plan). A deploy that updates an existing function in place (update-function-code, update-function-configuration) is not judged.',
      'Commands are found as text in CI files (the provider list plus pathMappings.cicdConfig), *.yml/*.yaml, *.sh/*.bash/*.ps1, Makefiles/*.mk and package.json scripts, across continuation lines and YAML folded scalars; global flags written before the command words (gcloud --project x run deploy) hide the command, and a command inside an echo or a heredoc is read like any other.',
      'A command that passes a whole-argument expansion ($EXTRA_FLAGS, ${{ inputs.flags }}, $(cat …)) where flags could be, a --flags-file or service YAML whose path cannot be resolved (a variable, a file outside the repository), or a deploy-cloudrun flags input that is an expression is listed as a note and not judged. The YAML reader follows indentation (no anchors, aliases or flow mappings).',
      'Selected only where a file holds what the law judges, by the detector\'s own rule: a registry command at a command position (line start or list dash, after a YAML key, &&, ;, |, a shell keyword or an env assignment, or opening a quote it continues in) in *.yml/*.yaml/*.template/*.sh/*.bash/*.ps1/*.mk, a Makefile or package.json; az functionapp create only with --flexconsumption-location or -f on its line or a continuation line; a Cloud Build step whose gcloud/aws entrypoint (written before args) runs run deploy / services replace or lambda create-function; the deploy-cloudrun action; a SAM/CloudFormation function Type; serverless.yml functions; a v2 host.json. Test trees are excluded; up to eight directories deep, outside installed, built and virtualenv trees; inside a git work tree only the files git publishes are read (tracked ones from the index when the working copy differs, untracked ones that are not ignored), so a git-ignored file — generated output, a local note — never selects it; outside git the disk is walked. Prose in a JSON or YAML string, a quoted name closed right after the words, and a git-ignored file do not select it. The law reads exactly the files that selected it, so the project\'s ignores do not narrow them.',
      'Selected but with nothing it can judge: when every command it saw is a note (an expansion, an unresolvable file) it judged nothing; when the selecting line is not a command to the detector (a key inside a comment) it passes, saying it read N files and found nothing to judge. A pass names the commands and definitions judged and the files read (also in the result\'s metrics).',
    ],
    emoji: '📏',
    description:
      'A serverless deploy command or definition pins cpu, memory, concurrency, timeout and the instance cap instead of inheriting platform defaults',
    priority: 'MEDIUM',
    category: 'DEPLOYMENT',
    requires: REQUIRES_SERVERLESS_DEPLOY,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ServerlessDeployPinsResourcesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VIII.8.12: A serverless deploy leaves resource or scaling settings to platform defaults',
    remediation:
      'Pass cpu, memory, concurrency, timeout and max-instances in the deploy command, or keep them in the definition it applies',
  },
];
