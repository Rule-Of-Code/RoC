/**
 * Logging Utilities
 * Centralized logging functionality for RuleOfCode utilities
 * No external dependencies - compatible with Node.js environments
 */

/**
 * Log warning message with context
 */
export const logWarn = (
  message: string,
  context: string,
  error?: unknown
): void => {
  if (process.env.NODE_ENV !== 'production') {
     
    console.warn(`[${context}] ${message}`, error);
  }
};

/**
 * Log error message with context
 */
export const logError = (
  message: string,
  context: string,
  error?: unknown
): void => {
  if (process.env.NODE_ENV !== 'production') {
     
    console.error(`[${context}] ${message}`, error);
  }
};

/**
 * Log info message with context
 */
export const logInfo = (
  message: string,
  context: string,
  data?: unknown
): void => {
  if (process.env.NODE_ENV !== 'production') {
     
    console.info(`[${context}] ${message}`, data);
  }
};

/**
 * Log debug message with context (development only)
 */
export const logDebug = (
  message: string,
  context: string,
  data?: unknown
): void => {
  if (process.env.NODE_ENV !== 'production' && process.env.DEBUG) {
     
    console.debug(`[${context}] ${message}`, data);
  }
};
