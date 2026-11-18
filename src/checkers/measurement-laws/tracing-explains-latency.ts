/**
 * Tracing Explains Latency
 *
 * OpenTelemetry can be installed and exporting and still unable to say where
 * a slow request's time went, for two reasons a code review does not see:
 *
 * 1. No sampler is chosen. The SDK default (`parentbased_always_on`) follows
 *    the caller's sampled flag whenever a trace context arrives with the
 *    request — and a platform front end or load balancer that sends one with
 *    most requests unsampled leaves most requests without a trace, although
 *    their log lines carry a trace id.
 * 2. The database client has no instrumentation. Spans stop at the HTTP layer,
 *    so the time spent in database calls is one opaque server span.
 *
 * The law runs where an OpenTelemetry SDK is declared (Python or Node, the
 * `requires.anyOf` gate). A sampler counts when the file that sets up the SDK
 * names one, or when OTEL_TRACES_SAMPLER is set anywhere the process could
 * read it (env files, Dockerfiles, deploy and CI YAML, code). Instrumentation
 * counts when a package that instruments the client is declared, or a meta
 * package / bootstrap step that installs it. Each finding names the setup file
 * or the manifest line that declares the client.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { declaredDependencies } from '../../utils/law-requirements';
import { NxWorkspace } from '../../utils/nx-workspace';
import {
  declaredPythonDependencies,
  normalizePythonName,
  pythonManifestFiles,
} from '../../utils/python-dependencies';
import { LawBase } from '../law-base';
import {
  firstMatch,
  isTestFile,
  readProjectFiles,
  type TextFile,
} from './project-text-files';

export const PYTHON_OTEL_SDKS: readonly string[] = [
  'opentelemetry-sdk',
  'opentelemetry-distro',
];
export const NODE_OTEL_SDKS: readonly string[] = [
  '@opentelemetry/sdk-node',
  '@opentelemetry/sdk-trace-node',
  '@opentelemetry/sdk-trace-base',
  '@opentelemetry/sdk-trace',
];

/** Selected where either ecosystem's SDK is declared. */
export const REQUIRES_OTEL_SDK: LawRequirement = {
  anyOf: [
    { anyPythonDependency: PYTHON_OTEL_SDKS },
    { anyDependency: NODE_OTEL_SDKS },
  ],
};

export interface ClientInstrumentation {
  /** The database client distribution / package. */
  client: string;
  /** Packages any one of which instruments it. */
  instrumentations: readonly string[];
}

const SQLALCHEMY = 'opentelemetry-instrumentation-sqlalchemy';
const GRPC_PY = 'opentelemetry-instrumentation-grpc';

/**
 * Python database clients → OpenTelemetry instrumentation (PyPI names). The
 * Google Cloud Firestore and Datastore clients talk gRPC, so the gRPC client
 * instrumentation is what gives their calls spans. A DB-API driver used under
 * SQLAlchemy is also covered by the SQLAlchemy instrumentation.
 */
export const PYTHON_DB_INSTRUMENTATION: readonly ClientInstrumentation[] = [
  { client: 'google-cloud-firestore', instrumentations: [GRPC_PY] },
  { client: 'google-cloud-datastore', instrumentations: [GRPC_PY] },
  { client: 'sqlalchemy', instrumentations: [SQLALCHEMY] },
  {
    client: 'psycopg2',
    instrumentations: ['opentelemetry-instrumentation-psycopg2', SQLALCHEMY],
  },
  {
    client: 'psycopg2-binary',
    instrumentations: ['opentelemetry-instrumentation-psycopg2', SQLALCHEMY],
  },
  {
    client: 'psycopg',
    instrumentations: ['opentelemetry-instrumentation-psycopg', SQLALCHEMY],
  },
  {
    client: 'asyncpg',
    instrumentations: ['opentelemetry-instrumentation-asyncpg', SQLALCHEMY],
  },
  {
    client: 'aiopg',
    instrumentations: ['opentelemetry-instrumentation-aiopg'],
  },
  {
    client: 'pymysql',
    instrumentations: ['opentelemetry-instrumentation-pymysql', SQLALCHEMY],
  },
  {
    client: 'mysqlclient',
    instrumentations: ['opentelemetry-instrumentation-mysqlclient', SQLALCHEMY],
  },
  {
    client: 'mysql-connector-python',
    instrumentations: ['opentelemetry-instrumentation-mysql', SQLALCHEMY],
  },
  {
    client: 'pymongo',
    instrumentations: ['opentelemetry-instrumentation-pymongo'],
  },
  {
    client: 'redis',
    instrumentations: ['opentelemetry-instrumentation-redis'],
  },
];

const AUTO_NODE = '@opentelemetry/auto-instrumentations-node';
const GRPC_NODE = '@opentelemetry/instrumentation-grpc';

/**
 * Node database clients → OpenTelemetry instrumentation (npm names).
 * `@opentelemetry/auto-instrumentations-node` depends on every instrumentation
 * here except Prisma's, which Prisma publishes itself.
 */
export const NODE_DB_INSTRUMENTATION: readonly ClientInstrumentation[] = [
  {
    client: 'mongodb',
    instrumentations: ['@opentelemetry/instrumentation-mongodb', AUTO_NODE],
  },
  {
    client: 'mongoose',
    instrumentations: ['@opentelemetry/instrumentation-mongoose', AUTO_NODE],
  },
  {
    client: 'pg',
    instrumentations: ['@opentelemetry/instrumentation-pg', AUTO_NODE],
  },
  {
    client: 'mysql',
    instrumentations: ['@opentelemetry/instrumentation-mysql', AUTO_NODE],
  },
  {
    client: 'mysql2',
    instrumentations: ['@opentelemetry/instrumentation-mysql2', AUTO_NODE],
  },
  {
    client: 'ioredis',
    instrumentations: ['@opentelemetry/instrumentation-ioredis', AUTO_NODE],
  },
  {
    client: 'redis',
    instrumentations: ['@opentelemetry/instrumentation-redis', AUTO_NODE],
  },
  {
    client: 'tedious',
    instrumentations: ['@opentelemetry/instrumentation-tedious', AUTO_NODE],
  },
  {
    client: 'knex',
    instrumentations: ['@opentelemetry/instrumentation-knex', AUTO_NODE],
  },
  {
    client: '@google-cloud/firestore',
    instrumentations: [GRPC_NODE, AUTO_NODE],
  },
  {
    client: '@google-cloud/datastore',
    instrumentations: [GRPC_NODE, AUTO_NODE],
  },
  { client: '@prisma/client', instrumentations: ['@prisma/instrumentation'] },
];

/** `opentelemetry-bootstrap -a install` installs the instrumentation of every library it finds installed. */
const PYTHON_BOOTSTRAP = /\bopentelemetry-bootstrap\b/;

const PY_PROVIDER = /\bTracerProvider\s*\(/;
const PY_SAMPLER =
  /\bsampler\s*=|\b(?:TraceIdRatioBased|ParentBasedTraceIdRatio|ParentBased|StaticSampler|ALWAYS_ON|ALWAYS_OFF|DEFAULT_ON|DEFAULT_OFF)\b/;
const JS_PROVIDER =
  /\bnew\s+(?:NodeSDK|NodeTracerProvider|BasicTracerProvider)\s*\(/;
const JS_SAMPLER =
  /\bsampler\s*:|\b(?:AlwaysOnSampler|AlwaysOffSampler|ParentBasedSampler|TraceIdRatioBasedSampler)\b/;
/** Zero-code setup: the sampler can only come from the environment. */
const ZERO_CODE = [
  /\bopentelemetry-instrument\b/,
  /@opentelemetry\/auto-instrumentations-node\/register\b/,
];

/** OTEL_TRACES_SAMPLER given a value: KEY=, KEY:, "KEY", (k8s) name: KEY, (Dockerfile) ENV KEY value. */
const ENV_SAMPLER = [
  /\bOTEL_TRACES_SAMPLER\b(?!_ARG)["'\]\s]*[:=,]/,
  /\bname:\s*["']?OTEL_TRACES_SAMPLER\b(?!_ARG)/,
  /\bENV\s+OTEL_TRACES_SAMPLER\s/,
];

const SOURCE = /\.(?:py|[cm]?[jt]sx?)$/;
const FILES = [
  '**/*.{py,js,mjs,cjs,ts,mts,cts}',
  '**/Dockerfile*',
  '**/*.{yml,yaml,toml,json,sh,env,tf,cfg,ini,conf}',
  '**/.env*',
  '**/{Makefile,Procfile}',
];

interface Place {
  rel: string;
  line: number;
}

export class TracingExplainsLatencyLaw extends LawBase {
  static readonly LAW_NAME = 'Tracing Explains Latency';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const files = readProjectFiles(projectRoot, FILES).filter(
      file => !file.rel.endsWith('.d.ts')
    );
    const own = files.filter(file => !isTestFile(file.rel));
    const python = declaredPythonDependencies(projectRoot);
    const node = declaredDependencies(projectRoot);
    const pythonActive = PYTHON_OTEL_SDKS.some(name =>
      python.has(normalizePythonName(name))
    );
    const nodeActive = NODE_OTEL_SDKS.some(name => node.has(name));
    const violations = [
      ...this.samplerFindings(projectRoot, own, pythonActive, nodeActive),
      ...(pythonActive
        ? this.pythonClientFindings(projectRoot, python, files)
        : []),
      ...(nodeActive ? this.nodeClientFindings(projectRoot, node) : []),
    ];
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Choose the sampler explicitly: in code (sampler=/sampler:) or with OTEL_TRACES_SAMPLER (and OTEL_TRACES_SAMPLER_ARG) in the deployed environment',
        'Declare the OpenTelemetry instrumentation for each database client, so database calls appear as child spans of the request',
      ],
      context
    );
  }

  private static samplerFindings(
    projectRoot: string,
    own: TextFile[],
    pythonActive: boolean,
    nodeActive: boolean
  ): string[] {
    if (own.some(file => firstMatch(file.content, ENV_SAMPLER))) return [];
    const pyCode = own.filter(
      file => file.rel.endsWith('.py') && PY_PROVIDER.test(file.content)
    );
    const jsCode = own.filter(
      file =>
        !file.rel.endsWith('.py') &&
        SOURCE.test(file.rel) &&
        JS_PROVIDER.test(file.content)
    );
    const pyUnsampled = pyCode.filter(file => !PY_SAMPLER.test(file.content));
    const jsUnsampled = jsCode.filter(file => !JS_SAMPLER.test(file.content));
    const sampledInCode =
      pyUnsampled.length < pyCode.length || jsUnsampled.length < jsCode.length;
    const zeroCode = sampledInCode
      ? []
      : own.flatMap(file => {
          const found = firstMatch(file.content, ZERO_CODE);
          return found ? [{ rel: file.rel, line: found.line }] : [];
        });
    const sites: Place[] = [
      ...pyUnsampled.map(file => this.at(file, PY_PROVIDER)),
      ...jsUnsampled.map(file => this.at(file, JS_PROVIDER)),
      ...zeroCode,
    ];
    const noSetup = !sampledInCode && zeroCode.length === 0;
    const undeclaredSetup = [
      ...(noSetup && pythonActive && pyCode.length === 0
        ? this.pythonDeclaration(projectRoot, PYTHON_OTEL_SDKS)
        : []),
      ...(noSetup && nodeActive && jsCode.length === 0
        ? this.nodeDeclaration(projectRoot, NODE_OTEL_SDKS)
        : []),
    ];
    return [
      ...sites.map(
        site =>
          `${site.rel}:${site.line}: sets up OpenTelemetry tracing without choosing a sampler (none in this file, and OTEL_TRACES_SAMPLER is set in no env, Dockerfile, deploy, CI or code file) — the default parentbased_always_on follows the caller's sampled flag, so when a front end forwards mostly unsampled trace contexts most requests get no trace`
      ),
      ...undeclaredSetup.map(
        place =>
          `${place.rel}:${place.line}: declares an OpenTelemetry SDK, but no setup file chooses a sampler and OTEL_TRACES_SAMPLER is set nowhere in the repository — the default parentbased_always_on follows the caller's sampled flag, so most requests can end up without a trace`
      ),
    ];
  }

  private static pythonClientFindings(
    projectRoot: string,
    declared: Set<string>,
    files: TextFile[]
  ): string[] {
    if (files.some(file => PYTHON_BOOTSTRAP.test(file.content))) return [];
    return PYTHON_DB_INSTRUMENTATION.filter(
      row =>
        declared.has(normalizePythonName(row.client)) &&
        !row.instrumentations.some(name =>
          declared.has(normalizePythonName(name))
        )
    ).flatMap(row =>
      this.pythonDeclaration(projectRoot, [row.client]).map(place =>
        this.clientFinding(place, row)
      )
    );
  }

  private static nodeClientFindings(
    projectRoot: string,
    declared: Set<string>
  ): string[] {
    return NODE_DB_INSTRUMENTATION.filter(
      row =>
        declared.has(row.client) &&
        !row.instrumentations.some(name => declared.has(name))
    ).flatMap(row =>
      this.nodeDeclaration(projectRoot, [row.client]).map(place =>
        this.clientFinding(place, row)
      )
    );
  }

  private static clientFinding(
    place: Place,
    row: ClientInstrumentation
  ): string {
    return `${place.rel}:${place.line}: ${row.client} is a dependency, but no OpenTelemetry instrumentation for it is declared (${row.instrumentations.join(' or ')}) — its calls produce no spans, so a trace cannot show where the database time went`;
  }

  private static at(file: TextFile, pattern: RegExp): Place {
    return {
      rel: file.rel,
      line: firstMatch(file.content, [pattern])?.line ?? 1,
    };
  }

  /** The first line of each Python manifest that declares one of `names`. */
  private static pythonDeclaration(
    projectRoot: string,
    names: readonly string[]
  ): Place[] {
    const wanted = new Set(names.map(normalizePythonName));
    return pythonManifestFiles(projectRoot).flatMap(file =>
      this.firstLine(
        projectRoot,
        file,
        line =>
          !line.trim().startsWith('#') &&
          (line.match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) ?? []).some(token =>
            wanted.has(normalizePythonName(token))
          )
      )
    );
  }

  /** The line of each workspace package.json that declares one of `names`. */
  private static nodeDeclaration(
    projectRoot: string,
    names: readonly string[]
  ): Place[] {
    const keys = names.map(name => `"${name}"`);
    const declares = (line: string) => {
      const trimmed = line.trim();
      return keys.some(
        key =>
          trimmed.startsWith(key) &&
          trimmed.slice(key.length).trimStart().startsWith(':')
      );
    };
    return NxWorkspace.resolveSourceFiles(projectRoot, 'package.json').flatMap(
      file => this.firstLine(projectRoot, file, declares)
    );
  }

  private static firstLine(
    projectRoot: string,
    file: string,
    accept: (line: string) => boolean
  ): Place[] {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      return [];
    }
    const index = content.split(/\r?\n/).findIndex(accept);
    return index < 0
      ? []
      : [
          {
            rel: path.relative(projectRoot, file).replace(/\\/g, '/'),
            line: index + 1,
          },
        ];
  }
}
