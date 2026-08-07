// Shared imports for all Angular Law checkers
// Purpose: Eliminate duplicate import blocks across 10+ Angular law files
// Pattern: All Angular laws require these core imports + AngularLawBase
// Some laws also import ProjectTypeDetector for project analysis
export type { RuleOfCodeConfig } from '../../config/types';
export type { LawCheckContext, LawResult } from '../../types/law.types';
export { CheckerUtils } from '../../utils/checker-utils';
export { ConfigHelper } from '../../utils/config-helper';
export { ProjectTypeDetector } from '../../utils/config/project-type-detector';
export { FileUtils } from '../../utils/file-utils';
export { PathOperations } from '../../utils/path-operations';
export { AngularLawBase } from './angular-law-base';
