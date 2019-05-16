import {
    Serializer,
    SerializerInputType,
    SerializerOutputType,
    SerializerInstanceType,
} from "serializer";
import { OptionalFromUndefined, mapValues } from "tsUtils";
import assign from "lodash.assign";

export type PropertiesDefs = Record<string, Serializer<any, any>>;

export type ModelConstructorData<
    Props extends PropertiesDefs
> = OptionalFromUndefined<
    { [P in keyof Props]: SerializerInputType<Props[P]> }
>;

export type ModelUnwrapData<Props extends PropertiesDefs> = {
    [P in keyof Props]: SerializerOutputType<Props[P]>
};

export type ModelInstance<Props extends PropertiesDefs, Extras> = {
    [P in keyof Props]: SerializerInstanceType<Props[P]>
} & {
    unwrap(): ModelUnwrapData<Props>;
} & Extras;

type ExtenderFunc<
    Props extends PropertiesDefs,
    Extras extends object,
    MoreExtras extends object
> = (self: ModelInstance<Props, Extras>) => MoreExtras;

export class ModelDefinition<
    Props extends PropertiesDefs,
    Extras extends object
> {
    private constructor(
        private props: Props,
        /** An array of functions used to progressively build the instance with any extras (e.g.
         * actions).  On construction of a model, they will be called in order with and their return
         * values will be mixed into the instance.
         */
        private extenderFuncs: Array<ExtenderFunc<Props, any, any>>,
    ) {}

    extend<MoreExtras extends object>(
        extender: ExtenderFunc<Props, Extras, MoreExtras>,
    ): ModelDefinition<Props, Extras & MoreExtras> {
        return new ModelDefinition(
            this.props,
            this.extenderFuncs.concat(extender),
        );
    }

    create(data: ModelConstructorData<Props>): ModelInstance<Props, Extras> {
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
        } as ModelInstance<Props, Extras>;
        for (const extenderFunc of this.extenderFuncs) {
            assign(instance, extenderFunc(instance));
        }
        return instance;
    }

    static buildModel<Props extends PropertiesDefs>(
        props: Props,
    ): ModelDefinition<Props, {}> {
        return new ModelDefinition(props, []);
    }
}

export const buildModel = ModelDefinition.buildModel;
