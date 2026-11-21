/**
 * Base class for Checklist Validation
 * Consolidates common checklist validation logic across deployment checklists
 */
import { minimatch } from 'minimatch';

import type { RuleOfCodeConfig } from '../../config/types';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';

export class ChecklistValidatorBase {
  /**
   * Common checkbox pattern for counting items
   */
  protected static readonly CHECKBOX_PATTERN = /^[\s]*-\s*\[([x\s])\]/gm;

  /**
   * The concerns a deployment checklist must COVER.
   *
   * We used to demand that 90% of the BOXES BE TICKED — in the repository. But a
   * checklist in a repo is a TEMPLATE: its boxes are ticked during an actual
   * deployment, against an actual release. To pass, a team had to commit a
   * pre-ticked checklist — to assert they had verified things they had not.
   *
   * That is not a detector gap. It is a WRONG INCENTIVE, and precisely the class
   * this project exists to destroy: an artifact that LOOKS like a check. BE
   * futures refused to tick the boxes and reported us instead — the right call,
   * and they paid for that lesson twice in production (a doc claiming
   * `--workers 2` while prod ran 1; a "graceful" paper fallback labelled LIVE).
   *
   * A law that is passed by pre-ticking a checklist teaches people to lie. So we
   * validate the STRUCTURE — does the checklist have steps for these concerns —
   * and say nothing about the state of the boxes. The state belongs to a
   * deployment artifact, not to the repository.
   */
  protected static readonly REQUIRED_CONCERNS: ReadonlyArray<{
    name: string;
    pattern: RegExp;
  }> = [
    {
      name: 'build & tests',
      pattern:
        /\b(build|compile|unit test|integration test|test suite|tests?\s+pass|lint)\b/i,
    },
    {
      name: 'security',
      pattern:
        /\b(security|vulnerabilit|secrets?|credential|auth[a-z]*|scan|audit)\b/i,
    },
    {
      name: 'rollback / recovery',
      pattern: /\b(roll\s?back|revert|recovery|restore|backup|undo)\b/i,
    },
  ];

  /** Concerns we advise but never fail a project for. */
  protected static readonly ADVISED_CONCERNS: ReadonlyArray<{
    name: string;
    pattern: RegExp;
  }> = [
    {
      name: 'configuration / environment',
      pattern:
        /\b(environment|env\s?var|config|feature flag|migration|secret)\b/i,
    },
    {
      name: 'monitoring / alerting',
      pattern:
        /\b(monitor|alert|observab|logging|metric|dashboard|on-?call)\b/i,
    },
  ];

  /**
   * Validate a checklist by what it COVERS, not by what has been ticked.
   */
  protected static validateChecklistFile(
    projectRoot: string,
    config: RuleOfCodeConfig,
    checklistFileName: string,
    _requiredCompletionRate?: number
  ): {
    exists: boolean;
    isComplete: boolean;
    completionRate: number;
    totalItems: number;
    completedItems: number;
    missingConcerns: string[];
    missingAdvisedConcerns: string[];
  } {
    // The checklist is a project file at the root, not source code: it is
    // looked up at its path, not through the source scan. The scan applies
    // `includes.global`, so a project whose includes name only its source
    // (src/**/*.ts) was told its committed checklist was missing. And a match
    // anywhere (docs/…/PRE_DEPLOYMENT_CHECKLIST.md) was then read from the
    // root, where it is not. `ignores.global` can still leave it out.
    const checklistPath = PathOperations.join(projectRoot, checklistFileName);
    const ignored = (config.ignores?.global ?? []).some(pattern =>
      minimatch(checklistFileName, pattern, { dot: true })
    );
    const checklistExists = !ignored && FileUtils.exists(checklistPath);

    if (!checklistExists) {
      return this.buildEmptyChecklistResult();
    }

    try {
      const content = FileUtils.readFile(checklistPath, { encoding: 'utf8' });
      const { totalItems, completedItems, completionRate } =
        this.parseChecklistContent(content);

      const missingConcerns = this.REQUIRED_CONCERNS.filter(
        concern => !concern.pattern.test(content)
      ).map(concern => concern.name);
      const missingAdvisedConcerns = this.ADVISED_CONCERNS.filter(
        concern => !concern.pattern.test(content)
      ).map(concern => concern.name);

      return {
        exists: true,
        // A checklist with no steps at all is not a checklist.
        isComplete: totalItems > 0 && missingConcerns.length === 0,
        completionRate,
        totalItems,
        completedItems,
        missingConcerns,
        missingAdvisedConcerns,
      };
    } catch (_error) {
      return this.buildEmptyChecklistResult();
    }
  }

  /**
   * Parse and validate checklist content
   * Excludes post-deployment sections from completion calculation
   * Returns: { totalItems, completedItems, completionRate }
   */
  protected static parseChecklistContent(content: string): {
    totalItems: number;
    completedItems: number;
    completionRate: number;
  } {
    // Split content into pre-deployment and post-deployment sections
    // Post-deployment tasks should not be counted for pre-deployment compliance
    const postDeploymentMarkers = [
      '## ✅ Post-Deployment Tasks',
      '## Post-Deployment Tasks',
      '## 📋 Post-Deployment',
      '### Post-Deployment',
      '## DEPLOYMENT CLEARED FOR PRODUCTION',
    ];

    let preDeploymentContent = content;
    for (const marker of postDeploymentMarkers) {
      const markerIndex = content.indexOf(marker);
      if (markerIndex !== -1) {
        preDeploymentContent = content.substring(0, markerIndex);
        break;
      }
    }

    // Count checkboxes only in pre-deployment section
    const matches = Array.from(
      preDeploymentContent.matchAll(this.CHECKBOX_PATTERN)
    );
    const totalItems = matches.length;
    const completedItems = matches.filter(
      match => match[1] && match[1].trim().toLowerCase() === 'x'
    ).length;

    const completionRate =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      completedItems,
      completionRate,
    };
  }

  /**
   * Build default checklist result when file doesn't exist
   */
  protected static buildEmptyChecklistResult(): {
    exists: boolean;
    isComplete: boolean;
    completionRate: number;
    totalItems: number;
    completedItems: number;
    missingConcerns: string[];
    missingAdvisedConcerns: string[];
  } {
    return {
      exists: false,
      isComplete: false,
      completionRate: 0,
      totalItems: 0,
      completedItems: 0,
      missingConcerns: this.REQUIRED_CONCERNS.map(concern => concern.name),
      missingAdvisedConcerns: this.ADVISED_CONCERNS.map(
        concern => concern.name
      ),
    };
  }

  /**
   * Build checklist result from parsed content
   */
  protected static buildChecklistResult(
    totalItems: number,
    completedItems: number,
    completionRate: number,
    requiredCompletionRate: number
  ): {
    exists: boolean;
    isComplete: boolean;
    completionRate: number;
    totalItems: number;
    completedItems: number;
  } {
    return {
      exists: true,
      isComplete: completionRate >= requiredCompletionRate,
      completionRate,
      totalItems,
      completedItems,
    };
  }
}
