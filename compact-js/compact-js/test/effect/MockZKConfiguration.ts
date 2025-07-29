/*
 * This file is part of compact-js.
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

import { Effect, Layer } from 'effect';
import { ZKConfiguration, Contract } from '@midnight-ntwrk/compact-js/effect';

export const layer = Layer.effect(
  ZKConfiguration.ZKConfiguration,
  Effect.sync(() =>
    ZKConfiguration.ZKConfiguration.of({
      createReader: (_) =>
        Effect.sync(() => ({
          getVerifierKey: (_) => Effect.sync(() => Contract.VerifierKey(new Uint8Array())),
          getVerifierKeys: (ids) => Effect.sync(() => [[ids[0], Contract.VerifierKey(new Uint8Array())]])
        }))
    })
  )
);
