// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { NetworkId } from './network-id';
/**
 * An error indicating an unexpected network identifier.
 */
export class NetworkIdTypeError extends TypeError {
  /**
   * @param networkId A string representation of the invalid network identifier.
   */
  constructor(public readonly networkId: string) {
    super(
      `Invalid network ID: '${networkId}'. Must be one of: ${Object.values(NetworkId).join(', ')}`
    );
  }
}
