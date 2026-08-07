// Export specialized analyzers
export { APIAuthenticationAnalyzer } from './api-authentication.analyzer';
export { CORSAnalyzer } from './cors.analyzer';
export { HttpsEnforcementAnalyzer } from './https-enforcement.analyzer';
export { InputValidationAnalyzer } from './input-validation.analyzer';
export { RateLimitingAnalyzer } from './rate-limiting.analyzer';
export { SecurityHeadersAnalyzer } from './security-headers.analyzer';

// Export coordinator service
export { APISecurityAnalyzerService } from './api-security-coordinator.service';
