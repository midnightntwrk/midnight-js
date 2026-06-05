/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { describe, expect, it } from 'vitest';

import { classify } from '../deserialization/classify';
import type { DeserializationCallSite, SourceLibrary } from '../deserialization/deserialization-error';

const ledgerCallSite: DeserializationCallSite = {
  dataType: 'ContractState',
  source: 'ledger',
  caller: '@midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState'
};

const compactCallSite: DeserializationCallSite = {
  dataType: 'ContractState',
  source: 'compact-runtime',
  caller: '@midnight-ntwrk/midnight-js-contracts:fromLedgerContractState'
};

const onchainCallSite: DeserializationCallSite = {
  dataType: 'StateValue',
  source: 'onchain-runtime',
  caller: '@midnight-ntwrk/midnight-js-contracts:toLedgerQueryContext'
};

describe('classify — Pattern #1 (tag mismatch with two-stage match)', () => {
  it('classifies version mismatch with direction=data-newer-than-code when got version > expected', () => {
    const err = new Error(
      "Unable to deserialize ZswapChainState. Error: expected header tag 'midnight:zswap-ledger-state[v5]:', got 'midnight:zswap-ledger-state[v6]:'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBe('data-newer-than-code');
    expect(ctx.extracted?.expectedVersion).toBe(5);
    expect(ctx.extracted?.receivedVersion).toBe(6);
    expect(ctx.extracted?.dataType).toBe('ZswapChainState');
  });

  it('classifies version mismatch with direction=data-older-than-code when got version < expected', () => {
    const err = new Error(
      "Unable to deserialize ContractState. Error: expected header tag 'midnight:contract-state[v6]:', got 'midnight:contract-state[v5]:'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBe('data-older-than-code');
  });

  it('classifies as generic-param-mismatch when versions equal and specifiers differ', () => {
    const err = new Error(
      "expected header tag 'midnight:proof[v1](proof-preimage):', got 'midnight:proof[v1](pre-proof):'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('generic-param-mismatch');
    expect(ctx.extracted?.expectedSpecifiers).toBe('proof-preimage');
    expect(ctx.extracted?.receivedSpecifiers).toBe('pre-proof');
  });

  it('overrides context.dataType when regex captures `what` group', () => {
    const err = new Error(
      "Unable to deserialize ZswapChainState. Error: expected header tag 'midnight:zswap-ledger-state[v5]:', got 'midnight:zswap-ledger-state[v6]:'"
    );
    const callSiteWithStaleType = { ...ledgerCallSite, dataType: 'StaleHardcodedName' };

    const ctx = classify(callSiteWithStaleType, err);

    expect(ctx.dataType).toBe('ZswapChainState');
  });

  it('preserves context.dataType when WASM prefix absent (no `what` to extract)', () => {
    const err = new Error(
      "expected header tag 'midnight:contract-state[v6]:', got 'midnight:contract-state[v5]:'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.dataType).toBe('ContractState');
  });

  it('handles empty got (secondary pattern fails) — version-mismatch, direction undefined', () => {
    const err = new Error(
      "Unable to deserialize ContractState. Error: expected header tag 'midnight:contract-state[v6]:', got ''"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBeUndefined();
    expect(ctx.extracted?.expectedVersion).toBe(6);
    expect(ctx.extracted?.receivedVersion).toBeUndefined();
  });

  it('handles garbage got (secondary pattern fails) — version-mismatch, direction undefined', () => {
    const err = new Error(
      "Unable to deserialize ZswapChainState. Error: expected header tag 'midnight:zswap-ledger-state[v5]:', got '?????'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBeUndefined();
  });

  it('handles truncated got (secondary pattern fails) — version-mismatch, direction undefined', () => {
    const err = new Error(
      "Unable to deserialize ContractState. Error: expected header tag 'midnight:contract-state[v6]:', got 'midnight:zswap-ledger-state['"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBeUndefined();
  });
});

describe('classify — versioned enum discriminant patterns (#3, #4)', () => {
  it('classifies "invalid old discriminant" as version-mismatch with data-older-than-code', () => {
    const err = new Error('invalid old discriminant for ProofVersioned: 0');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBe('data-older-than-code');
  });

  it('classifies "unknown discriminant" as version-mismatch with data-newer-than-code', () => {
    const err = new Error('unknown discriminant for ProofVersioned: 2');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBe('data-newer-than-code');
  });
});

describe('classify — auto-derived enum and unsupported version (#5, #6)', () => {
  it('classifies "unrecognised discriminant" as version-mismatch, direction undefined', () => {
    const err = new Error('unrecognised discriminant');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
    expect(ctx.direction).toBeUndefined();
  });

  it('classifies "unsupported proof version" as version-mismatch', () => {
    const err = new Error('unsupported proof version provided for contract operation: 3');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
  });

  it('classifies "unsupported guaranteed transcript version" as version-mismatch', () => {
    const err = new Error('unsupported guaranteed transcript version provided for contract operation: 2');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('version-mismatch');
  });
});

describe('classify — format-mismatch patterns (#7-#13)', () => {
  it.each([
    ['Not all bytes read deserializing X; 5 bytes remaining', 'format-mismatch'],
    ['exceeded recursion depth deserializing', 'format-mismatch'],
    ['non-canonical scale encoding', 'format-mismatch'],
    ['out of range for u32', 'format-mismatch'],
    ['cannot deserialize 2 as bool', 'format-mismatch'],
    ['Invalid discriminant: 5.', 'format-mismatch'],
    ['failed to fill whole buffer', 'format-mismatch']
  ])('classifies "%s" as %s', (msg, expected) => {
    const ctx = classify(ledgerCallSite, new Error(msg));

    expect(ctx.classification).toBe(expected);
    expect(ctx.direction).toBeUndefined();
  });
});

describe('classify — unknown fallback', () => {
  it('classifies entirely unknown message as unknown', () => {
    const err = new Error('completely unexpected error format with no recognizable pattern');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.classification).toBe('unknown');
    expect(ctx.direction).toBeUndefined();
  });
});

describe('classify — source dispatch (shared patterns)', () => {
  it.each<SourceLibrary>(['ledger', 'compact-runtime', 'onchain-runtime'])(
    'applies the same patterns for source=%s',
    (source) => {
      const callSite =
        source === 'ledger' ? ledgerCallSite : source === 'compact-runtime' ? compactCallSite : onchainCallSite;
      const err = new Error('exceeded recursion depth deserializing');

      const ctx = classify(callSite, err);

      expect(ctx.classification).toBe('format-mismatch');
      expect(ctx.source).toBe(source);
    }
  );
});

describe('classify — mitigation generation (D12: keyed on classification × source)', () => {
  it('version-mismatch mitigation includes version-pinning baseline + source hint', () => {
    const err = new Error(
      "expected header tag 'midnight:contract-state[v6]:', got 'midnight:contract-state[v5]:'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.mitigation.length).toBeGreaterThan(0);
    expect(ctx.mitigation.join('\n')).toMatch(/pinned versions/i);
    expect(ctx.mitigation.join('\n')).toMatch(/structural version tag/i);
  });

  it('format-mismatch mitigation does NOT recommend version pin check', () => {
    const err = new Error('exceeded recursion depth deserializing');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.mitigation.join('\n')).toMatch(/malformed|truncated|canonical/i);
    expect(ctx.mitigation.join('\n')).not.toMatch(/pinned versions/i);
  });

  it('unknown mitigation tells dev to inspect the cause', () => {
    const err = new Error('mystery format that matches no pattern');

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.mitigation.join('\n')).toMatch(/inspect|caused by/i);
  });

  it('generic-param-mismatch mitigation also includes version baseline', () => {
    const err = new Error(
      "expected header tag 'midnight:proof[v1](proof-preimage):', got 'midnight:proof[v1](pre-proof):'"
    );

    const ctx = classify(ledgerCallSite, err);

    expect(ctx.mitigation.join('\n')).toMatch(/pinned versions/i);
  });
});

describe('classify — pinnedVersions always populated', () => {
  it('exposes pinned versions for all three sources', () => {
    const ctx = classify(ledgerCallSite, new Error('unknown error'));

    expect(ctx.pinnedVersions.ledger).toBe('v8');
    expect(ctx.pinnedVersions.compactRuntime).toBe('unversioned');
    expect(ctx.pinnedVersions.onchainRuntime).toBe('v3');
  });
});
