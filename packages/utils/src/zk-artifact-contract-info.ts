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

import { isJsonObject } from './internal/json-object';

/** File name of the `compactc`-emitted contract description, beside the integrity manifest. */
export const ZK_CONTRACT_INFO_FILE_NAME = 'contract-info.json';

/**
 * Thrown when a `compactc` `contract-info.json` cannot be read as one, or declares no runtime
 * version.
 *
 * Distinct from {@link ZkArtifactIntegrityError}: nothing here is a failed integrity check. The
 * file is the artifact set's own statement of which toolchain produced it, and this error says
 * that statement is missing or unreadable.
 */
export class ZkArtifactContractInfoError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ZkArtifactContractInfoError';
  }
}

/**
 * Reads the `runtime-version` a `compactc` `contract-info.json` declares.
 *
 * Only the runtime version is returned, because it is the only member callers act on: it names the
 * `compact-runtime` the artifact set was compiled against, which is what places the artifact on the
 * ledger-era timeline. Every other member of the file is the contract's own description and belongs
 * to the toolchain, not to this framework.
 *
 * Fail-closed throughout: a missing, empty or non-string `runtime-version` throws rather than
 * answering `undefined`, because an absent answer here is indistinguishable from an artifact set
 * that declares nothing, and a caller cannot act on either.
 *
 * @param rawJson The file's bytes, decoded as UTF-8 text.
 * @returns The declared runtime version, verbatim.
 * @throws ZkArtifactContractInfoError if the text is not a JSON object, or declares no usable
 * `runtime-version`.
 */
export function parseZkArtifactRuntimeVersion(rawJson: string): string {
  let root: unknown;
  try {
    root = JSON.parse(rawJson);
  } catch (error) {
    throw new ZkArtifactContractInfoError(`${ZK_CONTRACT_INFO_FILE_NAME} is not valid JSON`, { cause: error });
  }
  if (!isJsonObject(root)) {
    throw new ZkArtifactContractInfoError(`${ZK_CONTRACT_INFO_FILE_NAME} must be a JSON object`);
  }
  const runtimeVersion = root['runtime-version'];
  if (runtimeVersion === undefined) {
    throw new ZkArtifactContractInfoError(
      `${ZK_CONTRACT_INFO_FILE_NAME} declares no "runtime-version", so the toolchain that produced ` +
        `these artifacts cannot be established. Recompile the contract with a compactc that emits it.`
    );
  }
  // Named rather than merely refused: a truncated or hand-edited file is otherwise indistinguishable
  // from an artifact set built by a toolchain too old to record the version, and the two have
  // different fixes.
  if (typeof runtimeVersion !== 'string' || runtimeVersion.length === 0) {
    throw new ZkArtifactContractInfoError(
      `${ZK_CONTRACT_INFO_FILE_NAME} declares an unusable "runtime-version": expected a non-empty ` +
        `string, got ${JSON.stringify(runtimeVersion)}`
    );
  }
  return runtimeVersion;
}
