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

/**
 * A warning for the person running the command: printed exactly as written,
 * on stderr (console.warn), in every environment. No `[context]` prefix and
 * no NODE_ENV gate — unlike logWarn, this is what the user reads, not a
 * developer's log line. Details (an error, a value) follow the message the
 * way console.warn prints them.
 */
export const warnUser = (message: string, ...details: unknown[]): void => {
  console.warn(message, ...details);
};

/** An error for the person running the command: as written, on stderr (console.error). */
export const errorUser = (message: string, ...details: unknown[]): void => {
  console.error(message, ...details);
};
