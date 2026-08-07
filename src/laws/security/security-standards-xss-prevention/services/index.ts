// Export specialized analyzers
export { CSPConfigurationAnalyzer } from './csp-configuration.analyzer';
export { DangerousPatternsAnalyzer } from './dangerous-patterns.analyzer';
export { InputSanitizationAnalyzer } from './input-sanitization.analyzer';
export { SecurityHeadersAnalyzer } from './security-headers.analyzer';
export { TemplateSafetyAnalyzer } from './template-safety.analyzer';

// Export coordinator service
export { XSSPreventionAnalyzerService } from './xss-prevention-coordinator.service';
