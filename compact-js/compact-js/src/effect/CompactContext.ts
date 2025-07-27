import { Contract } from './Contract';

export type Witnesses<in C extends Contract.Any, W = Contract.Witnesses<C>> = {
  readonly witnesses: W;
};

export type ZKConfigAssetsPath = {
  readonly zkConfigAssetsPath: string;
};
