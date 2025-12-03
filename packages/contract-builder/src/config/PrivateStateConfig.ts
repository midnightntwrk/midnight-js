export interface PrivateStateConfig<TPrivateState> {
  stateId?: string;
  initialState: TPrivateState;
  autoSave?: boolean;
  debug?: boolean;
}

export interface ConnectWithPrivateStateOptions {
  contractAddress: string;
  privateStateId: string;
  providers: any;
}

export const DEFAULT_PRIVATE_STATE_CONFIG = {
  autoSave: true,
  debug: false
};
