import { Effect, Types } from 'effect';
import type { CompiledContract } from '../CompiledContract';
import { Contract } from '../Contract';
import type * as CompactContext from '../CompactContext';

/** @internal */
export const CompactContextId = Symbol();
/** @internal */
export type CompactContextId = typeof CompactContextId;

/** @internal */
export interface Context<C extends Contract.Any>
  extends CompactContext.Witnesses<C>,
    CompactContext.ZKConfigAssetsPath {
  readonly tag: string;
  readonly ctor: Types.Ctor<C>;
}

/** @internal */
export const getContractContext: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS>
) => Types.Simplify<Required<Context<C>>> = <C extends Contract<PS>, PS>(compiledContract: CompiledContract<C, PS>) =>
  compiledContract[CompactContextId] as Required<Context<C>>;

/** @internal */
export const createContract: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS>
) => Effect.Effect<C> = <C extends Contract<PS>, PS>(compiledContract: CompiledContract<C, PS>) =>
  Effect.sync(() => {
    const context = getContractContext(compiledContract);

    if (!context.ctor) throw new Error('Invalid CompactContext (missing constructor)');
    return new context.ctor(context.witnesses);
  });
