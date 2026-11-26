import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.21.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_1 = new _ContractAddress_0();

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_0.fromValue(value_0),
      color: _descriptor_0.fromValue(value_0),
      value: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.nonce).concat(_descriptor_0.toValue(value_0.color).concat(_descriptor_2.toValue(value_0.value)));
  }
}

const _descriptor_3 = new _ShieldedCoinInfo_0();

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_5 = new _ZswapCoinPublicKey_0();

const _descriptor_6 = __compactRuntime.CompactTypeBoolean;

class _Maybe_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_3.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_6.fromValue(value_0),
      value: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_some).concat(_descriptor_3.toValue(value_0.value));
  }
}

const _descriptor_7 = new _Maybe_0();

class _ShieldedSendResult_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_3.alignment());
  }
  fromValue(value_0) {
    return {
      change: _descriptor_7.fromValue(value_0),
      sent: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.change).concat(_descriptor_3.toValue(value_0.sent));
  }
}

const _descriptor_8 = new _ShieldedSendResult_0();

class _Either_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_6.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_9 = new _Either_0();

class _UserAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_10 = new _UserAddress_0();

class _Either_1 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_1.alignment().concat(_descriptor_10.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_6.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_10.toValue(value_0.right)));
  }
}

const _descriptor_11 = new _Either_1();

class _Maybe_1 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_11.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_6.fromValue(value_0),
      value: _descriptor_11.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_some).concat(_descriptor_11.toValue(value_0.value));
  }
}

const _descriptor_12 = new _Maybe_1();

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_14 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

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
      depositToVault: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`depositToVault: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('depositToVault',
                                     'argument 1 (as invoked from Typescript)',
                                     'vault-caller.compact line 14 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('depositToVault',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'vault-caller.compact line 14 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coin_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(coin_0),
            alignment: _descriptor_3.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._depositToVault_0(context,
                                                      partialProofData,
                                                      coin_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      mintAndSendFromVault: async (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`mintAndSendFromVault: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const domainSep_0 = args_1[1];
        const mintValue_0 = args_1[2];
        const mintNonce_0 = args_1[3];
        const publicKey_0 = args_1[4];
        const sendValue_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintAndSendFromVault',
                                     'argument 1 (as invoked from Typescript)',
                                     'vault-caller.compact line 18 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(domainSep_0.buffer instanceof ArrayBuffer && domainSep_0.BYTES_PER_ELEMENT === 1 && domainSep_0.length === 32)) {
          __compactRuntime.typeError('mintAndSendFromVault',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'vault-caller.compact line 18 char 1',
                                     'Bytes<32>',
                                     domainSep_0)
        }
        if (!(typeof(mintValue_0) === 'bigint' && mintValue_0 >= 0n && mintValue_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('mintAndSendFromVault',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'vault-caller.compact line 18 char 1',
                                     'Uint<0..18446744073709551616>',
                                     mintValue_0)
        }
        if (!(mintNonce_0.buffer instanceof ArrayBuffer && mintNonce_0.BYTES_PER_ELEMENT === 1 && mintNonce_0.length === 32)) {
          __compactRuntime.typeError('mintAndSendFromVault',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'vault-caller.compact line 18 char 1',
                                     'Bytes<32>',
                                     mintNonce_0)
        }
        if (!(typeof(publicKey_0) === 'object' && publicKey_0.bytes.buffer instanceof ArrayBuffer && publicKey_0.bytes.BYTES_PER_ELEMENT === 1 && publicKey_0.bytes.length === 32)) {
          __compactRuntime.typeError('mintAndSendFromVault',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'vault-caller.compact line 18 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     publicKey_0)
        }
        if (!(typeof(sendValue_0) === 'bigint' && sendValue_0 >= 0n && sendValue_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('mintAndSendFromVault',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'vault-caller.compact line 18 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     sendValue_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(domainSep_0).concat(_descriptor_4.toValue(mintValue_0).concat(_descriptor_0.toValue(mintNonce_0).concat(_descriptor_5.toValue(publicKey_0).concat(_descriptor_2.toValue(sendValue_0))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment().concat(_descriptor_2.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._mintAndSendFromVault_0(context,
                                                            partialProofData,
                                                            domainSep_0,
                                                            mintValue_0,
                                                            mintNonce_0,
                                                            publicKey_0,
                                                            sendValue_0);
        partialProofData.output = { value: _descriptor_8.toValue(result_0), alignment: _descriptor_8.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      depositToVault: this.circuits.depositToVault,
      mintAndSendFromVault: this.circuits.mintAndSendFromVault
    };
    this.provableCircuits = {
      depositToVault: this.circuits.depositToVault,
      mintAndSendFromVault: this.circuits.mintAndSendFromVault
    };
  }
  async initialState(...args_0) {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const target_0 = args_0[1];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(typeof(target_0) === 'object' && target_0.bytes.buffer instanceof ArrayBuffer && target_0.bytes.BYTES_PER_ELEMENT === 1 && target_0.bytes.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'vault-caller.compact line 10 char 1',
                                 'contract Vault[deposit(struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>): [], mintAndSend(Bytes<32>, Uint<0..18446744073709551616>, Bytes<32>, struct ZswapCoinPublicKey<bytes: Bytes<32>>, Uint<0..340282366920938463463374607431768211456>): struct ShieldedSendResult<change: struct Maybe<is_some: Boolean, value: struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>>, sent: struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>>]',
                                 target_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('depositToVault', new __compactRuntime.ContractOperation());
    state_0.setOperation('mintAndSendFromVault', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext({circuitId: 'constructor', contractAddress: __compactRuntime.dummyContractAddress(), coinPublicKeyOrZswapState: constructorContext_0.initialZswapLocalState.coinPublicKey, contractState: state_0.data, privateState: constructorContext_0.initialPrivateState});
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(target_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  async _depositToVault_0(context, partialProofData, coin_0) {
    await __compactRuntime.crossContractCall({
     context,
     interfaceName: 'Vault',
     declaration: declaredInterfaces['Vault'],
     calleeCircuitId: 'deposit',
     calleeAddress: __compactRuntime.decodeContractAddress((_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                      partialProofData,
                                                                                                                      [
                                                                                                                       { dup: { n: 0 } },
                                                                                                                       { idx: { cached: false,
                                                                                                                                pushPath: false,
                                                                                                                                path: [
                                                                                                                                       { tag: 'value',
                                                                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                                                                       { popeq: { cached: false,
                                                                                                                                  result: undefined } }]).value)).bytes),
     partialProofData,
     args: [coin_0]
    });
    return [];
  }
  async _mintAndSendFromVault_0(context,
                                partialProofData,
                                domainSep_0,
                                mintValue_0,
                                mintNonce_0,
                                publicKey_0,
                                sendValue_0)
  {
    return await __compactRuntime.crossContractCall({
            context,
            interfaceName: 'Vault',
            declaration: declaredInterfaces['Vault'],
            calleeCircuitId: 'mintAndSend',
            calleeAddress: __compactRuntime.decodeContractAddress((_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                             partialProofData,
                                                                                                                             [
                                                                                                                              { dup: { n: 0 } },
                                                                                                                              { idx: { cached: false,
                                                                                                                                       pushPath: false,
                                                                                                                                       path: [
                                                                                                                                              { tag: 'value',
                                                                                                                                                value: { value: _descriptor_13.toValue(0n),
                                                                                                                                                         alignment: _descriptor_13.alignment() } }] } },
                                                                                                                              { popeq: { cached: false,
                                                                                                                                         result: undefined } }]).value)).bytes),
            partialProofData,
            args: [domainSep_0,
                   mintValue_0,
                   mintNonce_0,
                   publicKey_0,
                   sendValue_0]
           });
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    callContext: { currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() },
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get vault() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(0n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const expectedVk = {
  'depositToVault': 'aa5effc8643a9d61bf86cbc269393cc4f4f3a15315478406eb814520422c397e',
  'mintAndSendFromVault': '377005009f776d46a79fd198056a8283a36ddb861b6c3ca1d2360d9da03a254f',
};

export const circuitSignatures = {
  'depositToVault': {pure: false, provable: true, argumentTypes: [{tag: 'Struct', name: 'ShieldedCoinInfo', elements: [{name: 'nonce', type: {tag: 'Bytes', length: 32}}, {name: 'color', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}}]}], resultType: {tag: 'Tuple', types: []}},
  'mintAndSendFromVault': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Uint', maxval: '18446744073709551615'}, {tag: 'Bytes', length: 32}, {tag: 'Struct', name: 'ZswapCoinPublicKey', elements: [{name: 'bytes', type: {tag: 'Bytes', length: 32}}]}, {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}], resultType: {tag: 'Struct', name: 'ShieldedSendResult', elements: [{name: 'change', type: {tag: 'Struct', name: 'Maybe', elements: [{name: 'is_some', type: {tag: 'Boolean'}}, {name: 'value', type: {tag: 'Struct', name: 'ShieldedCoinInfo', elements: [{name: 'nonce', type: {tag: 'Bytes', length: 32}}, {name: 'color', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}}]}}]}}, {name: 'sent', type: {tag: 'Struct', name: 'ShieldedCoinInfo', elements: [{name: 'nonce', type: {tag: 'Bytes', length: 32}}, {name: 'color', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}}]}}]}},
};

export const declaredInterfaces = {
  'Vault': {'deposit': {argumentTypes: [{tag: 'Struct', name: 'ShieldedCoinInfo', elements: [{name: 'nonce', type: {tag: 'Bytes', length: 32}}, {name: 'color', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}}]}], resultType: {tag: 'Tuple', types: []}}, 'mintAndSend': {argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Uint', maxval: '18446744073709551615'}, {tag: 'Bytes', length: 32}, {tag: 'Struct', name: 'ZswapCoinPublicKey', elements: [{name: 'bytes', type: {tag: 'Bytes', length: 32}}]}, {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}], resultType: {tag: 'Struct', name: 'ShieldedSendResult', elements: [{name: 'change', type: {tag: 'Struct', name: 'Maybe', elements: [{name: 'is_some', type: {tag: 'Boolean'}}, {name: 'value', type: {tag: 'Struct', name: 'ShieldedCoinInfo', elements: [{name: 'nonce', type: {tag: 'Bytes', length: 32}}, {name: 'color', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}}]}}]}}, {name: 'sent', type: {tag: 'Struct', name: 'ShieldedCoinInfo', elements: [{name: 'nonce', type: {tag: 'Bytes', length: 32}}, {name: 'color', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '340282366920938463463374607431768211455'}}]}}]}}},
};

//# sourceMappingURL=index.js.map
