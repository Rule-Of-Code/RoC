/**
 * Constitutional Laws Registry (Legacy)
 * Deprecated: Use ModularLawsRegistry instead
 * This is a compatibility wrapper around ModularLawsRegistry
 */

import type { ConstitutionalLaw, RuleOfCodeConfig } from '../types/law.types';
import { ModularLawsRegistry } from './modular-laws-registry';

export class ConstitutionalLawsRegistry {
  /**
   * @deprecated Use ModularLawsRegistry.getAll() instead
   */
  static getAll(): ConstitutionalLaw[] {
    return ModularLawsRegistry.getAll();
  }

  /**
   * @deprecated Use ModularLawsRegistry.getEnabled() instead
   */
  static getEnabled(config: RuleOfCodeConfig): ConstitutionalLaw[] {
    return ModularLawsRegistry.getEnabled(config);
  }

  /**
   * @deprecated Use ModularLawsRegistry.getParetoCore() instead
   */
  static getParetoCore(): ConstitutionalLaw[] {
    return ModularLawsRegistry.getParetoCore();
  }

  /**
   * Get a law by its ID
   * @deprecated This method is for compatibility only
   */
  static get(lawId: string): ConstitutionalLaw | null {
    const allLaws = ModularLawsRegistry.getAll();
    return allLaws.find(law => law.id === lawId) ?? null;
  }
}
