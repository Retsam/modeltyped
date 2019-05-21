export interface TypeDefinition<Input, Instance, Output = Input> {
    fromJSON: (t: Input) => Instance;
    toJSON: (u: Instance) => Output;
    update?: (newVal: Input, prevVal: Instance) => Instance;
}

export const updateType = <Input, Instance, Output>(
    t: TypeDefinition<Input, Instance, Output>,
    { oldValue, newValue }: { oldValue: Instance; newValue: Input },
) => (t.update ? t.update(newValue, oldValue) : t.fromJSON(newValue));

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
