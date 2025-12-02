/**
 * Custom error classes for the Contract Adapter
 */

/**
 * Base error class for all adapter-related errors
 */
export class AdapterError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AdapterError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdapterError);
    }
  }
}

/**
 * Error thrown when contract deployment fails
 */
export class DeploymentError extends AdapterError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DeploymentError';
  }
}

/**
 * Error thrown when a contract method call fails
 */
export class MethodCallError extends AdapterError {
  constructor(
    message: string,
    public readonly methodName: string,
    public readonly args: any[],
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'MethodCallError';
  }
}

/**
 * Error thrown when retry logic exhausts all attempts
 */
export class RetryExhaustedError extends AdapterError {
  constructor(
    message: string,
    public readonly attempts: number,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'RetryExhaustedError';
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends AdapterError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
