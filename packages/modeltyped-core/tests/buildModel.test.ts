import test from "ava";
import { Serializer, buildModel } from "modeltyped";

const stringS: Serializer<string, string> = {
    fromJSON: s => s,
    toJSON: s => s,
};

test("can define properties", t => {
    const TestModel = buildModel({
        foo: stringS,
        bar: stringS,
    });

    const model = TestModel.create({
        foo: "FOO",
        bar: "BAR",
    });

    t.assert(model.foo === "FOO");
    t.assert(model.bar === "BAR");

    t.deepEqual(model.unwrap(), {
        foo: "FOO",
        bar: "BAR",
    });
});

test("unwrap returns the current value of properties", t => {
    const TestModel = buildModel({
        name: stringS,
    });
    const model = TestModel.create({ name: "Anakin" });
    model.name = "Vader";
    t.deepEqual(model.unwrap(), {
        name: "Vader",
    });
});

const optionalS = <In, Out>(
    s: Serializer<In, Out>,
    defaultValue: In,
): Serializer<In | undefined, Out, In> => ({
    fromJSON: val => s.fromJSON(val || defaultValue),
    toJSON: val => s.toJSON(val),
});

test("undefined properties are optional for construction", t => {
    const TestModel = buildModel({
        favoriteColor: optionalS(stringS, "Red"),
    });
    const model = TestModel.create({});

    t.assert(model.favoriteColor === "Red");
});
