/**
 * What Incident Response Protocol looks for in an incident response
 * document: the topics that make it a protocol, each as a set of patterns.
 */
import { QualityAssessmentUtils } from '../../utils/quality-assessment-utils';

/** The quality of an incident response document, by the topics it covers. */
export function assessIncidentDocsQuality(content: string): string {
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

/** Does the text define escalation: severity levels, paths, criteria? */
export function hasEscalationContent(content: string): boolean {
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

/** Does the text plan communication: notifications, updates, stakeholders? */
export function hasCommunicationContent(content: string): boolean {
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

/** Does the text assign roles: an incident commander, on-call, RACI? */
export function hasRolesContent(content: string): boolean {
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

/** Does the text set response time objectives: RTO, SLA, hours, minutes? */
export function hasRTOContent(content: string): boolean {
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
