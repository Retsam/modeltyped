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
export const string = value<string>();
export const number = value<number>();
export const boolean = value<boolean>();
export const primitive = value<string | number | boolean>();

export function optional<In, Instance, Out>(
    type: TypeDefinition<In, Instance, Out>,
): TypeDefinition<
    In | undefined | null,
    Instance | undefined,
    Out | undefined
> {
    return {
        fromJSON: i => (i == null ? undefined : type.fromJSON(i)),
        toJSON: i => (i == null ? undefined : type.toJSON(i)),
    };
}

export function nullable<In, Instance, Out>(
    type: TypeDefinition<In, Instance, Out>,
): TypeDefinition<In | undefined | null, Instance | null, Out | null> {
    return {
        fromJSON: i => (i == null ? null : type.fromJSON(i)),
        toJSON: i => (i == null ? null : type.toJSON(i)),
    };
}

// Utility for building types that apply a filter to the input value
export function inputFilter<OuterInput, InnerInput, Instance, Out>(
    t: TypeDefinition<InnerInput, Instance, Out>,
    filter: (input: OuterInput) => InnerInput,
): TypeDefinition<OuterInput, Instance, Out> {
    return {
        fromJSON: i => t.fromJSON(filter(i)),
        toJSON: t.toJSON,
        update: (newValue, oldValue) =>
            updateType(t, { oldValue, newValue: filter(newValue) }),
    };
}

export const withDefault = <In, Instance, Out>(
    t: TypeDefinition<In, Instance, Out>,
    defaultValue: NoInfer<In>, // Ensure that In is inferred from the TypeDefinition, not the default value
) =>
    inputFilter(t, (value: In | undefined | null) =>
        value == null ? defaultValue : value,
    );

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
