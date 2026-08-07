/**
 * Tests for IncidentResponseProtocolLaw
 *
 * Comprehensive tests for incident response protocol validation
 */
import { IncidentResponseProtocolLaw } from '../../../src/laws/documentation/incident-response-protocol';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('IncidentResponseProtocolLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('incident-response-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a LawResult object', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have fixable property', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(typeof result.fixable).toBe('boolean');
    });

    it('should return config in result', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('incident response documentation', () => {
    it('should fail for empty project without incident docs', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        'Missing incident response protocol documentation'
      );
    });

    it('should detect INCIDENT_RESPONSE.md in root', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        '# Incident Response Plan\n\n## Escalation\n\nFollow escalation procedures.'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident response protocol documentation'
      );
    });

    it('should detect docs/INCIDENT_RESPONSE.md', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'INCIDENT_RESPONSE.md'),
        '# Incident Response Protocol\n\n## Procedures'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident response protocol documentation'
      );
    });

    it('should detect RUNBOOK.md as incident docs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'RUNBOOK.md'),
        '# Runbook\n\n## Incident Response\n\nEscalation procedures...'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident response protocol documentation'
      );
    });

    it('should detect docs/operations/INCIDENT_RESPONSE.md', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'docs', 'operations')
      );
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          'docs',
          'operations',
          'INCIDENT_RESPONSE.md'
        ),
        '# Incident Response\n\n## Steps'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident response protocol documentation'
      );
    });
  });

  describe('escalation procedures', () => {
    it('should report missing escalation procedures', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).toContain(
        'Missing incident escalation procedures'
      );
    });

    it('should detect escalation content in INCIDENT_RESPONSE.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response Plan

## Escalation Procedures

1. Level 1: On-call engineer
2. Level 2: Team lead
3. Level 3: Management notification

### Decision Criteria

- Critical incident: Escalate immediately
- High severity level requires attention
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident escalation procedures'
      );
    });

    it('should detect standalone ESCALATION.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        '# Incident Response'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ESCALATION.md'),
        '# Escalation Procedures\n\n## Escalation Path\n\nEscalate to management.'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident escalation procedures'
      );
    });
  });

  describe('communication plans', () => {
    it('should report missing communication plans', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).toContain(
        'Missing incident communication plans'
      );
    });

    it('should detect communication content in incident docs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response Plan

## Communication Plan

### Notification Procedures

- Status update every 30 minutes
- Stakeholder communication via email
- Customer communication templates available

### Communication Templates

Use announcement templates for public updates.
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident communication plans'
      );
    });

    it('should detect standalone communication docs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        '# Incident Response'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'COMMUNICATION_PLAN.md'),
        '# Communication Plan\n\n## Notification Procedures'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing incident communication plans'
      );
    });
  });

  describe('roles and responsibilities', () => {
    it('should suggest roles definition when missing', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect((result.suggestions ?? []).some(s => s.includes('roles'))).toBe(
        true
      );
    });

    it('should detect roles content in incident docs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response Plan

## Roles and Responsibilities

### Incident Commander
- Leads incident response
- Accountable for resolution

### On-Call Engineer
- First responder
- Responsibility to triage
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect((result.suggestions ?? []).some(s => s.includes('roles'))).toBe(
        false
      );
    });

    it('should detect RACI matrix file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        '# Incident Response'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'RACI_MATRIX.md'),
        '# RACI Matrix\n\n## Responsibilities'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect((result.suggestions ?? []).some(s => s.includes('roles'))).toBe(
        false
      );
    });
  });

  describe('response time objectives', () => {
    it('should suggest RTO definition when missing', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(
        (result.suggestions ?? []).some(s => s.includes('response time'))
      ).toBe(true);
    });

    it('should detect RTO content in incident docs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response Plan

## Response Time Objectives

### SLA Requirements

- Critical: 15 minute response time
- High: 1 hour response time
- Medium: 4 hour response time
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(
        (result.suggestions ?? []).some(s => s.includes('response time'))
      ).toBe(false);
    });

    it('should detect SLA.md file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        '# Incident Response'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'SLA.md'),
        '# Service Level Agreement\n\nResponse time: 30 minutes'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(
        (result.suggestions ?? []).some(s => s.includes('response time'))
      ).toBe(false);
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have lower score for missing documentation', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should have higher score with complete documentation', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response Plan

## Escalation Procedures
Escalate to management for critical incidents.

## Communication Plan
Status update notifications for stakeholders.

## Roles and Responsibilities
Incident commander is accountable for resolution.

## Response Time Objectives
SLA: 15 minute response time.
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.score).toBeGreaterThan(50);
    });
  });

  describe('message generation', () => {
    it('should generate warning message when violations exist', () => {
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.message).toContain('⚠️');
    });

    it('should generate success message when all checks pass', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response

## Escalation
Escalate to management.

## Communication
Notification procedures.

## Roles and Responsibilities
Accountable parties.

## Response Time
30 minute SLA.
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      if (result.passed) {
        expect(result.message).toContain('✅');
      }
    });
  });

  describe('docs quality assessment', () => {
    it('should assess basic docs quality', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        '# Incident Response\n\nBasic documentation.'
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should assess comprehensive docs quality', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md'),
        `# Incident Response Plan

## Escalation Procedures
- Escalation path defined
- Severity level classification

## Communication
- Stakeholder communication
- Post-incident review

## Roles and Responsibilities
- Incident commander
- Contact information

## Response Time Objectives
- SLA requirements
`
      );
      const result = IncidentResponseProtocolLaw.check(mockContext);
      expect(result.passed).toBe(true);
    });

    it('should handle file read errors gracefully', () => {
      // Create a mock file that will exist but can't be read
      const filePath = PathOperations.join(tempDir, 'INCIDENT_RESPONSE.md');
      FileUtils.writeFile(filePath, 'test');

      // Mock FileUtils.readFile to throw an error
      const originalReadFile = FileUtils.readFile;
      jest.spyOn(FileUtils, 'readFile').mockImplementationOnce(() => {
        throw new Error('File read error');
      });

      const result = IncidentResponseProtocolLaw.check(mockContext);
      // Should still report file found but with basic quality assessment
      expect(result.passed).toBe(false);

      // Restore original
      (FileUtils.readFile as any) = originalReadFile;
    });
  });
});
