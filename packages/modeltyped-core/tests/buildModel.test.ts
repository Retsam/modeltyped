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

const numberS: Serializer<number, number> = {
    fromJSON: s => s,
    toJSON: s => s,
};

test("can define model actions", t => {
    const TestModel = buildModel({
        x: numberS,
    }).extend(self => ({
        plus: (y: number) => self.x + y,
    }));

    const model = TestModel.create({ x: 5 });
    t.assert(model.plus(7) === 12);
});

test("can define model-only fields", t => {
    const TestModel = buildModel({
        x: numberS,
    }).extend(self => ({
        get twoX() {
            return self.x + self.x;
        },
    }));
    const model = TestModel.create({ x: 5 });
    t.assert(model.twoX === 10);
    t.deepEqual(model.unwrap(), {
        x: 5,
        // Does not include twoX, was a model only property
    });
});

test("can define extras that reference other extras", t => {
    const TestModel = buildModel({
        value: stringS,
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
