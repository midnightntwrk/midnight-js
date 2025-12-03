export type WitnessContext<TLedger = any, TPrivateState = any> = {
  ledger: TLedger;
  privateState: TPrivateState;
  [key: string]: any;
};

export type WitnessFunction<TLedger = any, TPrivateState = any> = (
  context: WitnessContext<TLedger, TPrivateState>
) => [TPrivateState, any[]];

export type Witnesses<TLedger = any, TPrivateState = any> = {
  [key: string]: WitnessFunction<TLedger, TPrivateState>;
};

export interface WitnessCallEvent<TPrivateState = any> {
  witnessName: string;
  context: WitnessContext<any, TPrivateState>;
  result: [TPrivateState, any[]];
}
