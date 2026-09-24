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
 * Fails the build when `T` is not `true`.
 *
 * A bare conditional type never fails one on its own -- `type X = C ? true :
 * never` compiles whatever `C` resolves to. The constraint here is what turns a
 * `false` into a compile error, so the alias has to be routed through it.
 */
export type Assert<T extends true> = T;

/**
 * True only when `A` and `B` are assignable to each other.
 *
 * Both sides are wrapped in tuples so a union is compared whole rather than
 * distributed over its arms.
 */
export type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
