/**
 * Jest Setup File
 * Initializes test environment and global configurations
 */

// Silence console in tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Optionally suppress console output in tests
  // Uncomment if needed
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Extend Jest matchers
expect.extend({
  toBeValidJSON(received: string) {
    try {
      JSON.parse(received);
      return {
        message: () => `expected ${received} not to be valid JSON`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be valid JSON`,
        pass: false,
      };
    }
  },
});

// Global test timeout
jest.setTimeout(30000);

// Mock Date if needed in tests
// jest.useFakeTimers();

export {};
