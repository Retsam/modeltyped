// OptionalFromUndefined

type OptionalPropertyNames<T> = {
    [K in keyof T]: undefined extends T[K] ? K : never
}[keyof T];
type RequiredPropertyNames<T> = {
    [K in keyof T]: undefined extends T[K] ? never : K
}[keyof T];

export type OptionalFromUndefined<T> = Partial<
    Pick<T, OptionalPropertyNames<T>>
> &
    Pick<T, RequiredPropertyNames<T>>;

// mapValues
export function mapValues<U, O>(
    o: U,
    f: <K extends keyof U>(value: U[K], key: K, obj: U) => O,
): Record<keyof U, O> {
    const keys = Object.keys(o) as Array<keyof U>;
    return keys.reduce(
        (res, key) => {
            res[key] = f(o[key], key, o);
            return res;
        },
        {} as Record<keyof U, O>,
    );
}
