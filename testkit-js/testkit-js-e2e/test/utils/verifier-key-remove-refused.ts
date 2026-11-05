/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { ProviderFailedError } from '@midnight-ntwrk/midnight-js-contracts';
import { expect } from 'vitest';

// midnightntwrk/midnight-node#2375: the node refuses every VerifierKeyRemove with Malformed(BalanceCheckOverspend),
// although the transaction is paid. Once the node is fixed this fails; restore the commented-out success assertions.
export const expectVerifierKeyRemoveRefused = async (removal: Promise<unknown>): Promise<void> => {
  await expect(removal).rejects.toBeInstanceOf(ProviderFailedError);
  await expect(removal).rejects.toMatchObject({
    method: 'submitTx',
    cause: { message: expect.stringContaining('Transaction submission error') }
  });
};
