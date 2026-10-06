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
 * The `@midnight-ntwrk/compact-runtime` stand-in the retained-era fixture
 * modules need at IMPORT time, and nothing more.
 *
 * A generated retained-era artifact opens with `checkRuntimeVersion('0.16.0')`
 * — which the installed current runtime rejects outright — and then builds type
 * descriptors and an empty context at module scope. Only what that module-scope
 * code touches is stubbed here.
 *
 * Nothing in the suites that install this EXECUTES a circuit or a constructor:
 * the retained execution is replayed from a committed recording, so the
 * contract object is only ever inspected for its era and handed on. An
 * insufficient stub cannot pass silently either — the artifact's module-scope
 * code would throw during import and the suite would fail loudly.
 *
 * Not a `*.test.ts` file, so vitest does not collect it, and it sits under
 * `test/`, which the coverage config excludes. It exists as its own module
 * rather than inline in each suite because a `vi.mock` factory is hoisted, so
 * two suites needing the same stub would otherwise carry two copies of it.
 */

class CompactTypeStub {
  alignment(): unknown[] {
    return [];
  }
  fromValue(value: unknown): unknown {
    return value;
  }
  toValue(value: unknown): unknown[] {
    return [value];
  }
}

class ContractStateStub {
  data: unknown = undefined;
}

class QueryContextStub {}

export const checkRuntimeVersion = (): void => undefined;
export const CompactError = Error;
export const CompactTypeBoolean = new CompactTypeStub();
export const CompactTypeBytes = CompactTypeStub;
export const CompactTypeUnsignedInteger = CompactTypeStub;
export const ContractState = ContractStateStub;
export const dummyContractAddress = (): string => '00'.repeat(32);
export const QueryContext = QueryContextStub;
