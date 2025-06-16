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
import type { PrivateStateProvider, PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { Buffer } from 'buffer';
import { Level } from 'level';
import { type AbstractSublevel } from 'abstract-level';
import _ from 'lodash';
import * as superjson from 'superjson';
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/compact-runtime';

/**
 * The default name of the indexedDB database for Midnight.
 */
export const MN_LDB_DEFAULT_DB_NAME = 'midnight-level-db';

/**
 * The default name of the private state store.
 */
export const MN_LDB_DEFAULT_PRIS_STORE_NAME = 'private-states';

/**
 * The default name of the signing key store.
 */
export const MN_LDB_DEFAULT_KEY_STORE_NAME = 'signing-keys';

/**
 * Optional properties for the indexedDB based private state provider configuration.
 */
export interface LevelPrivateStateProviderConfig {
  /**
   * The name of the LevelDB database used to store all Midnight related data.
   */
  readonly midnightDbName: string;
  /**
   * The name of the object store containing private states.
   */
  readonly privateStateStoreName: string;
  /**
   * The name of the object store containing signing keys.
   */
  readonly signingKeyStoreName: string;
}

/**
 * The default configuration for the level database.
 */
export const DEFAULT_CONFIG = {
  /**
   * The name of the database.
   */
  midnightDbName: MN_LDB_DEFAULT_DB_NAME,
  /**
   * The name of the "level" on which to store private state.
   */
  privateStateStoreName: MN_LDB_DEFAULT_PRIS_STORE_NAME,
  /**
   * The name of the "level" on which to store signing keys.
   */
  signingKeyStoreName: MN_LDB_DEFAULT_KEY_STORE_NAME
};

superjson.registerCustom<Buffer, string>(
  {
    isApplicable: (v): v is Buffer => v instanceof Buffer,
    serialize: (v) => v.toString('hex'),
    deserialize: (v) => Buffer.from(v, 'hex')
  },
  'buffer'
);

const withSubLevel = async <K, V, A>(
  dbName: string,
  levelName: string,
  thunk: (subLevel: AbstractSublevel<Level, string | Uint8Array | Buffer, K, V>) => Promise<A>
): Promise<A> => {
  const level = new Level(dbName, {
    createIfMissing: true
  });
  const subLevel = level.sublevel<K, V>(levelName, {
    valueEncoding: {
      encode: superjson.stringify,
      decode: superjson.parse,
      name: 'super-json-values'
    }
  });
  try {
    await level.open();
    await subLevel.open();
    return await thunk(subLevel);
  } finally {
    await subLevel.close();
    await level.close();
  }
};

const subLevelMaybeGet = <K, V>(dbName: string, levelName: string, key: K): Promise<V | null> => {
  return withSubLevel<K, V, V | null>(dbName, levelName, async (subLevel) => {
    const value = await subLevel.get(key);
    // We convert undefined values to null because we use undefined for contracts without private
    // state, and we want to be able to distinguish private states that are undefined but present
    // from private states that are not present at all.
    if (value === undefined) {
      return null;
    }
    return value;
  });
};

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Constructs an instance of {@link PrivateStateProvider} based on {@link Level} database.
 *
 * @param partialConfig Database configuration options.
 */
export const levelPrivateStateProvider = <PSI extends PrivateStateId, PS = any>(
  partialConfig: Partial<LevelPrivateStateProviderConfig> = {}
): PrivateStateProvider<PSI, PS> => {
  const config = _.defaults(partialConfig, DEFAULT_CONFIG);
  return {
    get(privateStateId: PSI): Promise<PS | null> {
      return subLevelMaybeGet<PSI, PS>(
        config.midnightDbName,
        config.privateStateStoreName,
        privateStateId
      );
    },
    remove(privateStateId: PSI): Promise<void> {
      return withSubLevel<PSI, PS, void>(
        config.midnightDbName,
        config.privateStateStoreName,
        (subLevel) => subLevel.del(privateStateId)
      );
    },
    set(privateStateId: PSI, state: PS): Promise<void> {
      return withSubLevel<PSI, PS, void>(
        config.midnightDbName,
        config.privateStateStoreName,
        (subLevel) => subLevel.put(privateStateId, state)
      );
    },
    clear(): Promise<void> {
      return withSubLevel(config.midnightDbName, config.privateStateStoreName, (subLevel) =>
        subLevel.clear()
      );
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return subLevelMaybeGet<ContractAddress, SigningKey>(
        config.midnightDbName,
        config.signingKeyStoreName,
        address
      );
    },
    removeSigningKey(address: ContractAddress): Promise<void> {
      return withSubLevel<ContractAddress, SigningKey, void>(
        config.midnightDbName,
        config.signingKeyStoreName,
        (subLevel) => subLevel.del(address)
      );
    },
    setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      return withSubLevel<ContractAddress, SigningKey, void>(
        config.midnightDbName,
        config.signingKeyStoreName,
        (subLevel) => subLevel.put(address, signingKey)
      );
    },
    clearSigningKeys(): Promise<void> {
      return withSubLevel(config.midnightDbName, config.signingKeyStoreName, (subLevel) =>
        subLevel.clear()
      );
    }
  };
};
