/**
 * Database Query Optimization Law
 * Ensures database queries are optimized for performance
 *
 * Responsibilities:
 * - Coordinate analysis of database query optimization
 * - Aggregate results from specialized analyzer services
 * - Calculate final score and compile recommendations
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { DatabaseQueryOptimizationCheckConstants } from './database-query-optimization/constants';
import { DatabaseQueryOptimizationAnalyzerService } from './database-query-optimization/services';

/** The concern this law owns does not exist without its substrate. */
const NOT_APPLICABLE_MESSAGE =
  '📋 Not applicable — no database layer in this project';

/**
 * The analyzer reads .ts/.js query code (Firestore/ORM call shapes). A project
 * with a database but no JS/TS sources — a Python backend on SQLAlchemy — is
 * not compliant-by-luck and not violating either: this law simply cannot judge
 * it. Say so, honestly, instead of failing it for a language it cannot read.
 */
const NOT_ANALYSABLE_MESSAGE =
  '📋 Not applicable — query analysis is JS/TS-only; this project has no JS/TS sources (Python DB access is not statically analysed by this law)';

/** Schema/rules files that prove a database layer even without a manifest. */
const DATABASE_CONFIG_FILES = [
  'firestore.indexes.json',
  'firestore.rules',
  'config/firestore.indexes.json',
  'prisma/schema.prisma',
];

/** Database clients a manifest can name beyond the shared helper's list. */
const DATABASE_CLIENTS = /firebase|@angular\/fire|supabase|dexie|pouchdb/i;

export class DatabaseQueryOptimizationLaw {
  /**
   * Does the project talk to a database at all? The shared helper covers Python
   * ORMs and the common JS ORMs; a Firestore app is additionally recognised by
   * its client dependency or its rules/indexes files.
   */
  private static hasDatabaseLayer(projectRoot: string): boolean {
    return (
      PythonSatisfaction.hasDatabaseLayer(projectRoot) ||
      DATABASE_CLIENTS.test(PythonSatisfaction.gateConfig(projectRoot)) ||
      DATABASE_CONFIG_FILES.some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      )
    );
  }

  /**
   * No database layer → no query to optimize. The absence of the substrate is
   * not a violation, it is N/A (score 100, zero violations).
   */
  private static createNotApplicableResult(
    context: LawCheckContext,
    message: string = NOT_APPLICABLE_MESSAGE
  ): LawResult {
    return {
      passed: true,
      score: 100,
      message,
      violations: [],
      details: [message],
      suggestions: [],
      fixable: true,
      config: context.config,
    };
  }

  static async check(context: LawCheckContext): Promise<LawResult> {
    const { projectRoot } = context;

    if (!this.hasDatabaseLayer(projectRoot)) {
      return Promise.resolve(this.createNotApplicableResult(context));
    }

    // A database exists, but this analyzer only reads JS/TS query code.
    if (!PythonSatisfaction.hasJsTsSources(projectRoot)) {
      return Promise.resolve(
        this.createNotApplicableResult(context, NOT_ANALYSABLE_MESSAGE)
      );
    }

    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Analyze Firestore optimization
    const firestoreOptimization =
      DatabaseQueryOptimizationAnalyzerService.analyzeFirestoreOptimization(
        context.projectRoot
      );
    if (!firestoreOptimization.optimized) {
      violations.push('Firestore query optimization not implemented');
      suggestions.push('Add composite indexes and optimize query patterns');
      score -=
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('FIRESTORE');
    }

    // Analyze indexing configuration
    const indexingConfig =
      DatabaseQueryOptimizationAnalyzerService.analyzeIndexingConfiguration(
        context.projectRoot
      );
    if (!indexingConfig.configured) {
      violations.push('Database indexing configuration missing');
      suggestions.push(
        'Configure firestore.indexes.json with proper composite indexes'
      );
      score -=
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('INDEXING');
    }

    // Analyze query batching
    const queryBatching =
      DatabaseQueryOptimizationAnalyzerService.analyzeQueryBatching(
        context.projectRoot,
        context.config
      );
    if (!queryBatching.implemented) {
      violations.push('Query batching not implemented');
      suggestions.push('Use Firestore batch operations for bulk operations');
      score -=
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('BATCHING');
    }

    // Analyze pagination
    const pagination =
      DatabaseQueryOptimizationAnalyzerService.analyzePaginationImplementation(
        context.projectRoot,
        context.config
      );
    if (!pagination.implemented) {
      violations.push('Pagination not properly implemented');
      suggestions.push('Implement cursor-based pagination with startAfter()');
      score -=
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('PAGINATION');
    }

    // Analyze query caching
    const queryCaching =
      DatabaseQueryOptimizationAnalyzerService.analyzeQueryCaching(
        context.projectRoot,
        context.config
      );
    if (!queryCaching.implemented) {
      violations.push('Query result caching not implemented');
      suggestions.push(
        'Implement client-side query caching for frequently accessed data'
      );
      score -=
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('CACHING');
    }

    // Analyze N+1 query prevention
    const nPlusOneDetection =
      DatabaseQueryOptimizationAnalyzerService.analyzeNPlusOneQueryPrevention(
        context.projectRoot,
        context.config
      );
    if (!nPlusOneDetection.addressed) {
      violations.push('N+1 query patterns detected or not addressed');
      suggestions.push('Use batch reads or proper data denormalization');
      score -=
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('N_PLUS_ONE');
    }

    return Promise.resolve({
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'Database query optimization properly implemented'
          : `Query optimization issues found: ${violations.join(', ')}`,
      violations,
      details: violations,
      suggestions,
      fixable: true,
      config: context.config,
    });
  }
}
