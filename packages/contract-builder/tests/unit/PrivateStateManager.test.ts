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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrivateStateConfig } from '../../src/config/PrivateStateConfig.js';
import { PrivateStateError, PrivateStateValidationError } from '../../src/errors/PrivateStateError.js';
import { PrivateStateManager } from '../../src/private-state/PrivateStateManager.js';
import type { Logger } from '../../src/types/contract-types.js';

describe('PrivateStateManager', () => {
  type CounterPrivateState = {
    privateCounter: number;
  };

  let mockProviders: any;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    mockProviders = {
      privateStateProvider: {
        get: vi.fn().mockResolvedValue({ privateCounter: 0 }),
        set: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  describe('constructor', () => {
    it('should create manager with provided state ID', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        stateId: 'my-custom-id',
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.getStateId()).toBe('my-custom-id');
    });

    it('should generate state ID when not provided', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.getStateId()).toMatch(/^private-state-\d+-[a-z0-9]+$/);
    });

    it('should generate unique state IDs', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager1 = new PrivateStateManager(config, mockProviders);
      const manager2 = new PrivateStateManager(config, mockProviders);

      expect(manager1.getStateId()).not.toBe(manager2.getStateId());
    });

    it('should throw error when initial state is missing', () => {
      const config = {} as PrivateStateConfig<CounterPrivateState>;

      expect(() => new PrivateStateManager(config, mockProviders)).toThrow(
        PrivateStateValidationError
      );
      expect(() => new PrivateStateManager(config, mockProviders)).toThrow(
        'Initial state is required'
      );
    });

    it('should throw error when initial state is invalid', () => {
      const config: PrivateStateConfig<any> = {
        initialState: null as any
      };

      expect(() => new PrivateStateManager(config, mockProviders)).toThrow(
        PrivateStateValidationError
      );
    });
  });

  describe('getState', () => {
    it('should retrieve state from provider', async () => {
      const expectedState = { privateCounter: 42 };
      mockProviders.privateStateProvider.get.mockResolvedValue(expectedState);

      const config: PrivateStateConfig<CounterPrivateState> = {
        stateId: 'test-id',
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders, mockLogger);

      const state = await manager.getState();

      expect(state).toEqual(expectedState);
      expect(mockProviders.privateStateProvider.get).toHaveBeenCalledWith('test-id');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Getting private state',
        expect.objectContaining({ stateId: 'test-id' })
      );
    });

    it('should handle provider errors', async () => {
      mockProviders.privateStateProvider.get.mockRejectedValue(
        new Error('Provider error')
      );

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await expect(manager.getState()).rejects.toThrow(PrivateStateError);
      await expect(manager.getState()).rejects.toThrow(/Failed to get private state/);
    });

    it('should return null when state does not exist', async () => {
      mockProviders.privateStateProvider.get.mockResolvedValue(null);

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      const state = await manager.getState();

      expect(state).toBeNull();
    });
  });

  describe('setState', () => {
    it('should set state to provider', async () => {
      const newState: CounterPrivateState = { privateCounter: 99 };

      const config: PrivateStateConfig<CounterPrivateState> = {
        stateId: 'test-id',
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders, mockLogger);

      await manager.setState(newState);

      expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(
        'test-id',
        newState
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Setting private state',
        expect.objectContaining({ stateId: 'test-id', state: newState })
      );
    });

    it('should throw error when state is invalid', async () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await expect(manager.setState(null as any)).rejects.toThrow(
        PrivateStateValidationError
      );
      await expect(manager.setState(null as any)).rejects.toThrow(
        'Invalid private state structure'
      );
    });

    it('should handle provider errors', async () => {
      mockProviders.privateStateProvider.set.mockRejectedValue(
        new Error('Provider error')
      );

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await expect(manager.setState({ privateCounter: 10 })).rejects.toThrow(
        PrivateStateError
      );
      await expect(manager.setState({ privateCounter: 10 })).rejects.toThrow(
        /Failed to set private state/
      );
    });

    it('should log state changes with before/after when debug is enabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 0 });
      const newState: CounterPrivateState = { privateCounter: 99 };

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 },
        debug: true
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await manager.setState(newState);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PrivateState] State changed:',
        {
          from: { privateCounter: 0 },
          to: newState
        }
      );

      consoleSpy.mockRestore();
    });

    it('should not log to console when debug is disabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 },
        debug: false
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await manager.setState({ privateCounter: 99 });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('validation', () => {
    it('should validate correct state structure', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.validate({ privateCounter: 42 })).toBe(true);
    });

    it('should reject null state', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.validate(null as any)).toBe(false);
    });

    it('should reject undefined state', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.validate(undefined as any)).toBe(false);
    });

    it('should reject non-object state', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.validate('string' as any)).toBe(false);
      expect(manager.validate(42 as any)).toBe(false);
      expect(manager.validate(true as any)).toBe(false);
    });
  });

  describe('getInitialState', () => {
    it('should return initial state from config', () => {
      const initialState: CounterPrivateState = { privateCounter: 100 };
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState
      };

      const manager = new PrivateStateManager(config, mockProviders);

      expect(manager.getInitialState()).toEqual(initialState);
    });
  });

  describe('generateStateId', () => {
    it('should generate state ID with correct format', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      const stateId = manager.generateStateId();

      expect(stateId).toMatch(/^private-state-\d+-[a-z0-9]+$/);
    });

    it('should generate different IDs on subsequent calls', () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      const id1 = manager.generateStateId();
      const id2 = manager.generateStateId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('snapshot and restore', () => {
    it('should create snapshot of current state', async () => {
      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 42 });

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await manager.createSnapshot();

      expect(manager.hasSnapshot()).toBe(true);
    });

    it('should restore state from snapshot', async () => {
      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 42 });

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await manager.createSnapshot();

      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 100 });

      await manager.restoreSnapshot();

      expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(
        manager.getStateId(),
        { privateCounter: 42 }
      );
      expect(manager.hasSnapshot()).toBe(false);
    });

    it('should do nothing when restoring without snapshot', async () => {
      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await manager.restoreSnapshot();

      expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
    });

    it('should clear snapshot', async () => {
      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 42 });

      const config: PrivateStateConfig<CounterPrivateState> = {
        initialState: { privateCounter: 0 }
      };

      const manager = new PrivateStateManager(config, mockProviders);

      await manager.createSnapshot();
      expect(manager.hasSnapshot()).toBe(true);

      manager.clearSnapshot();
      expect(manager.hasSnapshot()).toBe(false);
    });
  });
});
