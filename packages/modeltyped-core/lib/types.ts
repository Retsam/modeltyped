import {
    Serializer,
    SerializerInputType,
    SerializerOutputType,
    SerializerInstanceType,
} from "serializer";
import {
    ModelDefinition,
    ModelConstructorData,
    ModelInstance,
    ModelUnwrapData,
} from "buildModel";
import { mapValues, NoInfer } from "tsUtils";

export function value<T>(): Serializer<T, T> {
    return {
        fromJSON: t => t,
        toJSON: t => t,
    };
}
export const string: Serializer<string, string> = value<string>();
export const number: Serializer<number, number> = value<number>();
export const boolean: Serializer<boolean, boolean> = value<boolean>();

export function optional<In, Out>({
    toJSON,
    fromJSON,
}: Serializer<In, Out>): Serializer<In | undefined, Out | undefined> {
    return {
        fromJSON: i => (i == null ? undefined : fromJSON(i)),
        toJSON: i => (i == null ? undefined : toJSON(i)),
    };
}

export function withDefault<In, Instance, Out>(
    { toJSON, fromJSON }: Serializer<In, Instance, Out>,
    defaultValue: NoInfer<In>, // Ensure that In is inferred from the serializer, not the default value
): Serializer<In | undefined | null, Instance, Out> {
    return {
        fromJSON: i => fromJSON(i == null ? defaultValue : i),
        toJSON,
    };
}

export function array<In, Out, Value = In>(
    s: Serializer<In, Out, Value>,
): Serializer<In[], Out[], Value[]> {
    return {
        fromJSON: t => t.map(s.fromJSON),
        toJSON: t => t.map(s.toJSON),
    };
}

export function record<Obj extends Record<string, Serializer<any, any, any>>>(
    obj: Obj,
): Serializer<
    { [K in keyof Obj]: SerializerInputType<Obj[K]> },
    { [K in keyof Obj]: SerializerInstanceType<Obj[K]> },
    { [K in keyof Obj]: SerializerOutputType<Obj[K]> }
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
): Serializer<
    ModelConstructorData<ModelProps<M>>,
    ModelInstance<ModelProps<M>, ModelExtras<M>>,
    ModelUnwrapData<ModelProps<M>>
> {
    return {
        fromJSON: input => Model.create(input),
        toJSON: model => model.unwrap(),
    };
}
