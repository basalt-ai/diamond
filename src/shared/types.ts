declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UUID = Brand<string, "UUID">;
export type Timestamp = Brand<Date, "Timestamp">;
