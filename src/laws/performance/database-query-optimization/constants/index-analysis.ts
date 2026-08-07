/**
 * DatabaseQueryOptimizationIndexConstants
 *
 * Configuration for Firestore index analysis.
 */
export interface DatabaseIndex {
  fields: string[];
  queryScope?: string;
  [key: string]: string[] | boolean | number | string | undefined;
}

export class DatabaseQueryOptimizationIndexConstants {
  /**
   * Check if index config has composite indexes
   */
  static hasCompositeIndexes(indexConfig: {
    indexes?: DatabaseIndex[];
  }): boolean {
    if (!indexConfig.indexes?.length) {
      return false;
    }
    return indexConfig.indexes.some(
      (index: DatabaseIndex) => index.fields.length > 1
    );
  }

  /**
   * Get index complexity level
   */
  static getIndexComplexityLevel(
    indexCount: number
  ): 'high' | 'low' | 'medium' {
    if (indexCount === 0) return 'low';
    if (indexCount < 5) return 'medium';
    return 'high';
  }

  /**
   * Validate index fields
   */
  static hasValidIndexFields(index: DatabaseIndex): boolean {
    return (
      Array.isArray(index.fields) &&
      index.fields.length > 0 &&
      index.fields.every(field => typeof field === 'string' && field.length > 0)
    );
  }
}
