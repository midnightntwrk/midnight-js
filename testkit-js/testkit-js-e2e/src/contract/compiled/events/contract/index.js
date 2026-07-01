import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.18.0-rc.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(113);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(0);

const _descriptor_4 = new __compactRuntime.CompactTypeBytes(145);

const _descriptor_5 = new __compactRuntime.CompactTypeBytes(80);

const _descriptor_6 = new __compactRuntime.CompactTypeBytes(49);

const _descriptor_7 = new __compactRuntime.CompactTypeBytes(578);

const _descriptor_8 = new __compactRuntime.CompactTypeBytes(81);

const _descriptor_9 = new __compactRuntime.CompactTypeBytes(288);

const _descriptor_10 = new __compactRuntime.CompactTypeBytes(256);

const _descriptor_11 = __compactRuntime.CompactTypeBoolean;

class _Maybe_0 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_1.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_11.fromValue(value_0),
      value: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_some).concat(_descriptor_1.toValue(value_0.value));
  }
}

const _descriptor_12 = new _Maybe_0();

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_13 = new _ZswapCoinPublicKey_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_14 = new _ContractAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_13.alignment().concat(_descriptor_14.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_11.fromValue(value_0),
      left: _descriptor_13.fromValue(value_0),
      right: _descriptor_14.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_left).concat(_descriptor_13.toValue(value_0.left).concat(_descriptor_14.toValue(value_0.right)));
  }
}

const _descriptor_15 = new _Either_0();

class _Maybe_1 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_2.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_11.fromValue(value_0),
      value: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_some).concat(_descriptor_2.toValue(value_0.value));
  }
}

const _descriptor_16 = new _Maybe_1();

const _descriptor_17 = new __compactRuntime.CompactTypeBytes(512);

class _Maybe_2 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_17.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_11.fromValue(value_0),
      value: _descriptor_17.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_some).concat(_descriptor_17.toValue(value_0.value));
  }
}

const _descriptor_18 = new _Maybe_2();

const _descriptor_19 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_1 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_11.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_20 = new _Either_1();

const _descriptor_21 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_22 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

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
      emitMisc: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`emitMisc: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const name_0 = args_1[1];
        const payload_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitMisc',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 3 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(name_0.buffer instanceof ArrayBuffer && name_0.BYTES_PER_ELEMENT === 1 && name_0.length === 32)) {
          __compactRuntime.typeError('emitMisc',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 3 char 1',
                                     'Bytes<32>',
                                     name_0)
        }
        if (!(payload_0.buffer instanceof ArrayBuffer && payload_0.BYTES_PER_ELEMENT === 1 && payload_0.length === 256)) {
          __compactRuntime.typeError('emitMisc',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'events.compact line 3 char 1',
                                     'Bytes<256>',
                                     payload_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(name_0).concat(_descriptor_10.toValue(payload_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_10.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitMisc_0(context,
                                                partialProofData,
                                                name_0,
                                                payload_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitShieldedSpend: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`emitShieldedSpend: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const nullifier_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitShieldedSpend',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 7 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(nullifier_0.buffer instanceof ArrayBuffer && nullifier_0.BYTES_PER_ELEMENT === 1 && nullifier_0.length === 32)) {
          __compactRuntime.typeError('emitShieldedSpend',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 7 char 1',
                                     'Bytes<32>',
                                     nullifier_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(nullifier_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitShieldedSpend_0(context,
                                                         partialProofData,
                                                         nullifier_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitShieldedReceive: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`emitShieldedReceive: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const commitment_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitShieldedReceive',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 11 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(commitment_0.buffer instanceof ArrayBuffer && commitment_0.BYTES_PER_ELEMENT === 1 && commitment_0.length === 32)) {
          __compactRuntime.typeError('emitShieldedReceive',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 11 char 1',
                                     'Bytes<32>',
                                     commitment_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(commitment_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitShieldedReceive_0(context,
                                                           partialProofData,
                                                           commitment_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitShieldedMint: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`emitShieldedMint: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const commitment_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitShieldedMint',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 19 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(commitment_0.buffer instanceof ArrayBuffer && commitment_0.BYTES_PER_ELEMENT === 1 && commitment_0.length === 32)) {
          __compactRuntime.typeError('emitShieldedMint',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 19 char 1',
                                     'Bytes<32>',
                                     commitment_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(commitment_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitShieldedMint_0(context,
                                                        partialProofData,
                                                        commitment_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitShieldedBurn: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`emitShieldedBurn: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const nullifier_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitShieldedBurn',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 27 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(nullifier_0.buffer instanceof ArrayBuffer && nullifier_0.BYTES_PER_ELEMENT === 1 && nullifier_0.length === 32)) {
          __compactRuntime.typeError('emitShieldedBurn',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 27 char 1',
                                     'Bytes<32>',
                                     nullifier_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(nullifier_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitShieldedBurn_0(context,
                                                        partialProofData,
                                                        nullifier_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitUnshieldedSpend: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`emitUnshieldedSpend: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const tokenType_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitUnshieldedSpend',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 34 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(tokenType_0.buffer instanceof ArrayBuffer && tokenType_0.BYTES_PER_ELEMENT === 1 && tokenType_0.length === 32)) {
          __compactRuntime.typeError('emitUnshieldedSpend',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 34 char 1',
                                     'Bytes<32>',
                                     tokenType_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('emitUnshieldedSpend',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'events.compact line 34 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(tokenType_0).concat(_descriptor_2.toValue(amount_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_2.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitUnshieldedSpend_0(context,
                                                           partialProofData,
                                                           tokenType_0,
                                                           amount_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitUnshieldedReceive: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`emitUnshieldedReceive: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const tokenType_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitUnshieldedReceive',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 39 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(tokenType_0.buffer instanceof ArrayBuffer && tokenType_0.BYTES_PER_ELEMENT === 1 && tokenType_0.length === 32)) {
          __compactRuntime.typeError('emitUnshieldedReceive',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 39 char 1',
                                     'Bytes<32>',
                                     tokenType_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('emitUnshieldedReceive',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'events.compact line 39 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(tokenType_0).concat(_descriptor_2.toValue(amount_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_2.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitUnshieldedReceive_0(context,
                                                             partialProofData,
                                                             tokenType_0,
                                                             amount_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitUnshieldedMint: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`emitUnshieldedMint: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const tokenType_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitUnshieldedMint',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 44 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(tokenType_0.buffer instanceof ArrayBuffer && tokenType_0.BYTES_PER_ELEMENT === 1 && tokenType_0.length === 32)) {
          __compactRuntime.typeError('emitUnshieldedMint',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 44 char 1',
                                     'Bytes<32>',
                                     tokenType_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('emitUnshieldedMint',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'events.compact line 44 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(tokenType_0).concat(_descriptor_2.toValue(amount_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_2.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitUnshieldedMint_0(context,
                                                          partialProofData,
                                                          tokenType_0,
                                                          amount_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitUnshieldedBurn: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`emitUnshieldedBurn: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const tokenType_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitUnshieldedBurn',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 48 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(tokenType_0.buffer instanceof ArrayBuffer && tokenType_0.BYTES_PER_ELEMENT === 1 && tokenType_0.length === 32)) {
          __compactRuntime.typeError('emitUnshieldedBurn',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'events.compact line 48 char 1',
                                     'Bytes<32>',
                                     tokenType_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('emitUnshieldedBurn',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'events.compact line 48 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(tokenType_0).concat(_descriptor_2.toValue(amount_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_2.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitUnshieldedBurn_0(context,
                                                          partialProofData,
                                                          tokenType_0,
                                                          amount_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      emitLifecycle: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`emitLifecycle: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('emitLifecycle',
                                     'argument 1 (as invoked from Typescript)',
                                     'events.compact line 53 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._emitLifecycle_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      emitMisc: this.circuits.emitMisc,
      emitShieldedSpend: this.circuits.emitShieldedSpend,
      emitShieldedReceive: this.circuits.emitShieldedReceive,
      emitShieldedMint: this.circuits.emitShieldedMint,
      emitShieldedBurn: this.circuits.emitShieldedBurn,
      emitUnshieldedSpend: this.circuits.emitUnshieldedSpend,
      emitUnshieldedReceive: this.circuits.emitUnshieldedReceive,
      emitUnshieldedMint: this.circuits.emitUnshieldedMint,
      emitUnshieldedBurn: this.circuits.emitUnshieldedBurn,
      emitLifecycle: this.circuits.emitLifecycle
    };
    this.provableCircuits = {
      emitMisc: this.circuits.emitMisc,
      emitShieldedSpend: this.circuits.emitShieldedSpend,
      emitShieldedReceive: this.circuits.emitShieldedReceive,
      emitShieldedMint: this.circuits.emitShieldedMint,
      emitShieldedBurn: this.circuits.emitShieldedBurn,
      emitUnshieldedSpend: this.circuits.emitUnshieldedSpend,
      emitUnshieldedReceive: this.circuits.emitUnshieldedReceive,
      emitUnshieldedMint: this.circuits.emitUnshieldedMint,
      emitUnshieldedBurn: this.circuits.emitUnshieldedBurn,
      emitLifecycle: this.circuits.emitLifecycle
    };
  }
  async initialState(...args_0) {
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
    state_0.setOperation('emitMisc', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitShieldedSpend', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitShieldedReceive', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitShieldedMint', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitShieldedBurn', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitUnshieldedSpend', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitUnshieldedReceive', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitUnshieldedMint', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitUnshieldedBurn', new __compactRuntime.ContractOperation());
    state_0.setOperation('emitLifecycle', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext('constructor', __compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  _some_0(value_0) { return { is_some: true, value: value_0 }; }
  _none_0() { return { is_some: false, value: new Uint8Array(512) }; }
  _none_1() { return { is_some: false, value: new Uint8Array(32) }; }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  async _emitMisc_0(context, partialProofData, name_0, payload_0) {
    let t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                       name_0,
                                                                                                                                                                                                                                                                                                                                     payload:
                                                                                                                                                                                                                                                                                                                                       payload_0 },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_9.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitShieldedSpend_0(context, partialProofData, nullifier_0) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(0n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ nullifier:
                                                                                                                                                                                                                                                                                                                                nullifier_0 }.nullifier),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_1.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitShieldedReceive_0(context, partialProofData, commitment_0) {
    let t_1, t_2, t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(1n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue((t_1 = { commitment:
                                                                                                                                                                                                                                                                                                                                       commitment_0,
                                                                                                                                                                                                                                                                                                                                     contractAddress:
                                                                                                                                                                                                                                                                                                                                       this._none_1(),
                                                                                                                                                                                                                                                                                                                                     ciphertext:
                                                                                                                                                                                                                                                                                                                                       this._none_0() },
                                                                                                                                                                                                                                                                                                                             t_2 = t_1.contractAddress,
                                                                                                                                                                                                                                                                                                                             t_0 = t_1.ciphertext,
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_1.commitment,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              t_2.is_some
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_2.value,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              t_0.is_some
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.value,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_7.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitShieldedMint_0(context, partialProofData, commitment_0) {
    let t_0, t_1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(2n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue((t_0 = { commitment:
                                                                                                                                                                                                                                                                                                                                       commitment_0,
                                                                                                                                                                                                                                                                                                                                     domainSep:
                                                                                                                                                                                                                                                                                                                                       new Uint8Array(32),
                                                                                                                                                                                                                                                                                                                                     amount:
                                                                                                                                                                                                                                                                                                                                       this._some_0(1n) },
                                                                                                                                                                                                                                                                                                                             t_1 = t_0.amount,
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.commitment,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.domainSep,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              t_1.is_some
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(__compactRuntime.convertBigintToBytes(16,
                                                                                                                                                                                                                                                                                                                                                                                                  t_1.value,
                                                                                                                                                                                                                                                                                                                                                                                                  'events.compact line 20 char 3'),
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_8.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitShieldedBurn_0(context, partialProofData, nullifier_0) {
    let t_0, t_1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(3n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue((t_0 = { nullifier:
                                                                                                                                                                                                                                                                                                                                       nullifier_0,
                                                                                                                                                                                                                                                                                                                                     amount:
                                                                                                                                                                                                                                                                                                                                       this._some_0(1n) },
                                                                                                                                                                                                                                                                                                                             t_1 = t_0.amount,
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.nullifier,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              t_1.is_some
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(__compactRuntime.convertBigintToBytes(16,
                                                                                                                                                                                                                                                                                                                                                                                                  t_1.value,
                                                                                                                                                                                                                                                                                                                                                                                                  'events.compact line 28 char 3'),
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_6.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitUnshieldedSpend_0(context, partialProofData, tokenType_0, amount_0)
  {
    const sender_0 = this._left_0({ bytes: new Uint8Array(32) });
    let t_0, t_1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(4n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue((t_0 = { sender:
                                                                                                                                                                                                                                                                                                                                       sender_0,
                                                                                                                                                                                                                                                                                                                                     domainSep:
                                                                                                                                                                                                                                                                                                                                       new Uint8Array(32),
                                                                                                                                                                                                                                                                                                                                     tokenType:
                                                                                                                                                                                                                                                                                                                                       tokenType_0,
                                                                                                                                                                                                                                                                                                                                     amount:
                                                                                                                                                                                                                                                                                                                                       amount_0 },
                                                                                                                                                                                                                                                                                                                             t_1 = t_0.sender,
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([t_1.is_left
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_1.left.bytes,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_1.right.bytes,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.domainSep,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.tokenType,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(__compactRuntime.convertBigintToBytes(16,
                                                                                                                                                                                                                                                                                                                                                                                                  t_0.amount,
                                                                                                                                                                                                                                                                                                                                                                                                  'events.compact line 36 char 3'),
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_4.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitUnshieldedReceive_0(context,
                                 partialProofData,
                                 tokenType_0,
                                 amount_0)
  {
    const recipient_0 = this._left_0({ bytes: new Uint8Array(32) });
    let t_0, t_1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(5n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue((t_0 = { recipient:
                                                                                                                                                                                                                                                                                                                                       recipient_0,
                                                                                                                                                                                                                                                                                                                                     domainSep:
                                                                                                                                                                                                                                                                                                                                       new Uint8Array(32),
                                                                                                                                                                                                                                                                                                                                     tokenType:
                                                                                                                                                                                                                                                                                                                                       tokenType_0,
                                                                                                                                                                                                                                                                                                                                     amount:
                                                                                                                                                                                                                                                                                                                                       amount_0 },
                                                                                                                                                                                                                                                                                                                             t_1 = t_0.recipient,
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([t_1.is_left
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_1.left.bytes,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_1.right.bytes,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.domainSep,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.tokenType,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(__compactRuntime.convertBigintToBytes(16,
                                                                                                                                                                                                                                                                                                                                                                                                  t_0.amount,
                                                                                                                                                                                                                                                                                                                                                                                                  'events.compact line 41 char 3'),
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_4.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitUnshieldedMint_0(context, partialProofData, tokenType_0, amount_0)
  {
    let t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(6n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue((t_0 = { domainSep:
                                                                                                                                                                                                                                                                                                                                       new Uint8Array(32),
                                                                                                                                                                                                                                                                                                                                     tokenType:
                                                                                                                                                                                                                                                                                                                                       tokenType_0,
                                                                                                                                                                                                                                                                                                                                     amount:
                                                                                                                                                                                                                                                                                                                                       amount_0 },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.domainSep,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.tokenType,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(__compactRuntime.convertBigintToBytes(16,
                                                                                                                                                                                                                                                                                                                                                                                                  t_0.amount,
                                                                                                                                                                                                                                                                                                                                                                                                  'events.compact line 45 char 3'),
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_5.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitUnshieldedBurn_0(context, partialProofData, tokenType_0, amount_0)
  {
    const sender_0 = this._left_0({ bytes: new Uint8Array(32) });
    let t_0, t_1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(7n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue((t_0 = { sender:
                                                                                                                                                                                                                                                                                                                                       sender_0,
                                                                                                                                                                                                                                                                                                                                     tokenType:
                                                                                                                                                                                                                                                                                                                                       tokenType_0,
                                                                                                                                                                                                                                                                                                                                     amount:
                                                                                                                                                                                                                                                                                                                                       amount_0 },
                                                                                                                                                                                                                                                                                                                             t_1 = t_0.sender,
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([t_1.is_left
                                                                                                                                                                                                                                                                                                                                              ?
                                                                                                                                                                                                                                                                                                                                              1n
                                                                                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                                                                                              0n,
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_1.left.bytes,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_1.right.bytes,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.tokenType,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(__compactRuntime.convertBigintToBytes(16,
                                                                                                                                                                                                                                                                                                                                                                                                  t_0.amount,
                                                                                                                                                                                                                                                                                                                                                                                                  'events.compact line 50 char 3'),
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_0.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitLifecycle_0(context, partialProofData) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(8n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(new Uint8Array([])),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_3.alignment() }))
                                                          .encode() } },
                                       'log']);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(1n),
                                                                                                           alignment: _descriptor_22.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_21.toValue(9n),
                                                                                                                                                                                                     alignment: _descriptor_21.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(new Uint8Array([])),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_3.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
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
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
export const expectedVk = {
  'emitLifecycle': 'c243f9e5f77e653549df88e04de684597303b4340e594b38d1d64275c3a9719d',
  'emitMisc': 'cca8c6279dc27634bd6fcdcf0d00e2b880d8f5fe8311baddb04747995ce3ef8e',
  'emitShieldedBurn': '97ebabd1eb4655f268d8d8802bda094742801030eabaf61404e5a26b10f92410',
  'emitShieldedMint': '08b2ab2081e5a04ab81bb5e31d46a55953c7b50c511689e19eb253dc9ac8ac97',
  'emitShieldedReceive': 'd5a764706a54c383d57db1d45d0b20fd31d700342830fbb5aa014eff263ef1f1',
  'emitShieldedSpend': '1630e831ae178f7f35792447792b5d698bbe6d58401386019c74203b44d0ba60',
  'emitUnshieldedBurn': 'b41549697f188152436a59657183ec4ca162fdccdb6c1b1a715b3033c689bcb9',
  'emitUnshieldedMint': 'edcfd323226a9f1459448830af37cbaaa4a97875466f36972fa743efc0ecf163',
  'emitUnshieldedReceive': '07d3cbbe44cab6680798420c7c85cba4b1779211724f3ff347e59e448092804d',
  'emitUnshieldedSpend': 'f7f4dfe824f3173ccb7ad28e20421f7b8a134b097d98f10e9f153a67cbb078e2',
};

//# sourceMappingURL=index.js.map
