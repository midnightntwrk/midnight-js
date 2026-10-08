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

/**
 * Every message in a failure's cause chain, outermost first.
 *
 * compact-js reports an execution failure as `Error executing circuit 'x'` and
 * hangs the runtime's own diagnostic -- `Block time is <= time`, an out-of-gas,
 * a failed assertion -- on `cause`. Only the outer message reaches a caller who
 * reads `error.message`, so the reason the circuit ACTUALLY failed is lost at
 * exactly the moment someone needs it.
 */
export const causeChain = (error: unknown, seen: Set<unknown> = new Set()): readonly string[] => {
  if (typeof error !== 'object' || error === null || seen.has(error)) {
    return typeof error === 'string' ? [error] : [];
  }
  seen.add(error);
  const message = 'message' in error && typeof error.message === 'string' ? [error.message] : [];
  return 'cause' in error ? [...message, ...causeChain(error.cause, seen)] : message;
};
