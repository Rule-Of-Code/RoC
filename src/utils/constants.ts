/**
 * Constants Barrel File
 * RULE 2: Specialized barrel file that re-exports all constant modules
 *
 * This file serves as the main entry point for all constants while maintaining
 * backward compatibility with existing imports. The original large constants
 * file has been split into specialized modules for better organization:
 *
 * - license-constants.ts: License-related constants and validation
 * - file-constants.ts: File system, directories, and path constants
 * - angular-constants.ts: Angular framework-specific constants
 * - ngrx-constants.ts: NgRx state management constants
 * - naming-constants.ts: Naming convention patterns and validation
 * - automation-constants.ts: Testing, CI/CD, and automation constants
 */

// RULE 1: Re-export all specialized constant modules to maintain API compatibility
export * from './angular-constants';
export * from './automation-constants';
export * from './file-constants';
export * from './git-constants';
export * from './license-constants';
export * from './naming-constants';
export * from './ngrx-constants';

// Export utility classes
export { ConfigFileUtils } from './config-utils';
export { FileSystemOperations } from './file-system-operations';
