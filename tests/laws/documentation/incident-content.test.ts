/**
 * What Incident Response Protocol looks for in an incident document, tested
 * where the patterns live.
 */
import {
  assessIncidentDocsQuality,
  hasCommunicationContent,
  hasEscalationContent,
  hasRolesContent,
  hasRTOContent,
} from '../../../src/laws/documentation/incident-content';

const PLAN = [
  '# Incident response',
  '## Escalation path: severity level 1 goes to management notification',
  '## Communication plan: status update to every stakeholder',
  '## Roles and responsibilities: the incident commander is on call',
  '## Response time: within 15 minutes',
  '## Post-incident review',
  '## Contact information',
  '## Classification',
].join('\n');

describe('incident content', () => {
  it('a full plan names every topic and reads as comprehensive', () => {
    expect(hasEscalationContent(PLAN)).toBe(true);
    expect(hasCommunicationContent(PLAN)).toBe(true);
    expect(hasRolesContent(PLAN)).toBe(true);
    expect(hasRTOContent(PLAN)).toBe(true);
    expect(assessIncidentDocsQuality(PLAN)).toBe('comprehensive');
  });

  it('an empty document names no topic', () => {
    expect(hasEscalationContent('')).toBe(false);
    expect(hasCommunicationContent('')).toBe(false);
    expect(hasRolesContent('')).toBe(false);
    expect(hasRTOContent('')).toBe(false);
  });

  it('each topic is told apart: a time objective alone is not escalation', () => {
    const text = 'We answer within 2 hours.';
    expect(hasRTOContent(text)).toBe(true);
    expect(hasEscalationContent(text)).toBe(false);
    expect(hasRolesContent(text)).toBe(false);
  });
});
