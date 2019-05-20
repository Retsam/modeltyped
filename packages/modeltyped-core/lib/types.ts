import {
    TypeDefinition,
    TypeDefInput,
    TypeDefOutput,
    TypeDefInstance,
} from "./typeDefinition";
import {
    ModelDefinition,
    ModelConstructorData,
    ModelInstance,
    ModelOutputData,
} from "./buildModel";
import { mapValues, NoInfer } from "./tsUtils";

export function value<T>(): TypeDefinition<T, T> {
    return {
        fromJSON: t => t,
        toJSON: t => t,
    };
}
export const string: TypeDefinition<string, string> = value<string>();
export const number: TypeDefinition<number, number> = value<number>();
export const boolean: TypeDefinition<boolean, boolean> = value<boolean>();

export function optional<In, Out>({
    toJSON,
    fromJSON,
}: TypeDefinition<In, Out>): TypeDefinition<In | undefined, Out | undefined> {
    return {
        fromJSON: i => (i == null ? undefined : fromJSON(i)),
        toJSON: i => (i == null ? undefined : toJSON(i)),
    };
}

export function withDefault<In, Instance, Out>(
    { toJSON, fromJSON }: TypeDefinition<In, Instance, Out>,
    defaultValue: NoInfer<In>, // Ensure that In is inferred from the TypeDefinition, not the default value
): TypeDefinition<In | undefined | null, Instance, Out> {
    return {
        fromJSON: i => fromJSON(i == null ? defaultValue : i),
        toJSON,
    };
}

export function array<In, Out, Value = In>(
    s: TypeDefinition<In, Out, Value>,
): TypeDefinition<In[], Out[], Value[]> {
    return {
        fromJSON: t => t.map(s.fromJSON),
        toJSON: t => t.map(s.toJSON),
    };
}

export function record<
    Obj extends Record<string, TypeDefinition<any, any, any>>
>(
    obj: Obj,
): TypeDefinition<
    { [K in keyof Obj]: TypeDefInput<Obj[K]> },
    { [K in keyof Obj]: TypeDefInstance<Obj[K]> },
    { [K in keyof Obj]: TypeDefOutput<Obj[K]> }
> {
    return {
        fromJSON: input =>
            mapValues(obj, ({ fromJSON }, key) => fromJSON(input[key])),
        toJSON: output =>
            mapValues(obj, ({ toJSON }, key) => toJSON(output[key])),
    };
}

type ModelProps<
    M extends ModelDefinition<any, any>
> = M extends ModelDefinition<infer Props, any> ? Props : never;
type ModelExtras<
    M extends ModelDefinition<any, any>
> = M extends ModelDefinition<any, infer Extras> ? Extras : never;

export function model<M extends ModelDefinition<any, any>>(
    Model: M,
): TypeDefinition<
    ModelConstructorData<ModelProps<M>>,
    ModelInstance<ModelProps<M>, ModelExtras<M>>,
    ModelOutputData<ModelProps<M>>
> {
    return {
        fromJSON: input => Model.create(input),
        toJSON: model => model.toJSON(),
    };
}
