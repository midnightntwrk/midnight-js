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

import type { WaitStrategy } from 'testcontainers';

/**
 * A wait strategy that waits for a specified delay before considering the container ready.
 */
export class DelayWaitStrategy implements WaitStrategy {
  private startupTimeoutMs = 60_000;
  private startupTimeoutSet = false;

  constructor(private readonly delayMs: number) {}

  async waitUntilReady(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  withStartupTimeout(startupTimeoutMs: number): this {
    this.startupTimeoutMs = startupTimeoutMs;
    this.startupTimeoutSet = true;
    return this;
  }

  isStartupTimeoutSet(): boolean {
    return this.startupTimeoutSet;
  }

  getStartupTimeout(): number {
    return this.startupTimeoutMs;
  }
}

/**
 * A wait strategy that first waits for a delay, then delegates to another wait strategy.
 */
export class DelayedWaitStrategy implements WaitStrategy {
  private startupTimeoutMs = 60_000;
  private startupTimeoutSet = false;

  constructor(
    private readonly delayMs: number,
    private readonly delegate: WaitStrategy
  ) {}

  async waitUntilReady(...args: Parameters<WaitStrategy['waitUntilReady']>): Promise<void> {
    console.log(`[DelayedWaitStrategy] Starting ${this.delayMs}ms delay before health check...`);
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    console.log(`[DelayedWaitStrategy] Delay complete, now checking health...`);
    await this.delegate.waitUntilReady(...args);
    console.log(`[DelayedWaitStrategy] Health check passed`);
  }

  withStartupTimeout(startupTimeoutMs: number): this {
    this.startupTimeoutMs = startupTimeoutMs;
    this.startupTimeoutSet = true;
    this.delegate.withStartupTimeout(startupTimeoutMs);
    return this;
  }

  isStartupTimeoutSet(): boolean {
    return this.startupTimeoutSet;
  }

  getStartupTimeout(): number {
    return this.startupTimeoutMs;
  }
}

/**
 * Factory functions for creating delay wait strategies.
 */
export const WaitStrategies = {
  /**
   * Creates a wait strategy that waits for a specified delay.
   * @param delayMs The delay in milliseconds.
   */
  forDelay(delayMs: number): DelayWaitStrategy {
    return new DelayWaitStrategy(delayMs);
  },

  /**
   * Creates a wait strategy that first waits for a delay, then delegates to another strategy.
   * @param delayMs The delay in milliseconds before checking the delegate strategy.
   * @param delegate The wait strategy to delegate to after the delay.
   */
  forDelayedStrategy(delayMs: number, delegate: WaitStrategy): DelayedWaitStrategy {
    return new DelayedWaitStrategy(delayMs, delegate);
  }
};
