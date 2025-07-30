import { Contract } from './managed/counter/contract/index.cjs';

type CounterPrivateState = {
  count: number;
};

export type CounterContract = Contract<CounterPrivateState>;
export const CounterContract = Contract;
