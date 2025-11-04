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

import * as Schema from 'effect/Schema';

export const EncodedCoinPublicKeySchema = Schema.Struct({
  bytes: Schema.Uint8Array
});

export const EncodedContractAddressSchema = Schema.Struct({
  bytes: Schema.Uint8Array
});

export const EncodedQualifiedShieldedCoinInfoSchema = Schema.Struct({
  nonce: Schema.Uint8Array,
  color: Schema.Uint8Array,
  value: Schema.BigInt,
  mt_index: Schema.BigInt
});

export const EncodedShieldedCoinInfoSchema = Schema.Struct({
  nonce: Schema.Uint8Array,
  color: Schema.Uint8Array,
  value: Schema.BigInt
});

export const EncodedRecipientSchema = Schema.Struct({
  is_left: Schema.Boolean,
  left: EncodedCoinPublicKeySchema,
  right: EncodedContractAddressSchema
});

export const EncodedZswapLocalStateSchema = Schema.Struct({
  coinPublicKey: EncodedCoinPublicKeySchema,
  currentIndex: Schema.BigInt,
  inputs: Schema.Array(EncodedQualifiedShieldedCoinInfoSchema),
  outputs: Schema.Array(Schema.Struct({
    coinInfo: EncodedShieldedCoinInfoSchema,
    recipient: EncodedRecipientSchema
  }))
});

export const encodeZswapLocalStateObject = Schema.encodeUnknown(EncodedZswapLocalStateSchema);
export const decodeZswapLocalStateObject = Schema.decodeUnknown(EncodedZswapLocalStateSchema);
