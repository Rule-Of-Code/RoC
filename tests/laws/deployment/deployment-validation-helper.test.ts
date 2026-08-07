/**
 * Tests for initializeDeploymentValidation
 *
 * Tests the deployment validation initialization helper.
 */
import { initializeDeploymentValidation } from '../../../src/laws/deployment/deployment-validation-helper';

describe('initializeDeploymentValidation', () => {
  it('should return an object', () => {
    const result = initializeDeploymentValidation();
    expect(typeof result).toBe('object');
  });

  it('should have violations array', () => {
    const result = initializeDeploymentValidation();
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('should have empty violations array', () => {
    const result = initializeDeploymentValidation();
    expect(result.violations.length).toBe(0);
  });

  it('should have suggestions array', () => {
    const result = initializeDeploymentValidation();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('should have empty suggestions array', () => {
    const result = initializeDeploymentValidation();
    expect(result.suggestions.length).toBe(0);
  });

  it('should have scoreDeduction property', () => {
    const result = initializeDeploymentValidation();
    expect(result.scoreDeduction).toBeDefined();
  });

  it('should have scoreDeduction of zero', () => {
    const result = initializeDeploymentValidation();
    expect(result.scoreDeduction).toBe(0);
  });

  it('should return a new object each time', () => {
    const result1 = initializeDeploymentValidation();
    const result2 = initializeDeploymentValidation();
    expect(result1).not.toBe(result2);
  });

  it('should have independent violations arrays', () => {
    const result1 = initializeDeploymentValidation();
    const result2 = initializeDeploymentValidation();
    result1.violations.push('test violation');
    expect(result2.violations.length).toBe(0);
  });

  it('should have independent suggestions arrays', () => {
    const result1 = initializeDeploymentValidation();
    const result2 = initializeDeploymentValidation();
    result1.suggestions.push('test suggestion');
    expect(result2.suggestions.length).toBe(0);
  });

  it('should allow modifying violations', () => {
    const result = initializeDeploymentValidation();
    result.violations.push('Missing env var');
    expect(result.violations).toContain('Missing env var');
  });

  it('should allow modifying suggestions', () => {
    const result = initializeDeploymentValidation();
    result.suggestions.push('Add health check');
    expect(result.suggestions).toContain('Add health check');
  });

  it('should allow modifying scoreDeduction', () => {
    const result = initializeDeploymentValidation();
    result.scoreDeduction = 25;
    expect(result.scoreDeduction).toBe(25);
  });
});
