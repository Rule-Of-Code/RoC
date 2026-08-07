/**
 * Enhanced Constitutional Laws Registry
 * Enterprise-grade law management with Pareto optimization
 */

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../data/enhanced-laws';
import type {
  EnhancedConstitutionalLaw,
  LawPriority,
} from '../types/enhanced-law.types';

export class EnhancedConstitutionalLawsRegistry {
  private static instance: EnhancedConstitutionalLawsRegistry | null = null;
  private readonly laws: Map<string, EnhancedConstitutionalLaw>;

  private constructor() {
    this.laws = new Map();
    this.initializeLaws();
  }

  public static getInstance(): EnhancedConstitutionalLawsRegistry {
    EnhancedConstitutionalLawsRegistry.instance ??=
      new EnhancedConstitutionalLawsRegistry();
    return EnhancedConstitutionalLawsRegistry.instance;
  }

  private initializeLaws(): void {
    ALL_ENHANCED_CONSTITUTIONAL_LAWS.forEach(law => {
      this.laws.set(law.id, law);
    });

    // Registry initialized silently for performance
  }

  public getAllLaws(): EnhancedConstitutionalLaw[] {
    return Array.from(this.laws.values());
  }

  public getLawById(id: string): EnhancedConstitutionalLaw | undefined {
    return this.laws.get(id);
  }

  public getPriorityStats(): Record<LawPriority, number> {
    const stats: Partial<Record<LawPriority, number>> = {};
    for (const law of this.laws.values()) {
      stats[law.priority] = (stats[law.priority] ?? 0) + 1;
    }
    return stats as Record<LawPriority, number>;
  }
}

// Export singleton instance
export const enhancedLawsRegistry =
  EnhancedConstitutionalLawsRegistry.getInstance();
