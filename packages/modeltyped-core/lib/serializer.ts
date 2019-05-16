export interface Serializer<Input, Instance, Output = Input> {
    fromJSON: (t: Input) => Instance;
    toJSON: (u: Instance) => Output;
}

// Utility types for extracting the type params from Serializer
export type SerializerInputType<
    T extends Serializer<any, any, any>
> = T extends Serializer<infer I, any, any> ? I : never;
export type SerializerInstanceType<
    T extends Serializer<any, any, any>
> = T extends Serializer<any, infer V, any> ? V : never;
export type SerializerOutputType<
    T extends Serializer<any, any, any>
> = T extends Serializer<any, any, infer O> ? O : never;
