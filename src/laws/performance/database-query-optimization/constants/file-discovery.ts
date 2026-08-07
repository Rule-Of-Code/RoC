/**
 * DatabaseQueryOptimizationFileDiscoveryConstants
 *
 * Configuration for finding and identifying database-related files.
 */
export class DatabaseQueryOptimizationFileDiscoveryConstants {
  // Directories to scan for database operations
  static readonly SCAN_DIRECTORIES = ['src', 'apps', 'libs'];

  // File patterns for service/repository files
  static readonly SERVICE_FILE_PATTERNS = [
    /\.service\.(ts|js)$/i,
    /firestore\.(ts|js)$/i,
    /database\.(ts|js)$/i,
    /repository\.(ts|js)$/i,
  ];

  // Configuration file patterns
  static readonly CONFIG_FILE_PATTERNS = {
    FIRESTORE_RULES: ['firestore.rules', 'firestore.emulator.rules'],
    INDEXES: ['firestore.indexes.json', 'config/firestore.indexes.json'],
  };

  // Query patterns to detect
  static readonly QUERY_PATTERNS = {
    BATCH: /batch\(\)|writeBatch|commitBatch/i,
    PAGINATION: /startAfter\(|startAt\(|endAt\(|endBefore\(/i,
    CACHING: /enableNetwork|disableNetwork|cache|persistentCache/i,
    OPTIMIZATION: /limit\(|orderBy\(|where\(/i,
    LOOP: /for\(|foreach|\.map\(/i,
    DATABASE_QUERY: /get\(|doc\(|collection\(/i,
  };

  /**
   * Check if file is a service/database file
   */
  static isServiceFile(filename: string): boolean {
    return DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS.some(
      pattern => pattern.test(filename)
    );
  }

  /**
   * Check if line contains database query
   */
  static hasQuery(line: string): boolean {
    return DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.DATABASE_QUERY.test(
      line.toLowerCase()
    );
  }

  /**
   * Check if line contains loop
   */
  static hasLoop(line: string): boolean {
    return DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.LOOP.test(
      line.toLowerCase()
    );
  }

  /**
   * Get all config file paths to check
   */
  static getFirestoreRulesPaths(): string[] {
    return DatabaseQueryOptimizationFileDiscoveryConstants.CONFIG_FILE_PATTERNS
      .FIRESTORE_RULES;
  }

  /**
   * Get index configuration paths
   */
  static getIndexPaths(): string[] {
    return DatabaseQueryOptimizationFileDiscoveryConstants.CONFIG_FILE_PATTERNS
      .INDEXES;
  }
}
