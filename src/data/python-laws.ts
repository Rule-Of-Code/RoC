/**
 * Python Laws Data Module
 * The Python domain for RoC — a FastAPI + Clean Architecture / CQRS stack, the
 * backend equivalent of the Angular + NgRx frontend domain. Generic across any
 * project on that stack (not project-specific). legacyId range: 200-299.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const PYTHON_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Domain Layer Framework Independence',
      'The domain layer must not import web frameworks, ORMs, HTTP clients or cloud SDKs',
      'python'
    ),
    legacyId: 200,
    article: 'VII',
    subsection: '7.1',
    title: 'Domain Layer Framework Independence',
    rationale:
      'The domain is where the business rules live; the day they import fastapi or sqlalchemy they can no longer be tested or reasoned about without the whole stack. Framework-free domain code outlives the framework.',
    satisfiedBy: { python: 'Keep web / ORM / SDK imports out of files under domain/; depend on abstractions the outer layers implement.' },
    detectionLimits: [
      'Scans only files under a directory named domain/ — a top-level domain.py is not matched, and a project without that directory is never scanned.',
      'Matches a hard-coded framework list at import; ORMs/SDKs outside it (tortoise, peewee, motor, grpc…) pass.',
      'Regex over imports, no module resolution — a relative `from ..db import X` that reaches infrastructure is invisible.',
    ],
    emoji: '🧱',
    description:
      'Clean Architecture: the domain layer stays framework-independent (no FastAPI/ORM/HTTP/cloud imports)',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DomainLayerFrameworkIndependenceLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.1: Infrastructure leaked into the domain layer',
    remediation:
      'Depend on Protocol/ABC ports in the domain; implement them in the infrastructure layer',
  },

  {
    id: generateLawId(
      'FastAPI Typed Responses',
      'FastAPI routes returning data should declare a Pydantic response_model',
      'python'
    ),
    legacyId: 201,
    article: 'VII',
    subsection: '7.2',
    title: 'FastAPI Typed Responses',
    rationale:
      'An endpoint that returns a bare dict has no contract — the client cannot know the shape, OpenAPI cannot document it, and a renamed field ships silently. A declared response model is the API\'s promise, checked.',
    satisfiedBy: { python: 'Give each route a response_model=, a response_class=, or a 204 status.' },
    detectionLimits: [
      'Reads the decorator only — not the route\'s `-> Model` return annotation, which modern FastAPI uses as the response model, so those routes are flagged.',
      'Checks get/post/put/patch; DELETE/HEAD/OPTIONS are out of scope, and the responses={...} dict form is not counted.',
      'The FastAPI gate reads manifest files, not lockfiles — fastapi declared only in a lockfile means the law does not run.',
    ],
    emoji: '🔌',
    description:
      'FastAPI data routes declare a Pydantic response_model (typed, validated response contract)',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'FastApiTypedResponsesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.2: FastAPI route without a typed response_model',
    remediation:
      'Add response_model=YourPydanticModel; use response_class/204 only when there is no JSON body',
  },

  {
    id: generateLawId(
      'No Blocking Calls In Async',
      'Synchronous blocking calls inside async def stall the event loop',
      'python'
    ),
    legacyId: 202,
    article: 'VII',
    subsection: '7.3',
    title: 'No Blocking Calls In Async',
    rationale:
      'One blocking call inside an async function stalls the whole event loop — every other request waits on that one time.sleep or requests.get. In an async service, a sync call is a hidden single-threaded bottleneck.',
    satisfiedBy: { python: 'Inside async def, use await with async clients (httpx.AsyncClient, aiohttp) and asyncio.sleep; push unavoidable blocking work to a thread executor.' },
    detectionLimits: [
      'Detects only time.sleep, requests.<verb> and urllib.request.urlopen — file IO, sync DB drivers, boto3, subprocess and httpx.Client(sync) all pass.',
      'A nested sync def inside the async body is still scanned, so a blocking call in a nested helper is a false positive.',
      'Literal module.attr prefixes only — `from time import sleep; sleep()` is missed.',
    ],
    emoji: '⏳',
    description:
      'No synchronous blocking calls (time.sleep/requests) inside async def — use async equivalents',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoBlockingInAsyncLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.3: Blocking call inside async function',
    remediation:
      'Use await asyncio.sleep()/httpx.AsyncClient, or offload blocking work to a thread executor',
  },

  {
    id: generateLawId(
      'Dependency Injection Via Depends',
      'FastAPI route handlers should inject collaborators via Depends, not instantiate them',
      'python'
    ),
    legacyId: 203,
    article: 'VII',
    subsection: '7.4',
    title: 'Dependency Injection Via Depends',
    rationale:
      'A handler that constructs its own service cannot be tested without the real thing and cannot be reconfigured per request. Depends() makes the collaborator a seam — swappable in tests, injected in prod.',
    satisfiedBy: { python: 'Receive collaborators through Depends() parameters instead of instantiating Service()/Repository() inside the handler.' },
    detectionLimits: [
      'Flags only class names ending Service/Repository/Repo/Client/Gateway/UseCase/Handler/Manager — a collaborator named Db, UserStore or a get_conn() call is invisible.',
      'Any Depends( on a line suppresses that whole line; module-level construction outside the handler body is not scanned.',
      'Only files under recognised api/router/endpoint paths; a route in an unrecognised directory is skipped.',
    ],
    emoji: '💉',
    description:
      'Route handlers inject services/repositories via Depends() instead of constructing them inline',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DependencyInjectionViaDependsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.4: Collaborator constructed in a route handler instead of injected',
    remediation:
      'Inject via Depends(): svc: OrderService = Depends(get_order_service)',
  },

  {
    id: generateLawId(
      'FastAPI Typed Request Bodies',
      'Write endpoints should accept a Pydantic model body, not raw request.json or dict',
      'python'
    ),
    legacyId: 204,
    article: 'VII',
    subsection: '7.5',
    title: 'FastAPI Typed Request Bodies',
    rationale:
      'A body typed as dict accepts anything and validates nothing — the 400 you should have gotten becomes a 500 three layers down. A Pydantic model is the request\'s schema, enforced at the edge.',
    satisfiedBy: { python: 'Type write-route bodies with a Pydantic model, not dict, and do not read request.json() by hand.' },
    detectionLimits: [
      'Detects only an explicit `: dict` param and request.json() — an unannotated body, or one typed Any/list/bytes, or await request.body()/.form() is missed.',
      'The dict match is any parameter typed dict (e.g. an injected headers: dict), so it can false-flag a non-body param.',
      'Only api-layer files, and only post/put/patch routes.',
    ],
    emoji: '📥',
    description:
      'POST/PUT/PATCH bodies are typed Pydantic models, not raw request.json() or untyped dict',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'FastApiTypedRequestBodiesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.5: Untyped request body in a write endpoint',
    remediation:
      'Accept a Pydantic model parameter for the body instead of request.json()/dict',
  },

  {
    id: generateLawId(
      'Clean Architecture Dependency Direction',
      'Dependencies point inward: interface to application to domain; infra implements ports',
      'python'
    ),
    legacyId: 205,
    article: 'VII',
    subsection: '7.6',
    title: 'Clean Architecture Dependency Direction',
    rationale:
      'Dependencies must point inward: domain knows nothing of infrastructure, or the arrows tangle and a database change ripples into business rules. This law enforces the direction that keeps the core independent.',
    satisfiedBy: { python: 'Import only inward (interface -> application -> domain; infrastructure implements domain ports); never import an outer layer from an inner one.' },
    detectionLimits: [
      'Purely keyword/path based — a project that does not use domain/application/infrastructure/interface directory names is never scanned.',
      'An outward import whose path lacks the layer keyword (`from ..db import X`) is missed; no module resolution.',
      'Reports only the first offending import per file; the interface layer has no restrictions and is never checked.',
    ],
    emoji: '🧭',
    description:
      'Layer dependencies point inward (domain↮outer): no domain→app/infra/api, app→infra/api, infra→api',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CleanArchitectureDependencyDirectionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.6: Outward layer dependency (wrong direction)',
    remediation:
      'Point dependencies inward; invert outward needs with a port (Protocol/ABC) implemented in infrastructure',
  },

  {
    id: generateLawId(
      'No Web Framework Outside Interface',
      'The web framework belongs only in the interface layer, not application/infrastructure',
      'python'
    ),
    legacyId: 206,
    article: 'VII',
    subsection: '7.7',
    title: 'No Web Framework Outside Interface',
    rationale:
      'A web framework import in the application or infrastructure layer means HTTP has leaked into code that should not know how it is called — the same logic can no longer run from a CLI, a worker, or a test without a request.',
    satisfiedBy: { python: 'Confine fastapi/starlette/flask/etc. to the interface layer; keep application and infrastructure framework-free.' },
    detectionLimits: [
      'Scans only files under application/ and infrastructure/ directories; unrecognised-layer files are skipped.',
      'Matches a fixed framework list — tornado, bottle, falcon, aiohttp.web, werkzeug and plain django pass.',
      'Import must start the line; a relative import of a local web module is not caught.',
    ],
    emoji: '🚪',
    description:
      'Web framework (FastAPI/Starlette/Flask) imports confined to the interface layer',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoWebFrameworkOutsideInterfaceLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.7: Web framework imported outside the interface layer',
    remediation:
      'Keep web concerns in the interface layer; pass plain data into application/infrastructure',
  },

  {
    id: generateLawId(
      'Queries Are Read-Only',
      'CQRS query handlers must not perform persistence writes',
      'python'
    ),
    legacyId: 207,
    article: 'VII',
    subsection: '7.8',
    title: 'Queries Are Read-Only',
    rationale:
      'A query that also writes is a lie about what it does — the reader trusts it to be safe to call, cache and retry, and it is not. Separating reads from writes is what makes a system safe to reason about.',
    satisfiedBy: { python: 'Keep save/delete/insert/commit and DML out of query files and query-named classes; do writes in command handlers.' },
    detectionLimits: [
      'Scope is name-based — only query-named files or classes literally containing "query"; a read handler named GetOrdersHandler in a normally-named file is invisible.',
      'The mutation verb list is fixed (save/delete/insert/commit/flush/bulk_*/add_all) — .add(, .update(, .merge(, .execute(, .remove( are not caught.',
      'The raw-SQL branch is effectively dead: SQL lives in string literals, which are blanked before matching.',
    ],
    emoji: '🔍',
    description:
      'CQRS read side: queries/query handlers never write (no save/delete/insert/commit)',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'QueriesAreReadOnlyLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.8: Query path performs a persistence write',
    remediation: 'Move writes to a command handler; keep the query side read-only',
  },

  {
    id: generateLawId(
      'Commands And Queries Are Messages',
      'Command/Query classes should be immutable data messages, not behaviour classes',
      'python'
    ),
    legacyId: 208,
    article: 'VII',
    subsection: '7.9',
    title: 'Commands And Queries Are Messages',
    rationale:
      'A command or query passed as loose arguments has no schema and drifts field by field. Making it a typed message (a dataclass or Pydantic model) gives it one shape, validated once, that every handler can trust.',
    satisfiedBy: { python: 'Declare *Command / *Query classes as a dataclass, Pydantic BaseModel, NamedTuple or msgspec.Struct.' },
    detectionLimits: [
      'Only classes literally ending Command/Query, whose header + base list fit on one line ending in `:` — a multi-line base list is not matched at all.',
      'DTO detection is name-based: a subclass of a custom frozen base (class FooCommand(BaseCommand)) that is itself a dataclass is false-flagged.',
      'Enum and Protocol bases are not recognised as message types.',
    ],
    emoji: '✉️',
    description:
      'Command/Query classes are immutable data (frozen dataclass / Pydantic / NamedTuple), not plain classes',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CommandsQueriesAreMessagesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.9: Command/Query is a plain class, not a data message',
    remediation:
      'Define commands/queries as @dataclass(frozen=True) or Pydantic models; keep behaviour in the handler',
  },

  {
    id: generateLawId(
      'Settings Via BaseSettings',
      'Configuration should be centralised in a Pydantic BaseSettings, not scattered os.getenv',
      'python'
    ),
    legacyId: 209,
    article: 'VII',
    subsection: '7.10',
    title: 'Settings Via BaseSettings',
    rationale:
      'os.getenv scattered through the code means configuration has no single shape, no validation and no place to look — a missing variable surfaces as an AttributeError at 3am. Centralised settings turn config into a typed object.',
    satisfiedBy: { python: 'Read configuration through a pydantic BaseSettings (or a dedicated settings module), not os.getenv/os.environ sprinkled across the codebase.' },
    detectionLimits: [
      'Flags only os.getenv / os.environ — `from os import environ`, dotenv, decouple.config() and django settings all pass.',
      'It does not verify a BaseSettings actually exists; a project with no settings and no os.getenv passes.',
      'Any file named or placed under settings/ or config/ is fully exempt regardless of content.',
    ],
    emoji: '⚙️',
    description:
      'Configuration is read once in a Pydantic BaseSettings, not via scattered os.getenv/os.environ',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'SettingsViaBaseSettingsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.10: Direct environment access outside the settings module',
    remediation:
      'Define a pydantic_settings.BaseSettings model and inject it instead of calling os.getenv',
  },

  {
    id: generateLawId(
      'No Mutable Default Arguments',
      'Mutable default arguments are shared across calls and leak state',
      'python'
    ),
    legacyId: 210,
    article: 'VII',
    subsection: '7.11',
    title: 'No Mutable Default Arguments',
    rationale:
      'A def f(x=[]) shares that one list across every call that omits x — a classic Python trap where state leaks between unrelated calls. The default is evaluated once, at definition, not per call.',
    satisfiedBy: { python: 'Use None as the default and build the list/dict/set inside the function (x = x or []).' },
    detectionLimits: [
      'Detects only EMPTY literals ([], {}, set()/list()/dict()) — =[1], ={"a":1} and custom mutables are missed.',
      'The signature is matched as a whole, so a nested call kwarg like def f(x=Body(default=[])) can false-flag the function.',
      'Regex, not AST — no distinction between a real default and one produced by a factory helper.',
    ],
    emoji: '🧨',
    description:
      'No mutable default arguments ([]/{}/set()) — they are evaluated once and shared across calls',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoMutableDefaultArgumentsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.11: Mutable default argument',
    remediation:
      'Default to None and create the [] / {} inside the function body',
  },

  {
    id: generateLawId(
      'No Bare Except',
      'Bare except / except BaseException swallows KeyboardInterrupt and SystemExit',
      'python'
    ),
    legacyId: 211,
    article: 'VII',
    subsection: '7.12',
    title: 'No Bare Except',
    rationale:
      'except: catches everything — including the KeyboardInterrupt you pressed and the SystemExit that is trying to shut you down. It hides the bug you have not thought of behind the ones you have.',
    satisfiedBy: { python: 'Catch a specific exception type; never bare `except:` or `except BaseException:`.' },
    detectionLimits: [
      'Catches bare `except:` and `except BaseException:`; the tuple form `except (BaseException, X):` is not caught.',
      'Line-anchored — an except split unusually across lines is missed.',
      'It does not judge whether the caught type is appropriate, only that it is not bare.',
    ],
    emoji: '🛑',
    description:
      'No bare "except:" or "except BaseException" — catch a specific exception type',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoBareExceptLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.12: Bare except clause',
    remediation:
      'Catch a specific exception type; use except Exception (not bare/BaseException) only when truly needed',
  },

  {
    id: generateLawId(
      'Async Tests Are Marked',
      'Async tests must be marked for pytest or they are collected but never awaited',
      'python'
    ),
    legacyId: 212,
    article: 'VII',
    subsection: '7.13',
    title: 'Async Tests Are Marked',
    rationale:
      'An unmarked async test does not run its body — pytest collects the coroutine, never awaits it, and the test passes green having asserted nothing. A missing marker is a test that silently does not test.',
    satisfiedBy: { python: 'Mark each async test with @pytest.mark.asyncio (or anyio), or set asyncio_mode=auto in config.' },
    detectionLimits: [
      'Short-circuits to pass when asyncio_mode/anyio_mode=auto; otherwise looks for the marker only in the decorators DIRECTLY above the def.',
      'A class-level marker or a module-level `pytestmark = pytest.mark.asyncio` (both common) is not seen and false-fails.',
      'Only functions named test_*; @pytest.mark.trio and custom async markers are not recognised.',
    ],
    emoji: '🧪',
    description:
      'async def test_* carries @pytest.mark.asyncio/anyio (or asyncio_mode=auto) so it actually runs',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AsyncTestsAreMarkedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.13: Async test without an async marker (silent pass)',
    remediation:
      'Add @pytest.mark.asyncio/anyio, or set asyncio_mode = "auto" in pytest config',
  },

  {
    id: generateLawId(
      'No Live Network In Tests',
      'Unit tests must not make real network calls; mock the client',
      'python'
    ),
    legacyId: 213,
    article: 'VII',
    subsection: '7.14',
    title: 'No Live Network In Tests',
    rationale:
      'A test that hits the real network is not a test of your code — it is a test of someone else\'s uptime, your DNS, and today\'s weather. It fails for reasons unrelated to the change and passes when it should not.',
    satisfiedBy: { python: 'Mock the client or use a recorded fixture; keep real network calls in tests under integration/ or e2e/.' },
    detectionLimits: [
      'Matches requests/httpx verb calls, urlopen, socket.socket and httpx.Client — aiohttp and httpx.AsyncClient are NOT matched.',
      'urllib3, http.client, pycurl and `from requests import get; get()` all pass.',
      'The integration/e2e exclusion is a path substring, so a unit file whose path merely contains "functional" is exempted.',
    ],
    emoji: '🌐',
    description:
      'Unit tests are hermetic — no real requests/httpx/socket calls (integration/e2e exempt)',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoLiveNetworkInTestsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.14: Live network call in a unit test',
    remediation:
      'Mock with responses/respx or a fake; move real-service tests to an integration suite',
  },

  {
    id: generateLawId(
      'No Sleep In Tests',
      'A real sleep makes tests slow and flaky; wait on the condition or control the clock',
      'python'
    ),
    legacyId: 214,
    article: 'VII',
    subsection: '7.15',
    title: 'No Sleep In Tests',
    rationale:
      'time.sleep in a test trades correctness for a guess — too short and it is flaky, too long and the suite crawls. A test should wait on a condition, not on the clock.',
    satisfiedBy: { python: 'Replace sleeps with an explicit wait-for-condition, a fake clock, or awaiting the event you actually need.' },
    detectionLimits: [
      'Detects only time.sleep and asyncio.sleep — `from time import sleep; sleep()` and trio.sleep are missed.',
      'Flags asyncio.sleep(0) too, though it is a cooperative-yield idiom, not a wait.',
      'It does not distinguish a sleep in a helper from one in a test body.',
    ],
    emoji: '💤',
    description:
      'No time.sleep/asyncio.sleep in tests — wait on the real condition or control the clock',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoSleepInTestsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.15: Sleep in a test (flaky/slow)',
    remediation:
      'Poll/await the real condition or freeze/inject the clock instead of sleeping',
  },

  {
    id: generateLawId(
      'No Eval Or Exec',
      'eval/exec execute arbitrary code and are a remote-code-execution risk',
      'python'
    ),
    legacyId: 215,
    article: 'VII',
    subsection: '7.16',
    title: 'No Eval Or Exec',
    rationale:
      'eval and exec run whatever string reaches them — the moment any part of that string is influenced by input, it is remote code execution. There is almost always a parser or a dispatch table that does the job without the risk.',
    satisfiedBy: { python: 'Replace eval/exec with explicit parsing (ast.literal_eval for data, a dict dispatch for behaviour).' },
    detectionLimits: [
      'Detects the bare eval(/exec( call shape only — getattr(builtins,"eval")(), compile()+exec, and an alias e=eval; e() bypass it.',
      'No data-flow: it flags eval("1+1") on a constant the same as on tainted input.',
      'ast.literal_eval and method .eval() (e.g. a model) are correctly excluded.',
    ],
    emoji: '☢️',
    description:
      'No eval()/exec() — they execute arbitrary code (use ast.literal_eval or a dispatch table)',
    priority: 'CRITICAL',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NoEvalExecLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.16: eval()/exec() (arbitrary code execution)',
    remediation:
      'Use ast.literal_eval for data, or a dispatch dict / getattr for behaviour',
  },

  {
    id: generateLawId(
      'Insecure Deserialization',
      'pickle/marshal and yaml.load without SafeLoader can execute code on untrusted input',
      'python'
    ),
    legacyId: 216,
    article: 'VII',
    subsection: '7.17',
    title: 'Insecure Deserialization',
    rationale:
      'pickle.loads and yaml.load will construct arbitrary objects from bytes — hand them attacker-controlled data and they execute attacker code. Deserialization of untrusted input is one of the oldest RCE classes.',
    satisfiedBy: { python: 'Use safe formats (json, yaml.safe_load); never unpickle or marshal untrusted data.' },
    detectionLimits: [
      'Needs the literal pickle./marshal./yaml. prefix — `import pickle as p; p.loads()`, dill, jsonpickle and shelve all pass.',
      'yaml.load(Loader=var) where the var is safe but not named *Safe is false-flagged; the reverse also bypasses.',
      'No data-flow — trusted vs untrusted input is not considered.',
    ],
    emoji: '🧬',
    description:
      'No pickle/marshal of untrusted data and no yaml.load without SafeLoader (RCE risk)',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'InsecureDeserializationLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.17: Insecure deserialization (pickle/marshal/yaml.load)',
    remediation:
      'Use JSON or yaml.safe_load; never deserialize untrusted data with pickle/marshal',
  },

  {
    id: generateLawId(
      'No Shell Injection',
      'subprocess shell=True and os.system run commands through a shell (injection risk)',
      'python'
    ),
    legacyId: 217,
    article: 'VII',
    subsection: '7.18',
    title: 'No Shell Injection',
    rationale:
      'A subprocess with shell=True hands your string to /bin/sh — one interpolated filename with a semicolon and the shell runs the attacker\'s command. Passing an argument list skips the shell and the whole class of bug.',
    satisfiedBy: { python: 'Pass args as a list with shell=False (the default); avoid os.system/os.popen.' },
    detectionLimits: [
      'Flags subprocess.* only when shell=True is a LITERAL on the call; shell=a_variable is not caught.',
      'Needs the literal subprocess./os. prefix — `from subprocess import run; run(..., shell=True)` and aliases are missed.',
      'asyncio.create_subprocess_shell, commands.getoutput and pty.spawn are not covered; no data-flow (a constant command is flagged like an interpolated one).',
    ],
    emoji: '🐚',
    description:
      'No subprocess(..., shell=True) / os.system / os.popen — pass an argument list (shell=False)',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NoShellInjectionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.18: Command run through a shell (injection risk)',
    remediation:
      'Pass args as a list with shell=False (default); avoid os.system/os.popen',
  },

  {
    id: generateLawId(
      'Requests Have Timeout',
      'HTTP calls without a timeout can hang forever and exhaust the worker pool',
      'python'
    ),
    legacyId: 218,
    article: 'VII',
    subsection: '7.19',
    title: 'Requests Have Timeout',
    rationale:
      'A requests call with no timeout can hang forever — one slow dependency and your worker is stuck, holding a connection, until something else kills it. A timeout is the difference between a slow request and a wedged process.',
    satisfiedBy: { python: 'Pass timeout= to every outbound HTTP call.' },
    detectionLimits: [
      'Detects only requests.<verb>( and urllib.request.urlopen( — aliased imports, session.get, and httpx/aiohttp entirely are missed.',
      'Checks only for the presence of the timeout= token, so timeout=None (which still hangs) passes.',
      'A call with unbalanced parens (across tricky lines) is skipped.',
    ],
    emoji: '⏱️',
    description:
      'Outbound requests/urlopen calls pass an explicit timeout= (requests has no default)',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'RequestsHaveTimeoutLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.19: HTTP call without a timeout',
    remediation: 'Pass an explicit timeout= to every outbound HTTP call',
  },

  {
    id: generateLawId(
      'No Hardcoded Secrets Python',
      'Secrets assigned to string literals in .py end up in version control',
      'python'
    ),
    legacyId: 219,
    article: 'VII',
    subsection: '7.20',
    title: 'No Hardcoded Secrets (Python)',
    rationale:
      'A secret in source is a secret in git history forever, readable by everyone who ever clones the repo. It belongs in the environment, injected at deploy time — never in a string literal.',
    satisfiedBy: { python: 'Read secrets from the environment/settings; keep only placeholders in code.' },
    detectionLimits: [
      'Single-line, line-anchored assignment only — a dict entry ("password": "..."), a kwarg (password="..."), an f-string or a value under 8 chars is missed.',
      'Any value containing whitespace, a slash or a URL is exempted, so a real secret with those characters escapes.',
      'Name exemptions (…url/…path/…id/…key_path) let secret_key_path and api_key_id pass.',
    ],
    emoji: '🔑',
    description:
      'No password/API-key/token assigned to a string literal in .py — read from env/BaseSettings',
    priority: 'CRITICAL',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NoHardcodedSecretsPythonLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.20: Hardcoded secret in a Python source file',
    remediation:
      'Read secrets from the environment / a secrets manager via a Pydantic BaseSettings',
  },

  {
    id: generateLawId(
      'Ruff Configured',
      'A linter must be configured so lint rules are enforced consistently',
      'python'
    ),
    legacyId: 220,
    article: 'VII',
    subsection: '7.21',
    title: 'Ruff Configured',
    rationale:
      'A linter that is not configured is a linter that does not run — style and a whole class of bugs go uncaught. This law asks that a linter be declared, so the gate has teeth.',
    satisfiedBy: { python: 'Declare ruff (or flake8/pylint) in pyproject.toml or a config file.' },
    detectionLimits: [
      'Presence only: an empty [tool.ruff] header passes; it does not check that rules are selected or that ruff runs in CI.',
      'Reads config files and pyproject sections only — a linter wired ONLY as a pre-commit hook is not seen and false-fails.',
    ],
    emoji: '📏',
    description:
      'A linter is configured (ruff/flake8/pylint) so lint rules are enforced consistently',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'RuffConfiguredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.21: No linter configuration',
    remediation: 'Add [tool.ruff] to pyproject.toml (or a ruff.toml) and run it in CI',
  },

  {
    id: generateLawId(
      'Type Checker Configured',
      'A static type checker must be configured to enforce type hints in CI',
      'python'
    ),
    legacyId: 221,
    article: 'VII',
    subsection: '7.22',
    title: 'Type Checker Configured',
    rationale:
      'Type hints without a type checker are documentation that lies — nothing verifies them, and they drift from the code. A configured checker turns annotations into a gate.',
    satisfiedBy: { python: 'Configure mypy (or pyright) in pyproject.toml, mypy.ini or setup.cfg.' },
    detectionLimits: [
      'Presence only: an empty [tool.mypy] passes; strictness and CI wiring are not checked.',
      'Does not read tox.ini or a pre-commit hook, so a checker configured only there false-fails.',
    ],
    emoji: '🔎',
    description:
      'A static type checker (mypy/pyright) is configured so type hints are enforced in CI',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'MypyConfiguredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.22: No static type checker configured',
    remediation: 'Add [tool.mypy] to pyproject.toml (or mypy.ini / pyrightconfig.json)',
  },

  {
    id: generateLawId(
      'Pyproject Metadata',
      'pyproject.toml must declare PEP 621 metadata: name and requires-python',
      'python'
    ),
    legacyId: 222,
    article: 'VII',
    subsection: '7.23',
    title: 'Pyproject Metadata',
    rationale:
      'A package without name and a declared Python version is one that installs by luck — pip cannot resolve it cleanly and a fresh environment may pick an interpreter it never runs on. Metadata is the contract with the installer.',
    satisfiedBy: { python: 'Give pyproject.toml a [project] (or [tool.poetry]) table with name and requires-python.' },
    detectionLimits: [
      'Regexes are whole-file, not table-scoped: a name= or python= anywhere (even under [tool.ruff]) satisfies the check even if [project] lacks it.',
      'Never validates version, despite the message.',
      'pyproject.toml only — a setup.py-only project cannot satisfy it.',
    ],
    emoji: '📦',
    description:
      'pyproject.toml declares PEP 621 metadata (name + requires-python)',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PyprojectMetadataLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.23: Missing/incomplete pyproject.toml metadata',
    remediation:
      'Add a [project] table with name, version and requires-python (PEP 621)',
  },

  {
    id: generateLawId(
      'Locked Dependencies',
      'Reproducible installs require a lockfile or fully pinned requirements',
      'python'
    ),
    legacyId: 223,
    article: 'VII',
    subsection: '7.24',
    title: 'Locked Dependencies',
    rationale:
      'Unpinned dependencies mean "works on my machine today" — the build that passes now can fail tomorrow when a transitive dep releases. A lock file is the difference between reproducible and hopeful.',
    satisfiedBy: { python: 'Commit a lock file (uv.lock/poetry.lock/Pipfile.lock/pdm.lock), or pin every line of requirements.txt with ==.' },
    detectionLimits: [
      'requirements.txt is judged by a per-line `includes("==")` substring — a >= line with a hash fails, a loose line that merely contains == passes.',
      'A requirements.txt that only -r-includes another (pinned) file is false-flagged as unpinned.',
      'pyproject dependency constraints are never inspected for pinning.',
    ],
    emoji: '🔒',
    description:
      'Declared dependencies are locked (uv.lock/poetry.lock) or fully pinned for reproducible installs',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'LockedDependenciesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.24: Dependencies declared but not locked',
    remediation:
      'Commit a lockfile (uv lock / poetry lock) or pin every dependency with ==',
  },

  {
    id: generateLawId(
      'Public Docstrings',
      'Public module-level classes and functions should have a docstring',
      'python'
    ),
    legacyId: 224,
    article: 'VII',
    subsection: '7.25',
    title: 'Public Docstrings',
    rationale:
      'A public function with no docstring is a promise with no terms — the caller guesses what it does and what it returns. The docstring is the smallest unit of a maintainable API.',
    satisfiedBy: { python: 'Give every public (non-underscore) module-level def and class a docstring.' },
    detectionLimits: [
      'Module-level (indent-0) def/class only — nested functions and ALL methods are never checked.',
      'Scans raw lines, so a code sample inside a module docstring whose line starts with def/class at column 0 can be false-flagged.',
      'Skips test files, __init__.py, dunder/underscore names, @overload and one-line bodies.',
    ],
    emoji: '📝',
    description:
      'Public module-level classes/functions have a docstring (advisory; private/one-liners exempt)',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'PublicDocstringsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.25: Public symbol without a docstring',
    remediation:
      'Add a one-line docstring; enable ruff pydocstyle (D) rules to enforce it',
  },

  {
    id: generateLawId(
      'Module Size',
      'A .py file that grows past a few hundred lines hides multiple responsibilities',
      'python'
    ),
    legacyId: 225,
    article: 'VII',
    subsection: '7.26',
    title: 'Module Size',
    rationale:
      'A file that has grown past a few hundred lines is usually several responsibilities wearing one filename — hard to navigate, hard to review, hard to change without fear. Size is a proxy for "this should be split".',
    satisfiedBy: { python: 'Keep modules under the configured line limit (default 300); split by responsibility.' },
    detectionLimits: [
      'Counts physical lines including blanks, comments, docstrings and license headers — no logical LOC.',
      'Two global thresholds only (source and test); no per-file override.',
      'A generated or data .py outside the ignored directories still counts.',
    ],
    emoji: '📏',
    description:
      'A .py file must stay under a line limit (default 300, same as the TS file-length check; separate limit for tests) — split large modules',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PythonModuleSizeLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.26: Python module too long',
    remediation:
      'Split the module by responsibility; tune thresholds.python.maxFileLines if justified',
  },

  // ── Batch 1 of the architecture proposal (2026-07-11): determinism
  // and money-path correctness laws, born from production incidents.
  {
    id: generateLawId(
      'Timezone-Aware Datetimes',
      'Naive datetime.now()/utcnow()/date.today() in source is a money bug factory',
      'python'
    ),
    legacyId: 228,
    article: 'VII',
    subsection: '7.27',
    title: 'Timezone-Aware Datetimes',
    rationale:
      'A naive datetime is a bug waiting for a timezone — it means whatever the server happens to be set to, and the same code gives different answers in different regions. Aware datetimes make time unambiguous.',
    satisfiedBy: { python: 'Use datetime.now(tz)/timezone-aware constructors; avoid datetime.now() with no tz, utcnow() and date.today().' },
    detectionLimits: [
      'Flags datetime.now() only with empty parens (datetime.now(tz) is correctly ignored), plus utcnow() and date.today().',
      'Aliased imports (from datetime import datetime as dt) are not caught, as the detector notes itself.',
      'time.time, pandas and numpy datetimes are out of scope.',
    ],
    emoji: '🕰️',
    description:
      'Naive datetime.now() (no tz), datetime.utcnow() (deprecated) and date.today() are banned in source — time bugs in a money system are money bugs (tests excluded; thresholds.python.allowNaiveIn allowlists)',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TimezoneAwareDatetimesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.27: Naive datetime construction',
    remediation:
      'Use datetime.now(timezone.utc) / ZoneInfo; allowlist genuinely-naive spots via thresholds.python.allowNaiveIn',
  },

  {
    id: generateLawId(
      'No Assert Guards In Production',
      'python -O strips asserts — a guard written as assert vanishes silently',
      'python'
    ),
    legacyId: 229,
    article: 'VII',
    subsection: '7.28',
    title: 'No Assert Guards In Production',
    rationale:
      'assert is stripped entirely when Python runs with -O — so a security or invariant check written as an assert simply vanishes in the optimised production run. What guards you in dev must not disappear in prod.',
    satisfiedBy: { python: 'Enforce invariants with explicit checks that raise; keep assert for tests only.' },
    detectionLimits: [
      'Flags every assert in non-test code, including legitimate type-narrowing ones — it makes no distinction.',
      'Line-start only, so `x=1; assert y` after a semicolon is missed.',
      'It does not verify the project actually runs under python -O.',
    ],
    emoji: '🛡️',
    description:
      'assert statements outside tests are findings — python -O strips them, so assert-guards silently vanish in production (thresholds.python.allowAssertIn allowlists)',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoAssertGuardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.28: assert used as a production guard',
    remediation:
      'Replace guard asserts with explicit raises; allowlist type-narrowing spots via thresholds.python.allowAssertIn',
  },

  {
    id: generateLawId(
      'Strict Expected Failures',
      'xfail without strict=True passes silently forever; skips need reasons',
      'python'
    ),
    legacyId: 230,
    article: 'VII',
    subsection: '7.29',
    title: 'Strict Expected Failures',
    rationale:
      'An xfail without strict=True passes whether the test fails OR unexpectedly succeeds — so the day the bug is fixed, the xfail keeps hiding it, and you never remove the marker. A non-strict xfail is a permanent blind spot.',
    satisfiedBy: { python: 'Give every xfail strict=True and a reason=; give skip/skipif a reason=.' },
    detectionLimits: [
      'Reads per-marker strict= only — a project-level xfail_strict=true in pyproject/pytest.ini is ignored and false-fails.',
      'reason passed positionally is not accepted (reason= is required); aliased markers are missed.',
      'Scans test files only — an xfail on a helper imported from non-test code is out of scope.',
    ],
    emoji: '📌',
    description:
      'pytest.mark.xfail without strict=True and xfail/skip/skipif without reason= are findings — a non-strict xfail dies as documentation, not as a test',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'StrictExpectedFailuresLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.29: Lax expected-failure marker',
    remediation:
      'Add strict=True to xfail and reason="..." to every xfail/skip/skipif',
  },

  // ── Batch 2/3 of the architecture proposal: determinism boundaries,
  // tooling symmetry, concurrency perimeter, test discipline.
  {
    id: generateLawId(
      'No Wall-Clock In Domain',
      'Domain/application code receives now as a parameter; the clock lives at the edges',
      'python'
    ),
    legacyId: 231,
    article: 'VII',
    subsection: '7.30',
    title: 'No Wall-Clock In Domain',
    rationale:
      'Business logic that reads the clock itself cannot be tested at a fixed point in time and behaves differently every run. The domain should RECEIVE the current time, not fetch it — that is what makes it deterministic.',
    satisfiedBy: { python: 'Pass `now` into domain/application code; keep datetime.now()/time.time() at the boundary.' },
    detectionLimits: [
      'Scans only files under domain/ or application|use_cases/ paths — a flat-layout project with no such directory is never scanned.',
      'Flags datetime.now( even tz-aware here, by intent (the domain must receive now, not fetch it).',
      'Aliased imports and time.perf_counter/pendulum are missed.',
    ],
    emoji: '⏱️',
    description:
      'datetime.now/time.time/time.monotonic are banned in domain/application layers — determinism is testability; the clock is injected from the composition root (thresholds.python.clockBoundary allowlists)',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoWallClockInDomainLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.30: Wall clock read in domain/application layer',
    remediation:
      'Pass `now` (or a clock port) explicitly; declare genuine clock modules in thresholds.python.clockBoundary',
  },

  {
    id: generateLawId(
      'No Silent Exception Swallowing',
      'Typed except with a body of only pass/continue/return swallows failures invisibly',
      'python'
    ),
    legacyId: 233,
    article: 'VII',
    subsection: '7.31',
    title: 'No Silent Exception Swallowing',
    rationale:
      'except SomeError: pass makes a failure invisible — the thing that went wrong leaves no trace, and you debug the symptom weeks later with nothing to go on. A caught exception must be logged or re-raised.',
    satisfiedBy: { python: 'In an except handler, log the error or re-raise; never a bare pass/continue/return None with no trace.' },
    detectionLimits: [
      'Matches a typed handler alone on its line whose body is only pass/continue/return None with no log/raise — an INLINE `except E: pass` escapes.',
      'An except whose body is `...` (Ellipsis) escapes, and a `return <value>` (non-None) is treated as non-silent.',
      'Any body line merely containing the substring log/logger/warn/raise exempts the whole handler.',
    ],
    emoji: '🕳️',
    description:
      'A typed except whose body is only pass/continue/return (no log, no re-raise) is a finding — extends No Bare Except (211) to the typed-but-silent form',
    priority: 'HIGH',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoSilentExceptionSwallowingLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.31: Exception swallowed silently',
    remediation: 'Log with context, re-raise, or convert — never swallow bare',
  },

  {
    id: generateLawId(
      'Security Scanner Configured',
      'A Python gate without bandit has no static security lane',
      'python'
    ),
    legacyId: 234,
    article: 'VII',
    subsection: '7.32',
    title: 'Security Scanner Configured',
    rationale:
      'A Python project with no SAST has no automated eye for the obvious — a hardcoded subprocess shell=True, an insecure yaml.load. bandit (or equivalent) is the cheapest security review you will ever run.',
    satisfiedBy: { python: 'Configure bandit in pyproject.toml, a .bandit file, or a pre-commit hook.' },
    detectionLimits: [
      'Recognises only .bandit / [tool.bandit] / bandit in .pre-commit-config.yaml — semgrep, ruff select=["S"], bandit.yaml, or bandit in a CI workflow false-fail here (though the shared PythonSatisfaction helper accepts them).',
      'Only the .yaml spelling of the pre-commit file is checked, not .yml.',
      'Presence only — it does not confirm the scanner runs or passes.',
    ],
    emoji: '🚨',
    description:
      'bandit (or equivalent SAST) must be configured — symmetry with Ruff Configured (220) and Type Checker Configured (221) for the security lane',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'BanditConfiguredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.32: No security SAST configured',
    remediation:
      'Add [tool.bandit] to pyproject.toml or a bandit pre-commit hook',
  },

  {
    id: generateLawId(
      'Dependency Audit Configured',
      'pip-audit/safety must be present in the gate — the JS-oriented law forced waivers',
      'python'
    ),
    legacyId: 235,
    article: 'VII',
    subsection: '7.33',
    title: 'Dependency Audit Configured',
    rationale:
      'A dependency scanner that is not in the gate is not a scanner — the CVE sits unnoticed until it is exploited. Running pip-audit on every push is how a known-vulnerable dependency is caught in minutes, not months.',
    satisfiedBy: { python: 'Wire pip-audit (or safety) into pre-commit, CI or the task runner.' },
    detectionLimits: [
      'Matches the tool NAME anywhere in the gate config (even a comment) — it does not confirm the audit runs against the locked set.',
      'Recognises pip-audit/safety only; osv-scanner, snyk, dependabot and trivy are missed.',
      'GitHub Actions plus a fixed file list — GitLab CI (.gitlab-ci.yml), Jenkinsfile and the .yml pre-commit spelling false-fail.',
    ],
    emoji: '📦',
    description:
      'pip-audit or safety must appear in the gate configuration (pre-commit/CI/Makefile) — the Python-native replacement for the JS-oriented Dependency Security Scanning waiver',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PipAuditConfiguredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.33: No Python dependency audit in the gate',
    remediation: 'Add pip-audit (or safety) to pre-commit/CI',
  },

  {
    id: generateLawId(
      'Declared Concurrency Boundaries',
      'Threads/locks/tasks live only in declared modules — the perimeter is explicit',
      'python'
    ),
    legacyId: 236,
    article: 'VII',
    subsection: '7.34',
    title: 'Declared Concurrency Boundaries',
    rationale:
      'Threads, processes and tasks spawned casually across a codebase are where race conditions and leaks hide. Requiring concurrency to live behind declared boundaries makes "where does this run in parallel" a question with an answer.',
    satisfiedBy: { python: 'Confine threading/multiprocessing/asyncio task creation to modules you declare in thresholds.python.concurrencyBoundary.' },
    detectionLimits: [
      'Out of the box the allowlist is empty, so EVERY concurrency use is a violation until the project declares its boundaries — fail-by-default, by design.',
      'Literal module.attr forms only — from threading import Thread, asyncio.gather/TaskGroup, loop.run_in_executor and trio/anyio are missed.',
      'The concurrent.futures substring also matches the import line itself.',
    ],
    emoji: '🧵',
    description:
      'threading/multiprocessing/concurrent.futures/asyncio.create_task are allowed only in declared modules (thresholds.python.concurrencyBoundary) — a new thread outside the perimeter is an architectural event, not a silent merge',
    priority: 'MEDIUM',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DeclaredConcurrencyBoundariesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.34: Concurrency primitive outside the declared boundary',
    remediation:
      'Keep concurrency in its declared modules; declare genuine homes in thresholds.python.concurrencyBoundary',
  },

  {
    id: generateLawId(
      'Seeded Randomness',
      'Ambient random/uuid4 in domain code breaks golden reproducibility',
      'python'
    ),
    legacyId: 237,
    article: 'VII',
    subsection: '7.35',
    title: 'Seeded Randomness',
    rationale:
      'Randomness in business logic that is never seeded makes a run impossible to reproduce — the bug that appeared once will not appear again, and the test that passed is not the test that will fail. Determinism is debuggability.',
    satisfiedBy: { python: 'Inject the source rather than calling it inline: a SEEDABLE generator where a run should be reproducible, an id/token factory where values must stay unpredictable (uuid4, secrets, os.urandom). A cryptographic source declared in thresholds.python.randomnessBoundary is a correct answer, not debt — seeding it would be a security defect.' },
    detectionLimits: [
      'Scans only domain/application paths — a flat-layout project is never scanned.',
      'Literal prefixes only — `from random import randint`, numpy.random and uuid1/3/5 are missed.',
      'Two requirements, told apart by the source: random.* should be REPRODUCIBLE (seed it), while uuid4/secrets/os.urandom must stay UNPREDICTABLE (inject a factory, never seed). The line cannot tell which a project meant, so it names the requirement the source implies.',
    ],
    emoji: '🎲',
    description:
      'Randomness enters domain/application layers through an injected source: a seedable generator where a run must be reproducible, an id/token factory where values must stay unpredictable (thresholds.python.randomnessBoundary declares the owning module) — the determinism canon, advisory rollout',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'SeededRandomnessLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.35: Ambient randomness in domain/application layer',
    remediation:
      'Inject a seedable generator / id factory; declare genuine homes in thresholds.python.randomnessBoundary',
  },

  {
    id: generateLawId(
      'No Wall-Clock In Tests',
      'Tests reading the wall clock without freezing time are non-deterministic',
      'python'
    ),
    legacyId: 238,
    article: 'VII',
    subsection: '7.36',
    title: 'No Wall-Clock In Tests',
    rationale:
      'A test that reads the real clock is a test that behaves differently at midnight, on a leap day, or in another timezone — its result depends on when you run it, not on the code. Freeze time and the test asserts what you meant.',
    satisfiedBy: { python: 'Freeze time (freezegun/time-machine) or inject a fixed clock in tests instead of reading datetime.now()/time.time().' },
    detectionLimits: [
      'A single freezegun/freeze_time anywhere in a file exempts the WHOLE file, even un-frozen wall-clock reads elsewhere in it.',
      'Recognises only freezegun — time-machine and unittest.mock on datetime are not seen and false-fail.',
      'Flags datetime.now( even tz-aware; time.monotonic is not covered; aliased datetime missed.',
    ],
    emoji: '🧊',
    description:
      'datetime.now()/time.time() in tests without time freezing (freezegun/freeze_time exempts the file) — symmetry with No Sleep In Tests (214), advisory rollout',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'NoWallClockInTestsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.36: Wall clock read in a test without freezing',
    remediation: 'Freeze time (freezegun) or pass an explicit fixed now',
  },

  {
    id: generateLawId(
      'Float Equality Tolerance In Tests',
      'Bare float == literal in tests is a flakiness trap',
      'python'
    ),
    legacyId: 239,
    article: 'VII',
    subsection: '7.37',
    title: 'Float Equality Tolerance In Tests',
    rationale:
      'assert x == 0.1 is a test that will one day fail for no reason you changed — floating point does not land on the literal you wrote. Comparing with a tolerance is the difference between testing the maths and testing the FPU.',
    satisfiedBy: { python: 'Compare floats with pytest.approx() or math.isclose() instead of ==.' },
    detectionLimits: [
      'The RHS must be a digit.digit literal — == 1., == .5, == 1e-3 (exponent) and any variable/expression RHS are missed.',
      'Reversed operands (assert 1.23 == x) and chained comparisons (a == b == 1.5) are not matched.',
      'approx/isclose must be on the SAME line as the assert to exempt it.',
    ],
    emoji: '🎯',
    description:
      'assert x == <float literal> without pytest.approx / isclose is a finding — tolerances are explicit by design; conservative detection, advisory (info)',
    priority: 'LOW',
    category: 'PYTHON',
    stack: 'python',
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'FloatToleranceInTestsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.37: Bare float equality in a test',
    remediation: 'Use pytest.approx / math.isclose with an explicit tolerance',
  },
];
