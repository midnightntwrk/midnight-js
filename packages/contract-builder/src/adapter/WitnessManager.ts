/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
