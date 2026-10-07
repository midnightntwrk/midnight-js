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

import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';

import { IncompleteDeployContractPrivateStateConfig } from '../errors';

/**
 * Refuses half a deploy private-state pairing. Reads the KEYS, so `initialPrivateState: undefined`
 * beside an id is legal; an id given as `undefined` is refused first.
 */
export const assertDeployPrivateStatePairing = (options: object): void => {
  const namesId = 'privateStateId' in options;
  if (namesId) {
    assertDefined(
      options.privateStateId,
      "'privateStateId' was given as undefined. Name a private state id, or omit the property entirely " +
        'for a contract that stores no private state.'
    );
  }
  if (namesId !== 'initialPrivateState' in options) {
    throw new IncompleteDeployContractPrivateStateConfig(namesId ? 'initialPrivateState' : 'privateStateId');
  }
};
