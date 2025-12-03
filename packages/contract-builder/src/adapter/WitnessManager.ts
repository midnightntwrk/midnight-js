import type { Witnesses, WitnessFunction } from '../types/witness-types.js';
import { WitnessError, WitnessValidationError, WitnessAttachmentError } from '../errors/WitnessError.js';

export class WitnessManager<TLedger = any, TPrivateState = any> {
  constructor(
    private witnesses: Witnesses<TLedger, TPrivateState>,
    private contractClass: any
  ) {}

  validate(): void {
    const providedWitnesses = Object.keys(this.witnesses);

    if (providedWitnesses.length === 0) {
      throw new WitnessValidationError('No witnesses provided');
    }

    for (const [name, witness] of Object.entries(this.witnesses)) {
      if (typeof witness !== 'function') {
        throw new WitnessValidationError(
          `Witness '${name}' must be a function, got ${typeof witness}`
        );
      }
    }
  }

  attachToContract(): any {
    try {
      return new this.contractClass(this.witnesses);
    } catch (error) {
      throw new WitnessAttachmentError(
        `Failed to attach witnesses to contract: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  getWitnessNames(): string[] {
    return Object.keys(this.witnesses);
  }

  hasWitness(name: string): boolean {
    return name in this.witnesses;
  }

  getWitness(name: string): WitnessFunction<TLedger, TPrivateState> | undefined {
    return this.witnesses[name];
  }

  getWitnesses(): Witnesses<TLedger, TPrivateState> {
    return this.witnesses;
  }
}
