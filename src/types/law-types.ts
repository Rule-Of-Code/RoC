/**
 * Law types definitions
 */

import type { RuleOfCodeConfig } from '../config/types';

export interface LawCheckContext {
  projectRoot: string;
  config: RuleOfCodeConfig;
}

export interface LawResult {
  lawId: string;
  passed: boolean;
  message: string;
  violations: string[];
  suggestions: string[];
  score: number;
  config: RuleOfCodeConfig;
}
