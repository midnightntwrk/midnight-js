export class PrivateStateError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'PrivateStateError';

    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class PrivateStateValidationError extends PrivateStateError {
  constructor(message: string) {
    super(message);
    this.name = 'PrivateStateValidationError';
  }
}

export class PrivateStateNotConfiguredError extends PrivateStateError {
  constructor() {
    super('This contract does not have private state configured');
    this.name = 'PrivateStateNotConfiguredError';
  }
}
