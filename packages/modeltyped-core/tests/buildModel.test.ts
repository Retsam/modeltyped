import test from "ava";
import { buildModel, types, TypeDefinition } from "../lib/modeltyped";

const { string: stringT, optional: optionalT, number: numberT } = types;

test("can define properties", t => {
    const TestModel = buildModel({
        foo: stringT,
        bar: stringT,
    });

    const model = TestModel.create({
        foo: "FOO",
        bar: "BAR",
    });

    t.assert(model.foo === "FOO");
    t.assert(model.bar === "BAR");

    t.deepEqual(model.toJSON(), {
        foo: "FOO",
        bar: "BAR",
    });
});

test("toJSON returns the current value of properties", t => {
    const TestModel = buildModel({
        name: types.string,
    });
    const model = TestModel.create({ name: "Anakin" });
    model.name = "Vader";
    t.deepEqual(model.toJSON(), {
        name: "Vader",
    });
});

test("undefined properties are optional for construction", t => {
    const TestModel = buildModel({
        favoriteColor: optionalT(stringT),
    });
    const model = TestModel.create({});

    t.assert(model.favoriteColor === undefined);
});

test("can define model actions", t => {
    const TestModel = buildModel({
        x: numberT,
    }).extend(self => ({
        plus: (y: number) => self.x + y,
    }));

    const model = TestModel.create({ x: 5 });
    t.assert(model.plus(7) === 12);
});

test("can define model-only fields", t => {
    const TestModel = buildModel({
        x: numberT,
    }).extend(self => ({
        get twoX() {
            return self.x + self.x;
        },
    }));
    const model = TestModel.create({ x: 5 });
    t.assert(model.twoX === 10);
    t.deepEqual(model.toJSON(), {
        x: 5,
        // Does not include twoX, was a model only property
    });
});

test("can define extras that reference other extras", t => {
    const TestModel = buildModel({
        value: stringT,
    })
        .extend(self => ({
            get loudValue() {
                return self.value.toUpperCase();
            },
        }))
        .extend(self => ({
            get loudValueTwice() {
                return self.loudValue + " " + self.loudValue;
            },
        }));

    const model = TestModel.create({ value: "hodor" });
    t.assert(model.loudValue === "HODOR");
    t.assert(model.loudValueTwice === "HODOR HODOR");
});

test("can update the model with new data", t => {
    const model = buildModel({
        foo: stringT,
        bar: numberT,
    }).create({
        foo: "foo",
        bar: 0,
    });

    model.update({ foo: "FOO", bar: 1 });

    t.deepEqual(model.toJSON(), {
        foo: "FOO",
        bar: 1,
    });
});

const appendOnUpdate: TypeDefinition<string, string> = {
    toJSON: s => s,
    fromJSON: s => s,
    update: (newVal, oldVal) => oldVal + newVal,
};

test("types can specify custom update logic", t => {
    const model = buildModel({
        foo: appendOnUpdate,
    }).create({
        foo: "Foo",
    });

    model.update({ foo: "Bar" });
    t.is(model.foo, "FooBar");
});
