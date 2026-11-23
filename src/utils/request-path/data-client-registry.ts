/**
 * The registry of database clients the request-path laws know (see
 * data-clients.ts for how it is read): per client, the packages that declare
 * it and, per language, the calls that read, batch-read, fetch a whole
 * result set, count on the server, and write.
 */

/** One client's API in one language. */
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

/** A database client and its API per language. */
export interface DataClient {
  id: string;
  label: string;
  python?: ClientApi;
  node?: ClientApi;
}

/** Every client the laws know. */
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
      packages: [
        '@google-cloud/firestore',
        'firebase-admin',
        'firebase',
        '@angular/fire',
      ],
      reads: [
        'get',
        'getDoc',
        'getDocs',
        'getDocFromServer',
        'getDocsFromServer',
        'getDocFromCache',
        'getDocsFromCache',
      ],
      batchReads: ['getAll'],
      fetchAll: ['get', 'getDocs', 'getDocsFromServer', 'getDocsFromCache'],
      counts: ['count', 'getCountFromServer', 'getAggregateFromServer'],
      writes: [
        'set',
        'update',
        'delete',
        'add',
        'create',
        'commit',
        'setDoc',
        'updateDoc',
        'deleteDoc',
        'addDoc',
      ],
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
      writes: [
        'insert_one',
        'insert_many',
        'update_one',
        'update_many',
        'replace_one',
        'delete_one',
        'delete_many',
        'find_one_and_update',
        'bulk_write',
      ],
    },
    node: {
      packages: ['mongodb', 'mongoose'],
      reads: [
        'findOne',
        'find',
        'findById',
        'aggregate',
        'toArray',
        'distinct',
      ],
      batchReads: [],
      fetchAll: ['find', 'toArray'],
      counts: ['countDocuments', 'estimatedDocumentCount'],
      writes: [
        'insertOne',
        'insertMany',
        'updateOne',
        'updateMany',
        'replaceOne',
        'deleteOne',
        'deleteMany',
        'findOneAndUpdate',
        'bulkWrite',
        'save',
        'create',
      ],
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
      writes: [
        'save',
        'asave',
        'create',
        'acreate',
        'update',
        'aupdate',
        'delete',
        'adelete',
        'bulk_create',
        'abulk_create',
      ],
    },
  },
  {
    id: 'prisma',
    label: 'Prisma',
    node: {
      packages: ['@prisma/client'],
      reads: [
        'findUnique',
        'findUniqueOrThrow',
        'findFirst',
        'findFirstOrThrow',
        'findMany',
      ],
      batchReads: [],
      fetchAll: ['findMany'],
      counts: ['count'],
      writes: [
        'create',
        'createMany',
        'update',
        'updateMany',
        'upsert',
        'delete',
        'deleteMany',
      ],
    },
  },
  {
    id: 'typeorm',
    label: 'TypeORM',
    node: {
      packages: ['typeorm'],
      reads: [
        'findOne',
        'findOneBy',
        'findOneOrFail',
        'findOneByOrFail',
        'find',
        'findBy',
        'findAndCount',
        'getOne',
        'getMany',
        'getRawOne',
        'getRawMany',
      ],
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
