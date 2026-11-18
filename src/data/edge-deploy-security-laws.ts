/**
 * Edge Proxy and Deploy-Security Laws Data Module
 *
 * What a proxy forwards, which public addresses a deploy creates, where a
 * hosting rewrite sends traffic, which project a test build writes into, and
 * what a script writes to disk. None of it shows in a unit test: each is a
 * property of the configuration or of one line that builds a URL. Each law
 * is selected only where its subject is in the files git publishes, reports
 * every finding file and line, and says it judged nothing when it could not
 * read its subject. legacyId range: 895–899.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import {
  REQUIRES_DEFINITION_DUMP,
  REQUIRES_FIREBASE_APP_CONFIG,
  REQUIRES_HOSTING_RUN_REWRITE,
  REQUIRES_PROXY_UPSTREAM_URL,
  REQUIRES_WRANGLER_CONFIG,
} from '../utils/edge-deploy/requirements';
import { generateLawId } from '../utils/id-generator';

const GATE_READ =
  'Inside a git work tree only the files git publishes are read (tracked ones from the index when the working copy differs, untracked ones that are not ignored), so a git-ignored file never selects it; outside git the disk is walked, up to eight directories deep, outside installed, built and virtualenv trees. Test and fixture trees are excluded. The law reads exactly the files that selected it; ignores.global leaves the same files out of both.';

export const EDGE_DEPLOY_SECURITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Proxy Target Keeps Origin Host',
      'A proxy builds its upstream URL from the origin and copies only the path and query, never resolving the incoming path against the origin',
      'security'
    ),
    legacyId: 895,
    article: 'XXIII',
    subsection: '23.10',
    title: 'Proxy Target Keeps Origin Host',
    rationale:
      'A reverse proxy that forwards with new URL(incomingPath, ORIGIN) sends the request to whatever host the path names when it starts with // (or /\\): the URL standard reads a scheme-relative reference as a new host. The proxy then attaches what it adds for the origin — a shared origin-verification secret — and hands it to that host. Every test that sends a normal path passes; the escape needs one request with a doubled slash.',
    satisfiedBy: {
      typescript:
        'const target = new URL(ORIGIN); target.pathname = incoming.pathname; target.search = incoming.search; — and reject an incoming path that does not start with exactly one "/".',
      python:
        'Build the URL from the origin and the path: f"{ORIGIN}/{path.lstrip(\'/\')}" after rejecting a path that starts with "//", or httpx.URL(ORIGIN).copy_with(path=…, query=…); never urljoin(ORIGIN, request_path).',
    },
    detectionLimits: [
      "JS/TS: every new URL(a, b) with a base is judged, parsed with the project's own TypeScript (without it the JS/TS files are listed as not judged). A literal first argument is safe. A finding needs both: the first argument comes from the incoming request — a parameter named req/request/incoming/event/c/ctx/context or typed Request/NextRequest/IncomingMessage/FastifyRequest/FetchEvent/Context, or the first parameter of a fetch handler or of a callback given to serve(…) / addEventListener('fetch', …), followed through local variables and destructuring in the same file — and the URL reaches fetch, new Request, axios, got, ky, undici or http(s).request/get, as an argument (through .href, .toString() or a template) or through a local variable passed to one later in the same function.",
      'Not followed: a URL built in a helper and returned to its caller, a value passed between files, class fields. A guard that rejects // paths before the call is not recognised — the finding stays until the URL is built from the origin.',
      'Python (read as text): urljoin(base, url) whose url names request/req, a parameter of a route handler (a function with a request parameter or an @x.get(…)-style decorator) or a local assigned from one, and that is passed to requests/httpx/aiohttp/urllib3, a *client/*session object or urlopen in the same function.',
      'Proxies configured rather than coded (http-proxy and its target option, platform rewrites, nginx) are not read.',
      `Selected only where a .ts/.mts/.cts/.js/.mjs/.cjs file (.d.ts, spec/test/stories and minified files excluded) holds a new URL( with a non-literal first argument and a base and an HTTP call, or a .py file (test_*.py, *_test.py, conftest.py excluded) calls urljoin(. ${GATE_READ} A pass names the URLs judged and the files read (also in the result's metrics).`,
    ],
    emoji: '🧭',
    description:
      'A proxy builds its upstream URL from the origin and copies only the path and query, never resolving the incoming path against the origin',
    priority: 'HIGH',
    category: 'SECURITY',
    requires: REQUIRES_PROXY_UPSTREAM_URL,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ProxyTargetKeepsOriginHostLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.10: A proxy resolves the incoming path against its origin — a // path sends the request to another host',
    remediation:
      'Start from the origin URL and assign only pathname and search from the incoming request; reject paths that do not start with exactly one "/"',
  },

  {
    id: generateLawId(
      'Worker Public URLs Declared',
      'A Cloudflare Worker configuration sets workers_dev and preview_urls explicitly, and secrets are uploaded only after the Worker is deployed',
      'deployment'
    ),
    legacyId: 896,
    article: 'VIII',
    subsection: '8.13',
    title: 'Worker Public URLs Declared',
    rationale:
      'Wrangler gives a Worker a public *.workers.dev address when its configuration has no routes and leaves preview_urls at whatever setting exists (initially derived from workers_dev). For a Worker that fronts a private origin and adds a secret header on the way, each of those is a public entry point nobody reviewed, and the configuration shows none of them. A related trap: wrangler secret put on a Worker that does not exist yet creates an empty one, without asking, in a non-interactive run.',
    satisfiedBy: {
      typescript:
        'wrangler.toml: workers_dev = false and preview_urls = false at the top level (or true, written on purpose), with the routes declared; wrangler.json(c): "workers_dev": false, "preview_urls": false. In CI: wrangler deploy first, then wrangler secret put.',
    },
    detectionLimits: [
      'Read from the Wrangler configuration reference: workers_dev defaults to true when there is no route/routes; preview_urls, if omitted, keeps the existing setting (initially derived from workers_dev); both are inheritable, so an [env.x] section without them takes the top level, and the top level is what is judged. A key present with any value passes — the law asks that the decision is written, not which one.',
      'wrangler.toml is read line by line up to the first table header (no TOML parser); wrangler.json/.jsonc are parsed (comments and trailing commas allowed). A configuration that cannot be parsed is listed as not judged. A configuration generated at build time, or one passed with --config from outside the repository, is not seen; routes, custom domains and dashboard settings are not read.',
      'Secret order (read in the Wrangler source: secret put / secret bulk on a missing Worker create an empty one, defaulting to yes in a non-interactive or CI run): in one shell script, Makefile or CI YAML file, a wrangler secret put/bulk is a finding when the only wrangler deploy (or publish) of the same Worker — same --name, --env and --config as written — comes later in the file. With no deploy of that Worker in the file the order is listed as not judged; steps split across files, jobs or package.json scripts, and a change of directory between them, are not followed.',
      `Selected only where a wrangler.toml / wrangler.json / wrangler.jsonc is published, or a shell script, Makefile or CI YAML runs wrangler secret put/bulk at a command position. ${GATE_READ} A pass names the configurations and uploads judged and the files read (also in the result's metrics).`,
    ],
    emoji: '🚪',
    description:
      'A Cloudflare Worker configuration sets workers_dev and preview_urls explicitly, and secrets are uploaded only after the Worker is deployed',
    priority: 'MEDIUM',
    category: 'DEPLOYMENT',
    requires: REQUIRES_WRANGLER_CONFIG,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'WorkerPublicUrlsDeclaredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VIII.8.13: A Worker leaves its public workers.dev / preview URLs to Wrangler defaults',
    remediation:
      'Set workers_dev and preview_urls explicitly at the top level of the wrangler configuration; deploy the Worker before uploading secrets',
  },

  {
    id: generateLawId(
      'Hosting Rewrite Region Matches Deploy',
      'A hosting rewrite to a serverless service names the region the repository deploys that service to',
      'deployment'
    ),
    legacyId: 897,
    article: 'VIII',
    subsection: '8.14',
    title: 'Hosting Rewrite Region Matches Deploy',
    rationale:
      'A hosting rewrite to Cloud Run carries a region. When the deploy configuration moves the service to another region, the rewrite keeps sending traffic to the old one — silently, for as long as the old service still exists and answers. Nothing fails: the pages load, from the wrong region, against the code that was there when the move happened, until someone reads the configuration.',
    satisfiedBy: {
      typescript:
        'firebase.json: "rewrites": [{ "source": "/api/**", "run": { "serviceId": "api", "region": "europe-west3" } }] with the same region as gcloud run deploy api --region europe-west3 (or the deploy-cloudrun action\'s region input); change both in the same release.',
      python:
        'Deploy with gcloud run deploy <service> --region <R> (or a $REGION defined in the same file) and keep the hosting rewrite\'s region equal to R.',
    },
    detectionLimits: [
      'Rewrites read (a registry): Firebase Hosting rewrites[].run in firebase.json (serviceId and region; an omitted region is us-central1, as Firebase documents), and a Cloud Run deterministic URL (https://[TAG---]SERVICE-PROJECT_NUMBER.REGION.run.app, the form Cloud Run documents) in vercel.json, netlify.toml or _redirects — Vercel and Netlify rewrites have no region field, the region is in the URL. Firebase rewrites to a function, Cloud Run URLs of the SERVICE_IDENTIFIER.run.app form and other hosts are not read.',
      'Deploy configuration read (a registry): gcloud [alpha|beta] run deploy SERVICE --region R in shell/PowerShell scripts, Makefiles, CI YAML (also the Cloud Build entrypoint + args form) and package.json scripts, and the google-github-actions/deploy-cloudrun service/region inputs (default us-central1). $VAR, ${VAR}, ${VAR:-default} and ${{ env.VAR }} are resolved from an assignment or YAML key of that name in the same file; anything else (secrets, vars, inputs, another file) is unknown and never guessed.',
      'A rewrite is compared with the deploys of the same service: no deploy in its region is a finding. With no deploy of that service in the repository, the rewrite region is compared with every region the repository deploys to (the single-repository rule): absent from all is a finding. A deploy of the service whose region cannot be read, or deploys that name no region at all, are listed as not judged. Deploy configuration in another repository is not read. Terraform, Pulumi, gcloud config set run/region, gcloud run services replace and console changes are not read.',
      `Selected only where both are published: a firebase.json with a run rewrite ("serviceId") or a vercel.json / netlify.toml / _redirects with a Cloud Run deterministic URL, AND a Cloud Run deploy to compare it with (gcloud run deploy at a command position — not in a comment — in a script, Makefile, CI YAML or package.json script; the deploy-cloudrun action; the Cloud Build args form). A repository that only hosts, its services deployed from another repository, does not select it. ${GATE_READ} Both halves are what the law reads. A pass names the rewrites compared and the files read (also in the result's metrics).`,
    ],
    emoji: '🗺️',
    description:
      'A hosting rewrite to a serverless service names the region the repository deploys that service to',
    priority: 'MEDIUM',
    category: 'DEPLOYMENT',
    requires: REQUIRES_HOSTING_RUN_REWRITE,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'HostingRewriteRegionMatchesDeployLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VIII.8.14: A hosting rewrite sends traffic to a region the service is not deployed to',
    remediation:
      'Make the rewrite region equal to the region the service is deployed to, and change both in the same release',
  },

  {
    id: generateLawId(
      'Test Builds Use Own Firebase Config',
      'A debug, benchmark or test build does not bundle the production Firebase config with Messaging auto-init on',
      'security'
    ),
    legacyId: 898,
    article: 'XXIII',
    subsection: '23.11',
    title: 'Test Builds Use Own Firebase Config',
    rationale:
      'A debug, benchmark or test build that bundles the production google-services.json (or GoogleService-Info.plist) registers a Firebase Installation and an FCM token in the production project on every cold start — even when the app talks to a mock API. A cold-start measurement run then writes thousands of installations into production, and nothing in the app looks different.',
    satisfiedBy: {
      capacitor:
        'android/app/src/debug/google-services.json (and src/benchmark/…) from a dev Firebase project, or <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" /> in android/app/src/debug/AndroidManifest.xml; iOS: a per-configuration GoogleService-Info.plist or FirebaseMessagingAutoInitEnabled = NO (or $(FCM_AUTO_INIT) set to NO for Debug).',
      typescript:
        'The same in any native shell (React Native, Flutter, plain Android/iOS): a config per non-release build type from a dev project, or Messaging auto-init off for those builds.',
    },
    detectionLimits: [
      "Android: each module's google-services.json files (the module root and src/<source set>/) are resolved per variant the way the Google Services Gradle plugin's source does it (src/<flavor>/<buildType>, src/<buildType>/<flavor>, src/<flavor>, src/<buildType>, src/<flavor><BuildType>, the module root; deepest first). Every build type other than release counts as non-release — the debug build type always exists, so a module whose debug build uses the release build's project_id is a finding until it has its own config or auto-init off. Build types and flavours are read from buildTypes { } / productFlavors { } blocks of the module's build.gradle(.kts) (Groovy and Kotlin DSL, create/getByName/register forms); variants made in code, and more than one flavour dimension, are not followed (listed as not judged).",
      'Auto-init off: firebase_messaging_auto_init_enabled = "false" (the meta-data Firebase documents) in the manifest of the most specific source set that sets it (flavour+build type, build type, flavour, main), or a ${key} placeholder whose manifestPlaceholders value is false in the build type, flavour or defaultConfig block. firebase_analytics_collection_enabled and runtime calls (setAutoInitEnabled) are not read. Firebase Installations also registers without Messaging; the law accepts auto-init off as the issue does.',
      "iOS: an Xcode project (project.pbxproj) with exactly one GoogleService-Info.plist in its directory: every configuration other than Release (Debug included) bundles the release config, a finding unless the app's Info.plist sets FirebaseMessagingAutoInitEnabled to <false/>, or to $(VAR) with VAR = NO in that configuration's build settings. Two or more plists are taken as per-configuration and pass; which one a Run Script phase copies is not read.",
      'A config that CI writes into the tree, or one that is git-ignored (not published), is not seen — the law is not selected by it, since the variants it would serve cannot be known.',
      `Selected only where a published google-services.json holds a project_id or a GoogleService-Info.plist holds a PROJECT_ID. ${GATE_READ} Gradle scripts, manifests, project.pbxproj and Info.plist are read through the same reader. A pass names the variants / configurations judged and the files read (also in the result's metrics).`,
    ],
    emoji: '🧪',
    description:
      'A debug, benchmark or test build does not bundle the production Firebase config with Messaging auto-init on',
    priority: 'MEDIUM',
    category: 'SECURITY',
    requires: REQUIRES_FIREBASE_APP_CONFIG,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TestBuildsUseOwnFirebaseConfigLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.11: A non-release build bundles the production Firebase config with Messaging auto-init on',
    remediation:
      'Give non-release builds their own Firebase config from a dev project, or turn Messaging auto-init off for them',
  },

  {
    id: generateLawId(
      'Job Definition Dumps Masked',
      'A script that saves a cloud scheduler or job definition to a file or a log removes the secret headers and values first',
      'security'
    ),
    legacyId: 899,
    article: 'XXIII',
    subsection: '23.12',
    title: 'Job Definition Dumps Masked',
    rationale:
      'gcloud scheduler jobs describe and list --format=json return a job\'s HTTP headers verbatim. When a job sends a shared secret in a header — an origin-verification header — any script that saves that output as evidence, a backup or a log writes the secret in plain text. A region move that lists every job to a JSON file is enough; nobody looks for a secret in a listing.',
    satisfiedBy: {
      typescript:
        "gcloud scheduler jobs list --format=json | jq 'del(.[].httpTarget.headers)' > jobs.json, or --format=\"value(name,schedule,state)\", or pipe through a redact helper before the file.",
      python:
        'Delete job["httpTarget"]["headers"] (or call a redact/mask helper) before json.dump; or ask gcloud only for the fields you need with a --format projection.',
    },
    detectionLimits: [
      'Commands (a registry, each checked against its reference): gcloud [alpha|beta] scheduler jobs describe (default YAML, the whole job) and scheduler jobs list (default table without headers — judged only with --format=json|yaml), gcloud run jobs describe and gcloud functions describe (the whole resource, environment included), aws events list-targets-by-rule (JSON by default; HttpParameters.HeaderParameters) and az functionapp config appsettings list (setting values in plain text). A gcloud --format projection, or an aws/az --query, that does not name headers, environment or values is not a dump. Azure Logic Apps (az logic workflow show) and EventBridge Scheduler are not in the registry: their outputs were not confirmed to carry header values.',
      'A dump leaks when its output goes to a file (>, >>, tee, Out-File, Set-Content, Add-Content, Tee-Object) or, in a CI pipeline file (.github/workflows, .gitlab-ci, bitbucket/azure pipelines, CircleCI, cloudbuild*.yaml), unpiped into the job log. Masked: a jq/yq stage with del(…) of a header/env/value field, a sed stage on header or secret values, a stage whose command name says mask/redact/scrub/sanitize, or such a helper run later in the file on the file written. A jq/yq filter that is not del(…) or the identity is listed as not judged, as is output captured into a variable ($(…)).',
      'Python is read as text: a string or list argument that spells one of the commands, in a file that writes files (open(…, "w"/"a"/"x"), write_text, stdout= a handle) and has no mask/redact/scrub/sanitize name or headers deletion anywhere, is a finding; the data flow from the command to the write is not followed. Cloud SDK clients (google-cloud-scheduler, boto3, azure-mgmt) and package.json scripts are not read.',
      `Selected only where a shell script, Makefile or CI YAML runs one of the commands at a command position (not in a comment), or a .py file (test_*.py, *_test.py, conftest.py excluded) holds one in a string. ${GATE_READ} A pass names the commands judged and the files read (also in the result's metrics).`,
    ],
    emoji: '🗝️',
    description:
      'A script that saves a cloud scheduler or job definition to a file or a log removes the secret headers and values first',
    priority: 'HIGH',
    category: 'SECURITY',
    requires: REQUIRES_DEFINITION_DUMP,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'JobDefinitionDumpsMaskedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.12: A script saves a job definition with its secret headers in plain text',
    remediation:
      "Delete the header and secret fields before the output reaches a file or a log (jq 'del(.[].httpTarget.headers)', a redact helper), or print only the fields you need",
  },
];
