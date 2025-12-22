/**
 * Advanced TypeScript utility types for better type inference and safety
 */

/**
 * Extracts the return type of async functions
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Makes specific keys required in a type
 */
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Makes specific keys optional in a type
 */
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extracts function property names from a type
 */
export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Extracts only function properties from a type
 */
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

/**
 * Creates a type that is either defined or never (for conditional inclusion)
 */
export type MaybeInclude<Condition extends boolean, T> = Condition extends true ? T : never;

/**
 * Checks if a type has a specific property
 */
export type HasProperty<T, K extends PropertyKey> = K extends keyof T ? true : false;

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extract parameter types from a function
 */
export type FunctionParams<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Extract return type from a function
 */
export type FunctionReturn<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * Type guard to check if value is defined
 */
export type IsDefined<T> = T extends undefined ? false : true;

/**
 * Non-nullable version of a type
 */
export type NonNullish<T> = T extends null | undefined ? never : T;

/**
 * Require at least one property from a type
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * Prettify complex types for better IDE display
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Infer the private state type from witness context
 * Extracts TPrivateState from WitnessContext<TLedger, TPrivateState>
 */
export type InferPrivateState<W> = W extends Record<
  string,
  (context: { privateState: infer PS; ledger: unknown }) => unknown
>
  ? PS
  : W extends Record<string, (context: { privateState: infer PS }) => unknown>
    ? PS
    : undefined;

/**
 * Infer the ledger type from witness context
 * Extracts TLedger from WitnessContext<TLedger, TPrivateState>
 */
export type InferLedger<W> = W extends Record<
  string,
  (context: { privateState: unknown; ledger: infer L }) => unknown
>
  ? L
  : W extends Record<string, (context: { ledger: infer L }) => unknown>
    ? L
    : unknown;

/**
 * Extract private state type from first witness function
 * More reliable inference from actual witness signature
 */
export type ExtractPrivateStateFromWitness<W> = W extends Record<
  infer _K,
  (context: infer C) => unknown
>
  ? C extends { privateState: infer PS }
    ? PS
    : undefined
  : undefined;

/**
 * Extract ledger type from first witness function
 * More reliable inference from actual witness signature
 */
export type ExtractLedgerFromWitness<W> = W extends Record<
  infer _K,
  (context: infer C) => unknown
>
  ? C extends { ledger: infer L }
    ? L
    : unknown
  : unknown;
