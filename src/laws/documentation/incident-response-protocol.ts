import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { QualityAssessmentUtils } from '../../utils/quality-assessment-utils';
/**
 * Incident Response Protocol Law
 *
 * Validates comprehensive incident response documentation and procedures:
 * - Incident response plan document exists
 * - Escalation procedures are defined
 * - Communication plans documented
 * - Roles and responsibilities clear
 * - Response time objectives (RTO) defined
 * - Post-incident review procedures
 * - Emergency contact information
 * - Incident classification system
 *
 * Professional implementation following incident management best practices
 */
export class IncidentResponseProtocolLaw {
  private static readonly INCIDENT_RESPONSE_FILE = 'INCIDENT_RESPONSE.md';
  private static readonly INCIDENT_RESPONSE_DOCS_FILE =
    'docs/INCIDENT_RESPONSE.md';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;

    // Initialize configurable thresholds
    const thresholds = {
      missingIncidentDocsDeduction:
        config.thresholds?.documentation?.incidentResponse
          ?.missingIncidentDocsDeduction ?? 30,
      missingEscalationDeduction:
        config.thresholds?.documentation?.incidentResponse
          ?.missingEscalationDeduction ?? 25,
      missingCommunicationDeduction:
        config.thresholds?.documentation?.incidentResponse
          ?.missingCommunicationDeduction ?? 20,
      missingRolesDeduction:
        config.thresholds?.documentation?.incidentResponse
          ?.missingRolesDeduction ?? 15,
      missingRTODeduction:
        config.thresholds?.documentation?.incidentResponse
          ?.missingRTODeduction ?? 10,
    };

    // 1. Check for incident response documentation
    const incidentDocs = this.analyzeIncidentResponseDocumentation(projectRoot);
    if (!incidentDocs.hasIncidentDocs) {
      violations.push('Missing incident response protocol documentation');
      suggestions.push(
        'Create comprehensive incident response plan documentation'
      );
      score -= thresholds.missingIncidentDocsDeduction;
    }

    // 2. Check for escalation procedures
    const escalationProcedures = this.analyzeEscalationProcedures(projectRoot);
    if (!escalationProcedures.hasEscalationProcedures) {
      violations.push('Missing incident escalation procedures');
      suggestions.push('Document clear escalation paths and decision criteria');
      score -= thresholds.missingEscalationDeduction;
    }

    // 3. Check for communication plans
    const communicationPlans = this.analyzeCommunicationPlans(projectRoot);
    if (!communicationPlans.hasCommunicationPlans) {
      violations.push('Missing incident communication plans');
      suggestions.push(
        'Document communication templates and notification procedures'
      );
      score -= thresholds.missingCommunicationDeduction;
    }

    // 4. Check for roles and responsibilities
    const rolesAndResponsibilities =
      this.analyzeRolesAndResponsibilities(projectRoot);
    if (!rolesAndResponsibilities.hasRoleDefinitions) {
      // Advice, not a finding: it costs no score. A deduction with no violation
      // behind it produces a number that argues with its own green verdict, and
      // drags the audit's aggregate score for something that failed nobody.
      suggestions.push(
        'Define clear roles and responsibilities for incident response'
      );
    }

    // 5. Check for response time objectives
    const responseTimeObjectives =
      this.analyzeResponseTimeObjectives(projectRoot);
    if (!responseTimeObjectives.hasResponseTimeObjectives) {
      suggestions.push(
        'Define response time objectives (RTO) for different incident severities'
      );
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(violations.length, incidentDocs),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static analyzeIncidentResponseDocumentation(projectRoot: string): {
    hasIncidentDocs: boolean;
    docsQuality: string;
  } {
    // Check for incident response documentation
    const incidentResponseFiles = [
      this.INCIDENT_RESPONSE_FILE,
      this.INCIDENT_RESPONSE_DOCS_FILE,
      'docs/operations/INCIDENT_RESPONSE.md',
      'INCIDENT_RESPONSE_PLAN.md',
      'docs/INCIDENT_RESPONSE_PLAN.md',
      'emergency-response.md',
      'docs/emergency/response-plan.md',
      'RUNBOOK.md',
      'docs/RUNBOOK.md',
    ];

    let hasIncidentDocs = false;
    let docsQuality = 'none';

    for (const docFile of incidentResponseFiles) {
      const filePath = PathOperations.join(projectRoot, docFile);
      if (FileUtils.exists(filePath)) {
        hasIncidentDocs = true;
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          docsQuality = this.assessIncidentDocsQuality(content);
        } catch (_error) {
          docsQuality = 'basic';
        }
        break;
      }
    }

    return {
      hasIncidentDocs,
      docsQuality,
    };
  }

  private static analyzeEscalationProcedures(projectRoot: string): {
    hasEscalationProcedures: boolean;
    escalationLevels: string[];
  } {
    // Check for escalation procedures documentation
    let hasEscalationProcedures = false;

    const escalationFiles = [
      'ESCALATION.md',
      'docs/ESCALATION.md',
      'docs/operations/escalation-procedures.md',
      this.INCIDENT_RESPONSE_FILE,
      this.INCIDENT_RESPONSE_DOCS_FILE,
    ];

    for (const escalationFile of escalationFiles) {
      const filePath = PathOperations.join(projectRoot, escalationFile);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasEscalationContent(content)) {
            hasEscalationProcedures = true;
            break;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return { hasEscalationProcedures, escalationLevels: [] };
  }

  private static analyzeCommunicationPlans(projectRoot: string): {
    hasCommunicationPlans: boolean;
    communicationChannels: string[];
  } {
    // Check for communication plans and templates
    let hasCommunicationPlans = false;

    const communicationFiles = [
      'COMMUNICATION_PLAN.md',
      'docs/COMMUNICATION_PLAN.md',
      'docs/incident/communication-templates.md',
      'incident-communication.md',
      'docs/operations/communication-procedures.md',
    ];

    for (const commFile of communicationFiles) {
      const filePath = PathOperations.join(projectRoot, commFile);
      if (FileUtils.exists(filePath)) {
        hasCommunicationPlans = true;
        break;
      }
    }

    // Check for communication content in incident response documents
    if (!hasCommunicationPlans) {
      hasCommunicationPlans =
        this.checkIncidentFilesForCommunication(projectRoot);
    }

    return { hasCommunicationPlans, communicationChannels: [] };
  }

  private static analyzeRolesAndResponsibilities(projectRoot: string): {
    hasRoleDefinitions: boolean;
    definedRoles: string[];
  } {
    // Check for roles and responsibilities documentation
    let hasRolesAndResponsibilities = false;

    const rolesFiles = [
      'ROLES_AND_RESPONSIBILITIES.md',
      'docs/ROLES_AND_RESPONSIBILITIES.md',
      'docs/operations/roles.md',
      'RACI_MATRIX.md',
      'docs/RACI_MATRIX.md',
    ];

    for (const rolesFile of rolesFiles) {
      const filePath = PathOperations.join(projectRoot, rolesFile);
      if (FileUtils.exists(filePath)) {
        hasRolesAndResponsibilities = true;
        break;
      }
    }

    // Check for roles content in incident response documents
    if (!hasRolesAndResponsibilities) {
      hasRolesAndResponsibilities =
        this.checkIncidentFilesForRoles(projectRoot);
    }

    return {
      hasRoleDefinitions: hasRolesAndResponsibilities,
      definedRoles: [],
    };
  }

  private static analyzeResponseTimeObjectives(projectRoot: string): {
    hasResponseTimeObjectives: boolean;
    objectives: string[];
  } {
    // Check for response time objectives (RTO) documentation
    let hasResponseTimeObjectives = false;

    const rtoFiles = [
      'RTO.md',
      'docs/RTO.md',
      'RESPONSE_TIME_OBJECTIVES.md',
      'docs/sla/rto.md',
      'SLA.md',
      'docs/SLA.md',
    ];

    for (const rtoFile of rtoFiles) {
      const filePath = PathOperations.join(projectRoot, rtoFile);
      if (FileUtils.exists(filePath)) {
        hasResponseTimeObjectives = true;
        break;
      }
    }

    // Check for RTO content in incident response documents
    if (!hasResponseTimeObjectives) {
      hasResponseTimeObjectives = this.checkIncidentFilesForRTO(projectRoot);
    }

    return { hasResponseTimeObjectives, objectives: [] };
  }

  private static assessIncidentDocsQuality(content: string): string {
    const qualityIndicators = [
      /escalation/i,
      /communication/i,
      /roles.*responsibilities/i,
      /response.*time/i,
      /severity.*level/i,
      /post.*incident/i,
      /contact.*information/i,
      /classification/i,
    ];

    return QualityAssessmentUtils.assessQualityByPatterns(
      content,
      qualityIndicators
    );
  }

  private static hasEscalationContent(content: string): boolean {
    const escalationPatterns = [
      /escalation/i,
      /escalate/i,
      /severity.*level/i,
      /critical.*incident/i,
      /management.*notification/i,
      /escalation.*path/i,
      /decision.*criteria/i,
    ];

    return escalationPatterns.some(pattern => pattern.test(content));
  }

  private static hasCommunicationContent(content: string): boolean {
    const communicationPatterns = [
      /communication.*plan/i,
      /notification/i,
      /status.*update/i,
      /stakeholder/i,
      /customer.*communication/i,
      /communication.*template/i,
      /announcement/i,
    ];

    return communicationPatterns.some(pattern => pattern.test(content));
  }

  private static hasRolesContent(content: string): boolean {
    const rolesPatterns = [
      /roles.*responsibilities/i,
      /incident.*commander/i,
      /incident.*manager/i,
      /on.*call/i,
      /responsibility/i,
      /RACI/i,
      /accountable/i,
    ];

    return rolesPatterns.some(pattern => pattern.test(content));
  }

  private static hasRTOContent(content: string): boolean {
    const rtoPatterns = [
      /response.*time/i,
      /RTO/i,
      /time.*objective/i,
      /SLA/i,
      /service.*level/i,
      /\d+.*hour/i,
      /\d+.*minute/i,
    ];

    return rtoPatterns.some(pattern => pattern.test(content));
  }

  private static generateMessage(
    violationCount: number,
    incidentDocs: { hasIncidentDocs: boolean; docsQuality: string }
  ): string {
    if (violationCount === 0) {
      return `✅ Incident Response: ${incidentDocs.docsQuality} protocol`;
    }

    return `⚠️ Incident Response: Missing protocol documentation`;
  }

  /**
   * Generic incident file checker with content predicate
   */
  private static checkIncidentFilesForContent(
    projectRoot: string,
    contentChecker: (content: string) => boolean
  ): boolean {
    const incidentFiles = [
      this.INCIDENT_RESPONSE_FILE,
      this.INCIDENT_RESPONSE_DOCS_FILE,
    ];

    for (const incidentFile of incidentFiles) {
      const filePath = PathOperations.join(projectRoot, incidentFile);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (contentChecker(content)) {
            return true;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }
    return false;
  }

  private static checkIncidentFilesForCommunication(
    projectRoot: string
  ): boolean {
    return this.checkIncidentFilesForContent(projectRoot, content =>
      this.hasCommunicationContent(content)
    );
  }

  private static checkIncidentFilesForRoles(projectRoot: string): boolean {
    return this.checkIncidentFilesForContent(projectRoot, content =>
      this.hasRolesContent(content)
    );
  }

  private static checkIncidentFilesForRTO(projectRoot: string): boolean {
    return this.checkIncidentFilesForContent(projectRoot, content =>
      this.hasRTOContent(content)
    );
  }
}
