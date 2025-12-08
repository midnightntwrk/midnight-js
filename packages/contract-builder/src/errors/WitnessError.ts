export class WitnessError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'WitnessError';

    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class WitnessValidationError extends WitnessError {
  constructor(message: string, public readonly missingWitnesses?: string[]) {
    super(message);
    this.name = 'WitnessValidationError';
  }
}

export class WitnessAttachmentError extends WitnessError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'WitnessAttachmentError';
  }
}

export class WitnessExecutionError extends WitnessError {
  constructor(
    message: string,
    public readonly witnessName: string,
    public readonly context?: any,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'WitnessExecutionError';
  }
}
