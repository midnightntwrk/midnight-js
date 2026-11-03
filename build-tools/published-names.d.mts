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

export interface PublishedNamesOptions {
  readonly skipSubpaths?: readonly string[];
  readonly skipNamespaces?: readonly string[];
}

export declare const publishedNames: (packageRoot: string, options?: PublishedNamesOptions) => string[];

export declare const namingViolations: (names: readonly string[]) => string[];

export interface Ledger9NamingOptions {
  readonly aliasFiles?: readonly string[];
  readonly skipSubpaths?: readonly string[];
}

export declare const unprefixedLedger9Types: (packageRoot: string, options?: Ledger9NamingOptions) => string[];
