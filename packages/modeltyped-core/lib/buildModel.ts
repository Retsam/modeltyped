import {
    Serializer,
    SerializerInputType,
    SerializerOutputType,
    SerializerInstanceType,
} from "serializer";
import { OptionalFromUndefined, mapValues } from "tsUtils";

export type PropertiesDefs = Record<string, Serializer<any, any>>;

export type ModelConstructorData<
    Props extends PropertiesDefs
> = OptionalFromUndefined<
    { [P in keyof Props]: SerializerInputType<Props[P]> }
>;

export type ModelUnwrapData<Props extends PropertiesDefs> = {
    [P in keyof Props]: SerializerOutputType<Props[P]>
};

export type ModelInstance<Props extends PropertiesDefs> = {
    [P in keyof Props]: SerializerInstanceType<Props[P]>
} & {
    unwrap(): ModelUnwrapData<Props>;
};

export class ModelDefinition<Props extends PropertiesDefs> {
    private constructor(private props: Props) {}

    create(data: ModelConstructorData<Props>): ModelInstance<Props> {
        const propDef = this.props;
        const props = mapValues(propDef, ({ fromJSON }, propName) => {
            return fromJSON((data as any)[propName]);
        });
        const instance = {
            ...props,
            unwrap() {
                return mapValues(propDef, ({ toJSON }, propName) => {
                    return toJSON((instance as any)[propName]);
                });
            },
        } as ModelInstance<Props>;
        return instance;
    }

    static buildModel<Props extends PropertiesDefs>(
        props: Props,
    ): ModelDefinition<Props> {
        return new ModelDefinition(props);
    }
}

export const buildModel = ModelDefinition.buildModel;
