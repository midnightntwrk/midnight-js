import { Effect, Types } from 'effect';
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
export const makeContractInstance: <C extends Contract.Any>(context: Partial<Context<C>>) => Effect.Effect<C> = (
  context
) =>
  Effect.sync(() => {
    if (!context.ctor) throw new Error('Invalid CompactContext (missing constructor)');

    return new context.ctor(context.witnesses);
  });
