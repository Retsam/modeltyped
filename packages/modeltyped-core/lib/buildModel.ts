import {
    TypeDefinition,
    TypeDefInput,
    TypeDefOutput,
    TypeDefInstance,
    updateType,
} from "./typeDefinition";
import { OptionalFromUndefined, mapValues } from "./tsUtils";
import assign from "lodash.assign";

export type PropertiesDefs = Record<string, TypeDefinition<any, any>>;

export type ModelConstructorData<
    Props extends PropertiesDefs
> = OptionalFromUndefined<{ [P in keyof Props]: TypeDefInput<Props[P]> }>;

export type ModelOutputData<Props extends PropertiesDefs> = {
    [P in keyof Props]: TypeDefOutput<Props[P]>
};

export type ModelInstance<Props extends PropertiesDefs, Extras> = {
    [P in keyof Props]: TypeDefInstance<Props[P]>
} & {
    toJSON(): ModelOutputData<Props>;
    unwrap(): ModelOutputData<Props>;
    update(data: ModelConstructorData<Props>): void;
} & Extras;

// .extend can override props, but the `& Partial<ModelInstance<Props, Extras>>`
//   enforces that it can only override with subtypes
type ExtenderFunc<
    Props extends PropertiesDefs,
    Extras extends object,
    MoreExtras extends object
> = (
    self: ModelInstance<Props, Extras>,
    data: ModelConstructorData<Props>,
) => MoreExtras & Partial<ModelInstance<Props, Extras>>;

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
        const toJSON = () => {
            return mapValues(propDef, ({ toJSON }, propName) => {
                return toJSON((instance as any)[propName]);
            });
        };
        const instance = {
            ...props,
            toJSON,
            unwrap: toJSON,
            update: newData => this.update(instance, newData),
        } as ModelInstance<Props, Extras>;

        for (const extenderFunc of this.extenderFuncs) {
            assign(instance, extenderFunc(instance, data));
        }
        return instance;
    }

    // Instance method on created models, partially applied with self in the create function
    private update(
        self: ModelInstance<Props, Extras>,
        newData: ModelConstructorData<Props>,
    ) {
        Object.keys(this.props).forEach(propName => {
            const propType = this.props[propName];
            const oldValue = self[propName];
            const newValue = (newData as any)[propName];
            self[propName] = updateType(propType, { newValue, oldValue });
        });
        return self;
    }

    static buildModel<Props extends PropertiesDefs>(
        props: Props,
    ): ModelDefinition<Props, {}> {
        return new ModelDefinition(props, []);
    }
}

export const buildModel = ModelDefinition.buildModel;
