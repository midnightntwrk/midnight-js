import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.15.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_1 = __compactRuntime.CompactTypeBoolean;

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

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

const _descriptor_3 = new _ContractAddress_0();

class _UserAddress_0 {
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

const _descriptor_4 = new _UserAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_3.fromValue(value_0),
      right: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_3.toValue(value_0.left).concat(_descriptor_4.toValue(value_0.right)));
  }
}

const _descriptor_5 = new _Either_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _Either_1 {
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

const _descriptor_7 = new _Either_1();

const _descriptor_8 = new __compactRuntime.CompactTypeVector(2, _descriptor_2);

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

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
      mintUnshieldedToSelfTest: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`mintUnshieldedToSelfTest: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const domainSep_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintUnshieldedToSelfTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 3 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(domainSep_0.buffer instanceof ArrayBuffer && domainSep_0.BYTES_PER_ELEMENT === 1 && domainSep_0.length === 32)) {
          __compactRuntime.typeError('mintUnshieldedToSelfTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 3 char 1',
                                     'Bytes<32>',
                                     domainSep_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('mintUnshieldedToSelfTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 3 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(domainSep_0).concat(_descriptor_0.toValue(amount_0)),
            alignment: _descriptor_2.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._mintUnshieldedToSelfTest_0(context,
                                                          partialProofData,
                                                          domainSep_0,
                                                          amount_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      mintUnshieldedToContractTest: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`mintUnshieldedToContractTest: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const domainSep_0 = args_1[1];
        const address_0 = args_1[2];
        const amount_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintUnshieldedToContractTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 8 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(domainSep_0.buffer instanceof ArrayBuffer && domainSep_0.BYTES_PER_ELEMENT === 1 && domainSep_0.length === 32)) {
          __compactRuntime.typeError('mintUnshieldedToContractTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 8 char 1',
                                     'Bytes<32>',
                                     domainSep_0)
        }
        if (!(typeof(address_0) === 'object' && address_0.bytes.buffer instanceof ArrayBuffer && address_0.bytes.BYTES_PER_ELEMENT === 1 && address_0.bytes.length === 32)) {
          __compactRuntime.typeError('mintUnshieldedToContractTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 8 char 1',
                                     'struct ContractAddress<bytes: Bytes<32>>',
                                     address_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('mintUnshieldedToContractTest',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'unshielded.compact line 8 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(domainSep_0).concat(_descriptor_3.toValue(address_0).concat(_descriptor_0.toValue(amount_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._mintUnshieldedToContractTest_0(context,
                                                              partialProofData,
                                                              domainSep_0,
                                                              address_0,
                                                              amount_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      mintUnshieldedToUserTest: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`mintUnshieldedToUserTest: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const domainSep_0 = args_1[1];
        const address_0 = args_1[2];
        const amount_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintUnshieldedToUserTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 16 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(domainSep_0.buffer instanceof ArrayBuffer && domainSep_0.BYTES_PER_ELEMENT === 1 && domainSep_0.length === 32)) {
          __compactRuntime.typeError('mintUnshieldedToUserTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 16 char 1',
                                     'Bytes<32>',
                                     domainSep_0)
        }
        if (!(typeof(address_0) === 'object' && address_0.bytes.buffer instanceof ArrayBuffer && address_0.bytes.BYTES_PER_ELEMENT === 1 && address_0.bytes.length === 32)) {
          __compactRuntime.typeError('mintUnshieldedToUserTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 16 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     address_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('mintUnshieldedToUserTest',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'unshielded.compact line 16 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(domainSep_0).concat(_descriptor_4.toValue(address_0).concat(_descriptor_0.toValue(amount_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._mintUnshieldedToUserTest_0(context,
                                                          partialProofData,
                                                          domainSep_0,
                                                          address_0,
                                                          amount_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      sendUnshieldedToSelfTest: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`sendUnshieldedToSelfTest: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('sendUnshieldedToSelfTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 20 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('sendUnshieldedToSelfTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 20 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('sendUnshieldedToSelfTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 20 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0).concat(_descriptor_6.toValue(amount_0)),
            alignment: _descriptor_2.alignment().concat(_descriptor_6.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._sendUnshieldedToSelfTest_0(context,
                                                          partialProofData,
                                                          color_0,
                                                          amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      sendUnshieldedToContractTest: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`sendUnshieldedToContractTest: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        const address_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('sendUnshieldedToContractTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 24 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('sendUnshieldedToContractTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 24 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('sendUnshieldedToContractTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 24 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(address_0) === 'object' && address_0.bytes.buffer instanceof ArrayBuffer && address_0.bytes.BYTES_PER_ELEMENT === 1 && address_0.bytes.length === 32)) {
          __compactRuntime.typeError('sendUnshieldedToContractTest',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'unshielded.compact line 24 char 1',
                                     'struct ContractAddress<bytes: Bytes<32>>',
                                     address_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0).concat(_descriptor_6.toValue(amount_0).concat(_descriptor_3.toValue(address_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_6.alignment().concat(_descriptor_3.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._sendUnshieldedToContractTest_0(context,
                                                              partialProofData,
                                                              color_0,
                                                              amount_0,
                                                              address_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      sendUnshieldedToUserTest: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`sendUnshieldedToUserTest: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        const address_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('sendUnshieldedToUserTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 28 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('sendUnshieldedToUserTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 28 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('sendUnshieldedToUserTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 28 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(address_0) === 'object' && address_0.bytes.buffer instanceof ArrayBuffer && address_0.bytes.BYTES_PER_ELEMENT === 1 && address_0.bytes.length === 32)) {
          __compactRuntime.typeError('sendUnshieldedToUserTest',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'unshielded.compact line 28 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     address_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0).concat(_descriptor_6.toValue(amount_0).concat(_descriptor_4.toValue(address_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_6.alignment().concat(_descriptor_4.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._sendUnshieldedToUserTest_0(context,
                                                          partialProofData,
                                                          color_0,
                                                          amount_0,
                                                          address_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      receiveUnshieldedTest: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`receiveUnshieldedTest: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('receiveUnshieldedTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 32 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('receiveUnshieldedTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 32 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('receiveUnshieldedTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 32 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0).concat(_descriptor_6.toValue(amount_0)),
            alignment: _descriptor_2.alignment().concat(_descriptor_6.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._receiveUnshieldedTest_0(context,
                                                       partialProofData,
                                                       color_0,
                                                       amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getUnshieldedBalanceTest: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`getUnshieldedBalanceTest: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getUnshieldedBalanceTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 36 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('getUnshieldedBalanceTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 36 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0),
            alignment: _descriptor_2.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getUnshieldedBalanceTest_0(context,
                                                          partialProofData,
                                                          color_0);
        partialProofData.output = { value: _descriptor_6.toValue(result_0), alignment: _descriptor_6.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getUnshieldedBalanceGtTest: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`getUnshieldedBalanceGtTest: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getUnshieldedBalanceGtTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 40 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('getUnshieldedBalanceGtTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 40 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('getUnshieldedBalanceGtTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 40 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0).concat(_descriptor_6.toValue(amount_0)),
            alignment: _descriptor_2.alignment().concat(_descriptor_6.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getUnshieldedBalanceGtTest_0(context,
                                                            partialProofData,
                                                            color_0,
                                                            amount_0);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getUnshieldedBalanceLtTest: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`getUnshieldedBalanceLtTest: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getUnshieldedBalanceLtTest',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 44 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('getUnshieldedBalanceLtTest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 44 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('getUnshieldedBalanceLtTest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 44 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(color_0).concat(_descriptor_6.toValue(amount_0)),
            alignment: _descriptor_2.alignment().concat(_descriptor_6.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getUnshieldedBalanceLtTest_0(context,
                                                            partialProofData,
                                                            color_0,
                                                            amount_0);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      receiveNightTokens: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`receiveNightTokens: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('receiveNightTokens',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 48 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('receiveNightTokens',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 48 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_6.toValue(amount_0),
            alignment: _descriptor_6.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._receiveNightTokens_0(context,
                                                    partialProofData,
                                                    amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      sendNightTokensToUser: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`sendNightTokensToUser: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const user_addr_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('sendNightTokensToUser',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 52 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('sendNightTokensToUser',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 52 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        if (!(typeof(user_addr_0) === 'object' && user_addr_0.bytes.buffer instanceof ArrayBuffer && user_addr_0.bytes.BYTES_PER_ELEMENT === 1 && user_addr_0.bytes.length === 32)) {
          __compactRuntime.typeError('sendNightTokensToUser',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 52 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     user_addr_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_4.toValue(user_addr_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_4.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._sendNightTokensToUser_0(context,
                                                       partialProofData,
                                                       amount_0,
                                                       user_addr_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      sendNightTokensToRecipient: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`sendNightTokensToRecipient: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const recipient_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('sendNightTokensToRecipient',
                                     'argument 1 (as invoked from Typescript)',
                                     'unshielded.compact line 60 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('sendNightTokensToRecipient',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'unshielded.compact line 60 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        if (!(typeof(recipient_0) === 'object' && typeof(recipient_0.is_left) === 'boolean' && typeof(recipient_0.left) === 'object' && recipient_0.left.bytes.buffer instanceof ArrayBuffer && recipient_0.left.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.left.bytes.length === 32 && typeof(recipient_0.right) === 'object' && recipient_0.right.bytes.buffer instanceof ArrayBuffer && recipient_0.right.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.right.bytes.length === 32)) {
          __compactRuntime.typeError('sendNightTokensToRecipient',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'unshielded.compact line 60 char 1',
                                     'struct Either<is_left: Boolean, left: struct ContractAddress<bytes: Bytes<32>>, right: struct UserAddress<bytes: Bytes<32>>>',
                                     recipient_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_5.toValue(recipient_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_5.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._sendNightTokensToRecipient_0(context,
                                                            partialProofData,
                                                            amount_0,
                                                            recipient_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      mintUnshieldedToSelfTest: this.circuits.mintUnshieldedToSelfTest,
      mintUnshieldedToContractTest: this.circuits.mintUnshieldedToContractTest,
      mintUnshieldedToUserTest: this.circuits.mintUnshieldedToUserTest,
      sendUnshieldedToSelfTest: this.circuits.sendUnshieldedToSelfTest,
      sendUnshieldedToContractTest: this.circuits.sendUnshieldedToContractTest,
      sendUnshieldedToUserTest: this.circuits.sendUnshieldedToUserTest,
      receiveUnshieldedTest: this.circuits.receiveUnshieldedTest,
      getUnshieldedBalanceTest: this.circuits.getUnshieldedBalanceTest,
      getUnshieldedBalanceGtTest: this.circuits.getUnshieldedBalanceGtTest,
      getUnshieldedBalanceLtTest: this.circuits.getUnshieldedBalanceLtTest,
      receiveNightTokens: this.circuits.receiveNightTokens,
      sendNightTokensToUser: this.circuits.sendNightTokensToUser,
      sendNightTokensToRecipient: this.circuits.sendNightTokensToRecipient
    };
    this.provableCircuits = {
      mintUnshieldedToSelfTest: this.circuits.mintUnshieldedToSelfTest,
      mintUnshieldedToContractTest: this.circuits.mintUnshieldedToContractTest,
      mintUnshieldedToUserTest: this.circuits.mintUnshieldedToUserTest,
      sendUnshieldedToSelfTest: this.circuits.sendUnshieldedToSelfTest,
      sendUnshieldedToContractTest: this.circuits.sendUnshieldedToContractTest,
      sendUnshieldedToUserTest: this.circuits.sendUnshieldedToUserTest,
      receiveUnshieldedTest: this.circuits.receiveUnshieldedTest,
      getUnshieldedBalanceTest: this.circuits.getUnshieldedBalanceTest,
      getUnshieldedBalanceGtTest: this.circuits.getUnshieldedBalanceGtTest,
      getUnshieldedBalanceLtTest: this.circuits.getUnshieldedBalanceLtTest,
      receiveNightTokens: this.circuits.receiveNightTokens,
      sendNightTokensToUser: this.circuits.sendNightTokensToUser,
      sendNightTokensToRecipient: this.circuits.sendNightTokensToRecipient
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
    state_0.setOperation('mintUnshieldedToSelfTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('mintUnshieldedToContractTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('mintUnshieldedToUserTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('sendUnshieldedToSelfTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('sendUnshieldedToContractTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('sendUnshieldedToUserTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('receiveUnshieldedTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('getUnshieldedBalanceTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('getUnshieldedBalanceGtTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('getUnshieldedBalanceLtTest', new __compactRuntime.ContractOperation());
    state_0.setOperation('receiveNightTokens', new __compactRuntime.ContractOperation());
    state_0.setOperation('sendNightTokensToUser', new __compactRuntime.ContractOperation());
    state_0.setOperation('sendNightTokensToRecipient', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _left_1(value_0) {
    return { is_left: true, left: value_0, right: new Uint8Array(32) };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _nativeToken_0() {
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }
  _tokenType_0(domain_sep_0, contractAddress_0) {
    return this._persistentCommit_0([domain_sep_0, contractAddress_0.bytes],
                                    new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 100, 101, 114, 105, 118, 101, 95, 116, 111, 107, 101, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  }
  _mintUnshieldedToken_0(context,
                         partialProofData,
                         domainSep_0,
                         amount_0,
                         recipient_0)
  {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_9.toValue(5n),
                                                                  alignment: _descriptor_9.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(domainSep_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amount_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    const color_0 = this._tokenType_0(domainSep_0,
                                      _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_9.toValue(0n),
                                                                                                                            alignment: _descriptor_9.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    const tmp_0 = this._left_1(color_0);
    const tmp_1 = amount_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_9.toValue(8n),
                                                                  alignment: _descriptor_9.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_7.toValue(tmp_0),
                                                                                                alignment: _descriptor_7.alignment() },
                                                                                              { value: _descriptor_5.toValue(recipient_0),
                                                                                                alignment: _descriptor_5.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_1),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (recipient_0.is_left
        &&
        this._equal_0(recipient_0.left.bytes,
                      _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_9.toValue(0n),
                                                                                                            alignment: _descriptor_9.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_1(color_0);
      const tmp_3 = amount_0;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_9.toValue(6n),
                                                                    alignment: _descriptor_9.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_2),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_3),
                                                                                                alignment: _descriptor_6.alignment() }).encode() } },
                                         { swap: { n: 0 } },
                                         'neg',
                                         { branch: { skip: 4 } },
                                         { dup: { n: 2 } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: true,
                                                  pushPath: false,
                                                  path: [ { tag: 'stack' }] } },
                                         'add',
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return color_0;
  }
  _sendUnshielded_0(context, partialProofData, color_0, amount_0, recipient_0) {
    const tmp_0 = this._left_1(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_9.toValue(7n),
                                                                  alignment: _descriptor_9.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    const tmp_1 = this._left_1(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_9.toValue(8n),
                                                                  alignment: _descriptor_9.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_7.toValue(tmp_1),
                                                                                                alignment: _descriptor_7.alignment() },
                                                                                              { value: _descriptor_5.toValue(recipient_0),
                                                                                                alignment: _descriptor_5.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (recipient_0.is_left
        &&
        this._equal_1(recipient_0.left.bytes,
                      _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_9.toValue(0n),
                                                                                                            alignment: _descriptor_9.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_1(color_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_9.toValue(6n),
                                                                    alignment: _descriptor_9.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_2),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                                alignment: _descriptor_6.alignment() }).encode() } },
                                         { swap: { n: 0 } },
                                         'neg',
                                         { branch: { skip: 4 } },
                                         { dup: { n: 2 } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: true,
                                                  pushPath: false,
                                                  path: [ { tag: 'stack' }] } },
                                         'add',
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return [];
  }
  _receiveUnshielded_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_1(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_9.toValue(6n),
                                                                  alignment: _descriptor_9.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _unshieldedBalance_0(context, partialProofData, color_0) {
    const tmp_0 = this._left_1(color_0);
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_9.toValue(5n),
                                                                                                 alignment: _descriptor_9.alignment() } }] } },
                                                                      { dup: { n: 0 } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                                                             alignment: _descriptor_7.alignment() }).encode() } },
                                                                      'member',
                                                                      { branch: { skip: 3 } },
                                                                      'pop',
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                             alignment: _descriptor_6.alignment() }).encode() } },
                                                                      { jmp: { skip: 1 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(tmp_0),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _unshieldedBalanceLt_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_1(color_0);
    return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_9.toValue(5n),
                                                                                                 alignment: _descriptor_9.alignment() } }] } },
                                                                      { dup: { n: 0 } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                                                             alignment: _descriptor_7.alignment() }).encode() } },
                                                                      'member',
                                                                      { branch: { skip: 3 } },
                                                                      'pop',
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                             alignment: _descriptor_6.alignment() }).encode() } },
                                                                      { jmp: { skip: 1 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(tmp_0),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                                                             alignment: _descriptor_6.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _unshieldedBalanceGt_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_1(color_0);
    return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                                                             alignment: _descriptor_6.alignment() }).encode() } },
                                                                      { dup: { n: 3 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_9.toValue(5n),
                                                                                                 alignment: _descriptor_9.alignment() } }] } },
                                                                      { dup: { n: 0 } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                                                             alignment: _descriptor_7.alignment() }).encode() } },
                                                                      'member',
                                                                      { branch: { skip: 3 } },
                                                                      'pop',
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                             alignment: _descriptor_6.alignment() }).encode() } },
                                                                      { jmp: { skip: 1 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(tmp_0),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_8,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _mintUnshieldedToSelfTest_0(context, partialProofData, domainSep_0, amount_0)
  {
    const color_0 = this._mintUnshieldedToken_0(context,
                                                partialProofData,
                                                domainSep_0,
                                                amount_0,
                                                this._left_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 2 } },
                                                                                                                        { idx: { cached: true,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_9.toValue(0n),
                                                                                                                                                   alignment: _descriptor_9.alignment() } }] } },
                                                                                                                        { popeq: { cached: true,
                                                                                                                                   result: undefined } }]).value)));
    return color_0;
  }
  _mintUnshieldedToContractTest_0(context,
                                  partialProofData,
                                  domainSep_0,
                                  address_0,
                                  amount_0)
  {
    const color_0 = this._mintUnshieldedToken_0(context,
                                                partialProofData,
                                                domainSep_0,
                                                amount_0,
                                                this._left_0(address_0));
    if (!this._equal_2(address_0,
                       _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 2 } },
                                                                                  { idx: { cached: true,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_9.toValue(0n),
                                                                                                             alignment: _descriptor_9.alignment() } }] } },
                                                                                  { popeq: { cached: true,
                                                                                             result: undefined } }]).value)))
    {
      this._receiveUnshielded_0(context, partialProofData, color_0, amount_0);
    }
    return color_0;
  }
  _mintUnshieldedToUserTest_0(context,
                              partialProofData,
                              domainSep_0,
                              address_0,
                              amount_0)
  {
    return this._mintUnshieldedToken_0(context,
                                       partialProofData,
                                       domainSep_0,
                                       amount_0,
                                       this._right_0(address_0));
  }
  _sendUnshieldedToSelfTest_0(context, partialProofData, color_0, amount_0) {
    this._sendUnshielded_0(context,
                           partialProofData,
                           color_0,
                           amount_0,
                           this._left_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                  partialProofData,
                                                                                                  [
                                                                                                   { dup: { n: 2 } },
                                                                                                   { idx: { cached: true,
                                                                                                            pushPath: false,
                                                                                                            path: [
                                                                                                                   { tag: 'value',
                                                                                                                     value: { value: _descriptor_9.toValue(0n),
                                                                                                                              alignment: _descriptor_9.alignment() } }] } },
                                                                                                   { popeq: { cached: true,
                                                                                                              result: undefined } }]).value)));
    return [];
  }
  _sendUnshieldedToContractTest_0(context,
                                  partialProofData,
                                  color_0,
                                  amount_0,
                                  address_0)
  {
    this._sendUnshielded_0(context,
                           partialProofData,
                           color_0,
                           amount_0,
                           this._left_0(address_0));
    return [];
  }
  _sendUnshieldedToUserTest_0(context,
                              partialProofData,
                              color_0,
                              amount_0,
                              address_0)
  {
    this._sendUnshielded_0(context,
                           partialProofData,
                           color_0,
                           amount_0,
                           this._right_0(address_0));
    return [];
  }
  _receiveUnshieldedTest_0(context, partialProofData, color_0, amount_0) {
    this._receiveUnshielded_0(context, partialProofData, color_0, amount_0);
    return [];
  }
  _getUnshieldedBalanceTest_0(context, partialProofData, color_0) {
    return this._unshieldedBalance_0(context, partialProofData, color_0);
  }
  _getUnshieldedBalanceGtTest_0(context, partialProofData, color_0, amount_0) {
    return this._unshieldedBalanceGt_0(context,
                                       partialProofData,
                                       color_0,
                                       amount_0);
  }
  _getUnshieldedBalanceLtTest_0(context, partialProofData, color_0, amount_0) {
    return this._unshieldedBalanceLt_0(context,
                                       partialProofData,
                                       color_0,
                                       amount_0);
  }
  _receiveNightTokens_0(context, partialProofData, amount_0) {
    this._receiveUnshielded_0(context,
                              partialProofData,
                              new Uint8Array(32),
                              amount_0);
    return [];
  }
  _sendNightTokensToUser_0(context, partialProofData, amount_0, user_addr_0) {
    this._sendUnshielded_0(context,
                           partialProofData,
                           new Uint8Array(32),
                           amount_0,
                           this._right_0(user_addr_0));
    return [];
  }
  _sendNightTokensToRecipient_0(context, partialProofData, amount_0, recipient_0)
  {
    this._sendUnshielded_0(context,
                           partialProofData,
                           this._nativeToken_0(),
                           amount_0,
                           recipient_0);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
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
