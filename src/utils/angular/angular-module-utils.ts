import { ANGULAR_CONSTANTS, DIRECTORY_NAMES } from '../constants';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';

/**
 * Centralized Angular module utilities
 * Meta-dogfooding: Common Angular module operations extracted for reusability
 */
export class AngularModuleUtils {
  /**
   * Module category configurations - eliminates hardcoded types
   */
  private static readonly MODULE_CATEGORIES = {
    INFRASTRUCTURE: { type: 'infrastructure', shouldCheckLazyLoading: false },
    FEATURE: { type: 'feature', shouldCheckLazyLoading: true },
  } as const;

  /**
   * Infrastructure directory patterns
   */
  private static readonly INFRASTRUCTURE_DIRECTORIES = [
    DIRECTORY_NAMES.SHARED,
    DIRECTORY_NAMES.CORE,
  ] as const;

  /**
   * Check if directory has barrel export (index.ts)
   * Meta-dogfooding: Centralized barrel export detection used across Angular analyzers
   */
  static hasBarrelExport(moduleFile: string): boolean {
    return FileUtils.exists(
      PathOperations.join(
        PathOperations.getDirectory(moduleFile),
        ANGULAR_CONSTANTS.INDEX_TS
      )
    );
  }

  /**
   * Convert module filename to Angular class name
   * Meta-dogfooding: Centralized module naming convention logic
   */
  static getModuleClassName(moduleName: string): string {
    const parts = this.extractBaseParts(moduleName);
    const className = this.convertToClassName(parts);
    return this.addModuleSuffix(className, moduleName);
  }

  /**
   * Extract base parts from module filename
   */
  private static extractBaseParts(moduleName: string): string[] {
    return moduleName.split('-');
  }

  /**
   * Convert parts to PascalCase className
   */
  private static convertToClassName(parts: string[]): string {
    return parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Add module suffix if needed
   */
  private static addModuleSuffix(
    className: string,
    originalName: string
  ): string {
    return (
      className +
      (originalName.includes(ANGULAR_CONSTANTS.MODULE_DOT)
        ? ''
        : ANGULAR_CONSTANTS.MODULE_SUFFIX)
    );
  }

  /**
   * Categorize Angular module based on directory structure
   * Meta-dogfooding: Centralized Angular module categorization logic
   */
  static getModuleCategory(fileName: string): {
    type: string;
    shouldCheckLazyLoading: boolean;
  } {
    return this.isInfrastructureModule(fileName)
      ? this.MODULE_CATEGORIES.INFRASTRUCTURE
      : this.MODULE_CATEGORIES.FEATURE;
  }

  /**
   * Check if module is infrastructure type
   */
  private static isInfrastructureModule(fileName: string): boolean {
    return this.INFRASTRUCTURE_DIRECTORIES.some(dir => fileName.includes(dir));
  }
}
