/**
 * Security Standards XSS Prevention Module
 *
 * Exports constants, services, and law for XSS prevention checking.
 * Follows Single Responsibility Principle with clean separation:
 * - Constants: Pattern definitions and validation helpers
 * - Services: Specialized analysis engine
 * - Law: Pure coordinator delegating to services
 */

export * from './constants';
export * from './services';
