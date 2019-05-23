import {
    TypeDefinition,
    TypeDefInput,
    TypeDefOutput,
    TypeDefInstance,
    updateType,
} from "./typeDefinition";
import {
    ModelDefinition,
    ModelConstructorData,
    ModelInstance,
    ModelOutputData,
} from "./buildModel";
import { mapValues, NoInfer, OptionalFromUndefined } from "./tsUtils";

export function value<T>(): TypeDefinition<T, T> {
    return {
        fromJSON: t => t,
        toJSON: t => t,
    };
}
export const string: TypeDefinition<string, string> = value<string>();
export const number: TypeDefinition<number, number> = value<number>();
export const boolean: TypeDefinition<boolean, boolean> = value<boolean>();

export function optional<In, Out>(
    type: TypeDefinition<In, Out>,
): TypeDefinition<In | undefined | null, Out | undefined, In | undefined> {
    return {
        fromJSON: i => (i == null ? undefined : type.fromJSON(i)),
        toJSON: i => (i == null ? undefined : type.toJSON(i)),
    };
}

export function nullable<In, Out>(
    type: TypeDefinition<In, Out>,
): TypeDefinition<In | undefined | null, Out | null, In | null> {
    return {
        fromJSON: i => (i == null ? null : type.fromJSON(i)),
        toJSON: i => (i == null ? null : type.toJSON(i)),
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
    OptionalFromUndefined<{ [K in keyof Obj]: TypeDefInput<Obj[K]> }>,
    { [K in keyof Obj]: TypeDefInstance<Obj[K]> },
    { [K in keyof Obj]: TypeDefOutput<Obj[K]> }
> {
    return {
        fromJSON: input =>
            mapValues(obj, ({ fromJSON }, key) =>
                // Any cast needed due to the OptionalFromUndefined
                fromJSON((input as any)[key]),
            ),
        toJSON: output =>
            mapValues(obj, ({ toJSON }, key) => toJSON(output[key])),
        // Keep the same object, but update its props with updated values
        update: (newValues, self) =>
            (Object.keys(obj) as Array<keyof Obj>).reduce((self, key) => {
                const typeDef = obj[key];
                const oldValue = self[key];
                const newValue = (newValues as any)[key];
                self[key] = updateType(typeDef, { oldValue, newValue });
                return self;
            }, self),
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
        update: (newData, prevModel) => prevModel.update(newData),
    };
}
