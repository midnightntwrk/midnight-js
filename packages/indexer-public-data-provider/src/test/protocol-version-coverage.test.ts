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

import { type DocumentNode, Kind, type SelectionSetNode } from 'graphql';
import { describe, expect, test } from 'vitest';

import * as documents from '../query-definitions';

/**
 * Every place a document asks for `protocolVersion`, as a dotted path through
 * the selection set. Inline fragments contribute their type condition as a path
 * segment, so the three arms of a `contractAction` selection stay distinguishable.
 */
const protocolVersionPaths = (document: DocumentNode): string[] => {
  const found: string[] = [];
  const walk = (selectionSet: SelectionSetNode, path: readonly string[]): void => {
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const next = [...path, selection.name.value];
        if (selection.name.value === 'protocolVersion') {
          found.push(next.join('.'));
        }
        if (selection.selectionSet) {
          walk(selection.selectionSet, next);
        }
        continue;
      }
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        const condition = selection.typeCondition?.name.value;
        walk(selection.selectionSet, condition === undefined ? path : [...path, condition]);
      }
    }
  };
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      walk(definition.selectionSet, []);
    }
  }
  return found.sort();
};

/**
 * The era every document is expected to carry, stated exhaustively.
 *
 * Read as a contract in both directions. A document that decodes era-sensitive
 * bytes must date them, so a missing path fails here; and a document that has
 * no use for the era must not pay for the field, so an unexpected path fails
 * here too. That is why the empty entries are spelled out rather than omitted —
 * `BLOCK_QUERY` and `LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY` return no
 * serialized bytes at all, and the three unshielded-balance documents select
 * types the schema gives no `protocolVersion` to.
 */
const EXPECTED_PATHS: Readonly<Record<string, readonly string[]>> = {
  BLOCK_QUERY: [],
  HEAD_PROTOCOL_VERSION_QUERY: ['block.protocolVersion'],
  TX_ID_QUERY: ['transactions.protocolVersion'],
  DEPLOY_TX_QUERY: [
    'contractAction.ContractCall.deploy.transaction.protocolVersion',
    'contractAction.ContractDeploy.transaction.protocolVersion',
    'contractAction.ContractUpdate.transaction.protocolVersion'
  ],
  DEPLOY_CONTRACT_STATE_TX_QUERY: [
    'contractAction.ContractCall.deploy.transaction.protocolVersion',
    'contractAction.ContractDeploy.transaction.protocolVersion',
    'contractAction.ContractUpdate.transaction.protocolVersion'
  ],
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY: [],
  TXS_FROM_BLOCK_SUB: ['blocks.protocolVersion'],
  CONTRACT_STATE_QUERY: ['block.protocolVersion'],
  RAW_CONTRACT_STATE_QUERY: ['block.protocolVersion'],
  CONTRACT_STATE_SUB: ['contractActions.transaction.protocolVersion'],
  CONTRACT_AND_ZSWAP_STATE_QUERY: ['block.protocolVersion'],
  UNSHIELDED_BALANCE_QUERY: [],
  QUERY_UNSHIELDED_BALANCES_WITH_OFFSET: [],
  UNSHIELDED_BALANCE_SUB: [],
  CONTRACT_EVENTS_QUERY: ['contractEvents.protocolVersion'],
  CONTRACT_EVENTS_SUB: ['contractEvents.protocolVersion']
};

describe('protocolVersion coverage across the indexer documents', () => {
  test('every exported document is covered by the expectation table', () => {
    // Without this, a newly added document would silently escape the audit.
    expect(Object.keys(documents).sort()).toEqual(Object.keys(EXPECTED_PATHS).sort());
  });

  test.each(Object.entries(EXPECTED_PATHS))('%s asks for the era exactly where it is needed', (name, expected) => {
    const document = (documents as Record<string, DocumentNode>)[name];
    if (document === undefined) {
      throw new Error(`test setup: ${name} is not exported from query-definitions`);
    }

    expect(protocolVersionPaths(document)).toEqual([...expected].sort());
  });
});
