export interface TypeDefinition<Input, Instance, Output = Input> {
    fromJSON: (t: Input) => Instance;
    toJSON: (u: Instance) => Output;
}

// Utility types for extracting the type params from TypeDefinition
export type TypeDefInput<
    T extends TypeDefinition<any, any, any>
> = T extends TypeDefinition<infer I, any, any> ? I : never;
export type TypeDefInstance<
    T extends TypeDefinition<any, any, any>
> = T extends TypeDefinition<any, infer V, any> ? V : never;
export type TypeDefOutput<
    T extends TypeDefinition<any, any, any>
> = T extends TypeDefinition<any, any, infer O> ? O : never;
