/**
 * Database clients and the OpenTelemetry instrumentation that gives their
 * calls spans, for Tracing Explains Latency. Data only: one table per
 * ecosystem, beside the law that reads them.
 */

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
