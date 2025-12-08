import type { PrivateStateConfig } from '../config/PrivateStateConfig.js';
import { PrivateStateError, PrivateStateValidationError } from '../errors/PrivateStateError.js';
import type { Logger } from '../types/contract-types.js';

export class PrivateStateManager<TPrivateState> {
  private stateId: string;
  private logger?: Logger;
  private stateSnapshot?: TPrivateState;

  constructor(
    private config: PrivateStateConfig<TPrivateState>,
    private providers: any,
    logger?: Logger
  ) {
    this.stateId = config.stateId || this.generateStateId();
    this.logger = logger;
    this.validateConfig();
  }

  async getState(): Promise<TPrivateState | null> {
    this.log('Getting private state', { stateId: this.stateId });

    try {
      const state = await this.providers.privateStateProvider.get(this.stateId);
      this.log('Retrieved private state', { state });
      return state;
    } catch (error) {
      throw new PrivateStateError(
        `Failed to get private state: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async setState(state: TPrivateState): Promise<void> {
    this.log('Setting private state', { stateId: this.stateId, state });

    if (!this.validate(state)) {
      throw new PrivateStateValidationError('Invalid private state structure');
    }

    try {
      const oldState = await this.getState();

      await this.providers.privateStateProvider.set(this.stateId, state);

      if (this.config.debug) {
        console.log('[PrivateState] State changed:', {
          from: oldState,
          to: state
        });
      }
    } catch (error) {
      throw new PrivateStateError(
        `Failed to set private state: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  getStateId(): string {
    return this.stateId;
  }

  getInitialState(): TPrivateState {
    return this.config.initialState;
  }

  generateStateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `private-state-${timestamp}-${random}`;
  }

  validate(state: TPrivateState): boolean {
    if (state === null || state === undefined) {
      return false;
    }

    if (typeof state !== 'object') {
      return false;
    }

    return true;
  }

  private validateConfig(): void {
    if (!this.config.initialState) {
      throw new PrivateStateValidationError('Initial state is required');
    }

    if (!this.validate(this.config.initialState)) {
      throw new PrivateStateValidationError('Invalid initial state structure');
    }
  }

  async createSnapshot(): Promise<void> {
    this.log('Creating private state snapshot');
    this.stateSnapshot = await this.getState() || undefined;
  }

  async restoreSnapshot(): Promise<void> {
    if (!this.stateSnapshot) {
      this.log('No snapshot to restore');
      return;
    }

    this.log('Restoring private state from snapshot', { snapshot: this.stateSnapshot });
    await this.setState(this.stateSnapshot);
    this.stateSnapshot = undefined;
  }

  hasSnapshot(): boolean {
    return this.stateSnapshot !== undefined;
  }

  clearSnapshot(): void {
    this.stateSnapshot = undefined;
  }

  private log(message: string, data?: any): void {
    if (this.logger) {
      this.logger.info(message, data);
    }
  }
}
