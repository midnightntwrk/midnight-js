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

import type { FinalizedTxData, ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';

/**
 * An error indicating that a transaction submitted to a consensus node failed.
 */
export class TxFailedError extends Error {
  /**
   * @param finalizedTxData The finalization data of the transaction that failed.
   * @param circuitId The name of the circuit that was called to create the call
   *                  transaction that failed. Only defined if a call transaction
   *                  failed.
   */
  constructor(
    public readonly finalizedTxData: FinalizedTxData,
    public readonly circuitId?: ImpureCircuitId
  ) {
    super('Transaction failed');
    this.message = JSON.stringify(
      {
        ...(circuitId && { circuitId }),
        ...finalizedTxData
      },
      null,
      '\t'
    );
  }
}
