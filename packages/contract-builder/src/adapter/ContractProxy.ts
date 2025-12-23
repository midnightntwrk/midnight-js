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

/**
 * Dynamic proxy for contract methods with interceptors
 */

import { MethodCallError } from '../errors/AdapterError.js';
import type { DeployedContract, Logger } from '../types/contract-types.js';
import type { IndexableObject } from '../types/type-utils.js';
import { isFunction } from '../utils/type-helpers.js';

/**
 * Options for creating a contract proxy
 */
export interface ContractProxyOptions<TContract = unknown> {
  /** Deployed contract instance */
  contract: DeployedContract<TContract>;

  /** Optional logger */
  logger?: Logger;
}

/**
 * CallTx proxy options
 */
interface CallTxProxyOptions {
  logger?: Logger;
}

/**
 * Creates a proxy for the callTx object that intercepts method calls
 */
function createCallTxProxy<TCallTx = unknown>(
  callTx: TCallTx,
  options: CallTxProxyOptions
): TCallTx {
  const { logger } = options;

  return new Proxy(callTx as object, {
    get(target: object, methodName: string | symbol): unknown {
      const originalMethod = (target as Record<string | symbol, unknown>)[methodName];

      // If not a function, just return the property
      if (!isFunction(originalMethod)) {
        return originalMethod;
      }

      // Return wrapped method
      return async function (...args: unknown[]): Promise<unknown> {
        const startTime = Date.now();
        const methodNameStr = String(methodName);

        logger?.info(`Calling contract method: ${methodNameStr}`, { args });

        try {
          const methodFunc = originalMethod as (...args: unknown[]) => Promise<unknown>;
          const result = await methodFunc.apply(target, args);

          const duration = Date.now() - startTime;

          logger?.info(`Contract method ${methodNameStr} succeeded`, {
            duration: `${duration}ms`
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          // Create structured error
          const methodError = new MethodCallError(
            `Contract method ${methodNameStr} failed: ${error instanceof Error ? error.message : String(error)}`,
            methodNameStr,
            args,
            error instanceof Error ? error : undefined
          );

          logger?.error(`Contract method ${methodNameStr} failed`, {
            error: methodError,
            duration: `${duration}ms`
          });

          throw methodError;
        }
      };
    }
  }) as TCallTx;
}

/**
 * Creates a dynamic proxy that intercepts all method calls on the deployed contract
 */
export function createContractProxy<TContract>(
  options: ContractProxyOptions<TContract>
): DeployedContract<TContract> {
  const { contract, logger } = options;

  // Create a proxy that intercepts method calls
  const proxy = new Proxy(contract, {
    get(target: DeployedContract<TContract>, prop: string | symbol): unknown {
      // Handle special properties
      if (prop === 'address') {
        return target.address;
      }

      if (prop === 'deployTxData') {
        return target.deployTxData;
      }

      // Handle callTx methods
      if (prop === 'callTx') {
        return createCallTxProxy(target.callTx, {
          logger
        });
      }

      // Forward other property access
      return (target as IndexableObject<DeployedContract<TContract>>)[prop];
    }
  });

  return proxy as DeployedContract<TContract>;
}
