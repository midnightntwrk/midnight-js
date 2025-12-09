import { WitnessAttachmentError, WitnessValidationError } from '../errors/WitnessError.js';
import type { ContractInstance } from '../types/external-contract-types.js';
import type { Witnesses, WitnessFunction } from '../types/witness-types.js';

/**
 * Contract constructor type that accepts witnesses
 */
type ContractConstructor = new (witnesses: Witnesses<unknown, unknown>) => ContractInstance;

export class WitnessManager<TLedger = unknown, TPrivateState = unknown> {
  constructor(
    private witnesses: Witnesses<TLedger, TPrivateState>,
    private contractClass: ContractConstructor
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

  attachToContract(): ContractInstance {
    try {
      return new this.contractClass(this.witnesses as Witnesses<unknown, unknown>);
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
