import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.14.0-rc.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_1 = __compactRuntime.CompactTypeBoolean;

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_3 = new _Either_0();

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_5 = new _ContractAddress_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      testBlockTimeLt: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`testBlockTimeLt: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const time_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('testBlockTimeLt',
                                     'argument 1 (as invoked from Typescript)',
                                     'block-time.compact line 3 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(time_0) === 'bigint' && time_0 >= 0n && time_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('testBlockTimeLt',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'block-time.compact line 3 char 1',
                                     'Uint<0..18446744073709551616>',
                                     time_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(time_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._testBlockTimeLt_0(context,
                                                 partialProofData,
                                                 time_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      testBlockTimeGte: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`testBlockTimeGte: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const time_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('testBlockTimeGte',
                                     'argument 1 (as invoked from Typescript)',
                                     'block-time.compact line 7 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(time_0) === 'bigint' && time_0 >= 0n && time_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('testBlockTimeGte',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'block-time.compact line 7 char 1',
                                     'Uint<0..18446744073709551616>',
                                     time_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(time_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._testBlockTimeGte_0(context,
                                                  partialProofData,
                                                  time_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      testBlockTimeGt: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`testBlockTimeGt: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const time_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('testBlockTimeGt',
                                     'argument 1 (as invoked from Typescript)',
                                     'block-time.compact line 11 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(time_0) === 'bigint' && time_0 >= 0n && time_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('testBlockTimeGt',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'block-time.compact line 11 char 1',
                                     'Uint<0..18446744073709551616>',
                                     time_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(time_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._testBlockTimeGt_0(context,
                                                 partialProofData,
                                                 time_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      testBlockTimeLte: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`testBlockTimeLte: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const time_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('testBlockTimeLte',
                                     'argument 1 (as invoked from Typescript)',
                                     'block-time.compact line 15 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(time_0) === 'bigint' && time_0 >= 0n && time_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('testBlockTimeLte',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'block-time.compact line 15 char 1',
                                     'Uint<0..18446744073709551616>',
                                     time_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(time_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._testBlockTimeLte_0(context,
                                                  partialProofData,
                                                  time_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      testBlockTimeLt: this.circuits.testBlockTimeLt,
      testBlockTimeGte: this.circuits.testBlockTimeGte,
      testBlockTimeGt: this.circuits.testBlockTimeGt,
      testBlockTimeLte: this.circuits.testBlockTimeLte
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('testBlockTimeLt', new __compactRuntime.ContractOperation());
    state_0.setOperation('testBlockTimeGte', new __compactRuntime.ContractOperation());
    state_0.setOperation('testBlockTimeGt', new __compactRuntime.ContractOperation());
    state_0.setOperation('testBlockTimeLte', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    state_0.data = context.currentQueryContext.state;
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_6.toValue(2n),
                                                                                                 alignment: _descriptor_6.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(time_0),
                                                                                                                             alignment: _descriptor_0.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeGte_0(context, partialProofData, time_0) {
    return !this._blockTimeLt_0(context, partialProofData, time_0);
  }
  _blockTimeGt_0(context, partialProofData, time_0) {
    return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(time_0),
                                                                                                                             alignment: _descriptor_0.alignment() }).encode() } },
                                                                      { dup: { n: 3 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_6.toValue(2n),
                                                                                                 alignment: _descriptor_6.alignment() } }] } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeLte_0(context, partialProofData, time_0) {
    return !this._blockTimeGt_0(context, partialProofData, time_0);
  }
  _testBlockTimeLt_0(context, partialProofData, time_0) {
    return __compactRuntime.assert(this._blockTimeLt_0(context,
                                                       partialProofData,
                                                       time_0),
                                   'Block time is >= time');
  }
  _testBlockTimeGte_0(context, partialProofData, time_0) {
    return __compactRuntime.assert(this._blockTimeGte_0(context,
                                                        partialProofData,
                                                        time_0),
                                   'Block time is < time');
  }
  _testBlockTimeGt_0(context, partialProofData, time_0) {
    return __compactRuntime.assert(this._blockTimeGt_0(context,
                                                       partialProofData,
                                                       time_0),
                                   'Block time is <= time');
  }
  _testBlockTimeLte_0(context, partialProofData, time_0) {
    return __compactRuntime.assert(this._blockTimeLte_0(context,
                                                        partialProofData,
                                                        time_0),
                                   'Block time is > time');
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
