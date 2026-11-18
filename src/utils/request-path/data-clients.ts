/**
 * The database clients the request-path laws know, in one registry.
 *
 * A law about reads in a loop, duplicate reads or counting by fetching must
 * not be written against one client: the same mistake reads differently in
 * Firestore, an ORM or a document store. Each entry names the packages that
 * declare the client (Python distributions and npm packages) and, per
 * language, the calls that read (one round trip each), read many keys in one
 * round trip, fetch a whole result set, count on the server, and write.
 *
 * Only calls the client really has are listed. A client or call that is not
 * here is not seen by the laws — their `detectionLimits` say so.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';
import { declaredDependencies } from '../law-requirements';
import { declaredPythonDependencies, normalizePythonName } from '../python-dependencies';
import type { CallSite, SourceLanguage } from './model';

export interface ClientApi {
  /** Packages that declare the client (PEP 503 names for Python, npm names for Node). */
  packages: readonly string[];
  /** One read or one query: a round trip each. */
  reads: readonly string[];
  /** Many keys read in one round trip. */
  batchReads: readonly string[];
  /** Calls that return a whole result set (every document or row). */
  fetchAll: readonly string[];
  /** Server-side count aggregations. */
  counts: readonly string[];
  writes: readonly string[];
}

export interface DataClient {
  id: string;
  label: string;
  python?: ClientApi;
  node?: ClientApi;
}

export const DATA_CLIENTS: readonly DataClient[] = [
  {
    id: 'firestore',
    label: 'Firestore',
    python: {
      packages: ['google-cloud-firestore', 'firebase-admin'],
      reads: ['get', 'stream'],
      batchReads: ['get_all'],
      fetchAll: ['get', 'stream'],
      counts: ['count'],
      writes: ['set', 'update', 'delete', 'add', 'create', 'commit'],
    },
    node: {
      packages: ['@google-cloud/firestore', 'firebase-admin', 'firebase', '@angular/fire'],
      reads: ['get', 'getDoc', 'getDocs', 'getDocFromServer', 'getDocsFromServer', 'getDocFromCache', 'getDocsFromCache'],
      batchReads: ['getAll'],
      fetchAll: ['get', 'getDocs', 'getDocsFromServer', 'getDocsFromCache'],
      counts: ['count', 'getCountFromServer', 'getAggregateFromServer'],
      writes: ['set', 'update', 'delete', 'add', 'create', 'commit', 'setDoc', 'updateDoc', 'deleteDoc', 'addDoc'],
    },
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    python: {
      packages: ['pymongo', 'motor'],
      reads: ['find_one', 'find', 'aggregate', 'to_list', 'distinct'],
      batchReads: [],
      fetchAll: ['find', 'to_list'],
      counts: ['count_documents', 'estimated_document_count'],
      writes: ['insert_one', 'insert_many', 'update_one', 'update_many', 'replace_one', 'delete_one', 'delete_many', 'find_one_and_update', 'bulk_write'],
    },
    node: {
      packages: ['mongodb', 'mongoose'],
      reads: ['findOne', 'find', 'findById', 'aggregate', 'toArray', 'distinct'],
      batchReads: [],
      fetchAll: ['find', 'toArray'],
      counts: ['countDocuments', 'estimatedDocumentCount'],
      writes: ['insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndUpdate', 'bulkWrite', 'save', 'create'],
    },
  },
  {
    id: 'sqlalchemy',
    label: 'SQLAlchemy',
    python: {
      packages: ['sqlalchemy', 'sqlmodel'],
      reads: ['get', 'execute', 'scalar', 'scalars'],
      batchReads: [],
      fetchAll: ['all'],
      counts: ['count'],
      writes: ['add', 'add_all', 'delete', 'merge', 'flush', 'commit'],
    },
  },
  {
    id: 'django',
    label: 'Django ORM',
    python: {
      packages: ['django'],
      reads: ['aget', 'afirst', 'alast', 'aexists'],
      batchReads: ['in_bulk', 'ain_bulk'],
      fetchAll: ['all', 'filter'],
      counts: ['count', 'acount'],
      writes: ['save', 'asave', 'create', 'acreate', 'update', 'aupdate', 'delete', 'adelete', 'bulk_create', 'abulk_create'],
    },
  },
  {
    id: 'prisma',
    label: 'Prisma',
    node: {
      packages: ['@prisma/client'],
      reads: ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany'],
      batchReads: [],
      fetchAll: ['findMany'],
      counts: ['count'],
      writes: ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'],
    },
  },
  {
    id: 'typeorm',
    label: 'TypeORM',
    node: {
      packages: ['typeorm'],
      reads: ['findOne', 'findOneBy', 'findOneOrFail', 'findOneByOrFail', 'find', 'findBy', 'findAndCount', 'getOne', 'getMany', 'getRawOne', 'getRawMany'],
      batchReads: [],
      fetchAll: ['find', 'findBy', 'getMany', 'getRawMany'],
      counts: ['count', 'countBy', 'getCount'],
      writes: ['save', 'insert', 'update', 'delete', 'remove', 'upsert'],
    },
  },
  {
    id: 'sequelize',
    label: 'Sequelize',
    node: {
      packages: ['sequelize'],
      reads: ['findByPk', 'findOne', 'findAll', 'findAndCountAll'],
      batchReads: [],
      fetchAll: ['findAll'],
      counts: ['count'],
      writes: ['create', 'bulkCreate', 'update', 'destroy', 'save'],
    },
  },
];

function apiFor(client: DataClient, language: SourceLanguage): ClientApi | undefined {
  return language === 'python' ? client.python : client.node;
}

/** Every package the registry knows, per ecosystem. */
export function registryPackages(): { python: string[]; npm: string[] } {
  return {
    python: [...new Set(DATA_CLIENTS.flatMap(c => c.python?.packages ?? []))],
    npm: [...new Set(DATA_CLIENTS.flatMap(c => c.node?.packages ?? []))],
  };
}

/** Selected only where a registry client is declared, by package.json or by a Python manifest. */
export const REQUIRES_DATA_CLIENT: LawRequirement = {
  anyOf: [{ anyDependency: registryPackages().npm }, { anyPythonDependency: registryPackages().python }],
};

/** The client APIs a project declares, per language. */
export interface ProjectClients {
  python: ClientApi[];
  typescript: ClientApi[];
  /** Labels of the declared clients, for messages. */
  labels: string[];
}

export function declaredClients(projectRoot: string): ProjectClients {
  const npm = declaredDependencies(projectRoot);
  const python = declaredPythonDependencies(projectRoot);
  const py = DATA_CLIENTS.filter(c => c.python?.packages.some(p => python.has(normalizePythonName(p))));
  const node = DATA_CLIENTS.filter(c => c.node?.packages.some(p => npm.has(p)));
  return {
    python: py.map(c => c.python as ClientApi),
    typescript: node.map(c => c.node as ClientApi),
    labels: [...new Set([...py, ...node].map(c => c.label))],
  };
}

/** The APIs to read a language's files with: the declared ones, or every one the registry has for it. */
export function apisFor(clients: ProjectClients, language: SourceLanguage): ClientApi[] {
  const declared = clients[language];
  if (declared.length > 0) return declared;
  return DATA_CLIENTS.map(c => apiFor(c, language)).filter((api): api is ClientApi => api !== undefined);
}

function names(apis: readonly ClientApi[], key: keyof Omit<ClientApi, 'packages'>): Set<string> {
  return new Set(apis.flatMap(api => api[key]));
}

/**
 * A query that selects many keys at once: a Firestore `in` /
 * `array-contains-any` (`array_contains_any`) filter, Mongo `$in`, SQLAlchemy `.in_()`, Django
 * `__in=`, TypeORM `In()`, Sequelize `Op.in`, a Prisma `in:` filter.
 */
const BATCH_OPERATOR =
  /"(?:in|array-contains-any|array_contains_any)"|\$in\b|\.in_\(|__in\s*=|\bIn\(|\bOp\.in\b|[{,]\s*in\s*:/;

/** A paged read: each iteration reads the next page, not one item. */
const PAGED = /\b(?:start_after|startAfter|start_at|startAt|end_before|endBefore|offset|skip|page_token|pageToken|cursor)\b/;

/** Calls that run other awaitables concurrently or only wait. */
const NOT_A_READ = new Set(['gather', 'all', 'allSettled', 'any', 'race', 'wait', 'wait_for', 'sleep', 'shield']);

/** A name shaped like a batch read of a repository (`get_many`, `loadAll`, `fetchBulk`). */
const BATCH_NAME = /(?:^|_)(?:many|all|bulk|batch|multi)(?:_|$)|(?:Many|All|Bulk|Batch|Multi)(?:[A-Z]|$)/;

/** A repository read by its name: `get_role`, `findById`, `load_user`, `fetchProfile`. */
const REPOSITORY_READ = /^(?:get|find|fetch|load|query|select|retrieve|lookup|list)(?:_|[A-Z]|$)/;

/** Receivers whose `get` is not a database read: queues, sockets, HTTP clients. */
const NOT_A_DATA_RECEIVER = /(?:^|[._])(?:queue|ws|websocket|socket|channel|lock|event|semaphore|http|https|httpx|axios|aiohttp|api|client)$/i;

/**
 * Method names too generic to be a read when called bare (`await get()` is a
 * local helper); on a receiver they are (`ref.get()`, `query.stream()`).
 */
const GENERIC_METHODS = new Set([
  'get', 'find', 'stream', 'all', 'filter', 'execute', 'scalar', 'scalars', 'count', 'aggregate', 'distinct',
  'toArray', 'to_list', 'query', 'select', 'list', 'load', 'fetch', 'read', 'lookup', 'retrieve',
]);

export type ReadKind = 'read' | 'batch' | 'none';

/** Does this source text select many keys at once, or read one page of many? */
export function isBatchedText(text: string): boolean {
  return BATCH_OPERATOR.test(text) || PAGED.test(text);
}

/** What an awaited call is, read with the given client APIs. */
export function classifyRead(call: CallSite, apis: readonly ClientApi[]): ReadKind {
  const method = call.method;
  if (NOT_A_READ.has(method)) return 'none';
  if (names(apis, 'batchReads').has(method)) return 'batch';
  if (isBatchedText(call.text)) return 'batch';
  if (call.receiver === '' && GENERIC_METHODS.has(method)) return 'none';
  const lastReceiver = call.receiver.split('.').pop() ?? '';
  if (NOT_A_DATA_RECEIVER.test(lastReceiver)) return 'none';
  if (names(apis, 'reads').has(method) || names(apis, 'fetchAll').has(method)) return 'read';
  if (BATCH_NAME.test(method)) return 'batch';
  return REPOSITORY_READ.test(method) ? 'read' : 'none';
}

/** Is this call a write (its order is part of its meaning)? */
export function isWrite(call: CallSite, apis: readonly ClientApi[]): boolean {
  return names(apis, 'writes').has(call.method);
}

/** Is this call a whole-result-set fetch (every document or row)? */
export function isFetchAll(method: string, apis: readonly ClientApi[]): boolean {
  return names(apis, 'fetchAll').has(method);
}

/** Server-side count calls the given APIs offer, for messages. */
export function countCalls(apis: readonly ClientApi[]): string[] {
  return [...names(apis, 'counts')];
}
