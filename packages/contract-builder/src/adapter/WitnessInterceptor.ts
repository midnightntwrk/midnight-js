import { WitnessExecutionError } from '../errors/WitnessError.js';
import type { Logger } from '../types/contract-types.js';
import type { WitnessCallEvent, WitnessContext,Witnesses } from '../types/witness-types.js';

export type WitnessCallHandler<TPrivateState = unknown> = (event: WitnessCallEvent<TPrivateState>) => void;

export class WitnessInterceptor<TLedger = unknown, TPrivateState = unknown> {
  private handlers: WitnessCallHandler<TPrivateState>[] = [];

  constructor(
    private witnesses: Witnesses<TLedger, TPrivateState>,
    private logger?: Logger
  ) {}

  onWitnessCall(handler: WitnessCallHandler<TPrivateState>): void {
    this.handlers.push(handler);
  }

  createInterceptedWitnesses(): Witnesses<TLedger, TPrivateState> {
    const intercepted: Witnesses<TLedger, TPrivateState> = {};

    for (const [name, witness] of Object.entries(this.witnesses)) {
      intercepted[name] = (context: WitnessContext<TLedger, TPrivateState>) => {
        this.logger?.debug(`Executing witness: ${name}`, { context });

        try {
          const result = witness(context);

          const event: WitnessCallEvent<TPrivateState> = {
            witnessName: name,
            context,
            result
          };

          for (const handler of this.handlers) {
            try {
              handler(event);
            } catch (error) {
              this.logger?.error(`Error in witnessCall handler`, { error });
            }
          }

          this.logger?.debug(`Witness ${name} completed successfully`, { result });

          return result;
        } catch (error) {
          this.logger?.error(`Witness ${name} failed`, { error });

          throw new WitnessExecutionError(
            `Witness '${name}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
            name,
            context,
            error instanceof Error ? error : undefined
          );
        }
      };
    }

    return intercepted;
  }

  getWitnesses(): Witnesses<TLedger, TPrivateState> {
    return this.witnesses;
  }
}
