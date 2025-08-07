import { CompiledContract, ContractExecutable, type Contract } from '@midnight-ntwrk/compact-js/effect';
import { Contract as C_ } from '../../../../compact-js/test/contract/managed/counter/contract/index.cjs';

type PrivateState = undefined;

type CounterContract = C_<PrivateState>;
const CounterContract = C_;

const witnesses: Contract.Contract.Witnesses<CounterContract> = {
  private_increment: ({ privateState }) => [privateState, []]
}

const createInitialPrivateState: () => PrivateState = () => undefined;

export default {
  contractExecutable: CompiledContract.make<CounterContract>('CounterContract', CounterContract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withZKConfigFileAssets('../../../../compact-js/test/contract/managed/counter'),
    ContractExecutable.make
  ),
  createInitialPrivateState,
  config: {
    keys: {
      coinPublic: 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79',
    },
    network: 'undeployed'
  }
}
