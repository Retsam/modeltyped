import test from "ava";
import {
    buildModel,
    types,
    ModelConstructorData,
    PropertiesDefs,
    ModelOutputData,
    TypeDefinition,
} from "../lib/modeltyped";

const unwrapTest = <Def extends PropertiesDefs>(
    testName: string,
    def: Def,
    data: ModelConstructorData<Def>,
    unwrap: ModelOutputData<Def>,
) =>
    test(testName, t => {
        const model = buildModel(def).create(data);
        t.deepEqual(model.toJSON(), unwrap);
    });

const { value: valueT } = types;
unwrapTest(
    "supports arbitrary value types",
    { state: valueT<"on" | "off">() },
    { state: "on" },
    { state: "on" },
);

const { string: stringT, number: numberT, boolean: booleanT } = types;

unwrapTest(
    "supports primitive types",
    {
        str: stringT,
        num: numberT,
        bool: booleanT,
        any: types.primitive,
    },
    { str: "string", num: 5, bool: true, any: "foo" },
    { str: "string", num: 5, bool: true, any: "foo" },
);

const { optional: optionalT } = types;
type Pokemon = "bulbasaur" | "squirtle" | "charmander";
unwrapTest(
    "supports optional types",
    {
        favoriteColor: optionalT(stringT),
        favoritePokemon: optionalT(valueT<Pokemon>()),
    },
    { favoritePokemon: "squirtle" },
    { favoriteColor: undefined, favoritePokemon: "squirtle" },
);

unwrapTest(
    "optional supports null as input, but returns undefined as output",
    { favoriteColor: optionalT(stringT) },
    { favoriteColor: null },
    { favoriteColor: undefined },
);

const { nullable: nullableT } = types;
unwrapTest(
    "supports nullable types",
    {
        favoriteColor: nullableT(stringT),
        favoritePokemon: nullableT(valueT<Pokemon>()),
    },
    { favoritePokemon: "squirtle" },
    { favoriteColor: null, favoritePokemon: "squirtle" },
);

unwrapTest(
    "nullable supports undefined as input, but returns null as output",
    { favoriteColor: nullableT(stringT) },
    { favoriteColor: undefined },
    { favoriteColor: null },
);

const { withDefault: withDefaultT } = types;
unwrapTest(
    "supports default values",
    {
        favoriteColor: withDefaultT(stringT, "red"),
        favoritePokemon: withDefaultT(valueT<Pokemon>(), "bulbasaur"),
    },
    { favoritePokemon: "squirtle" },
    { favoriteColor: "red", favoritePokemon: "squirtle" },
);

test("defaultT supports asymetric types", t => {
    const stringParserT: TypeDefinition<string | number, number, number> = {
        fromJSON: strOrNum =>
            typeof strOrNum === "string" ? parseInt(strOrNum) : strOrNum,
        toJSON: num => num,
    };
    const typeWithStringDefault = withDefaultT(stringParserT, "5");
    t.assert(typeWithStringDefault.fromJSON("2") === 2);
    t.assert(typeWithStringDefault.fromJSON(null) === 5);
    t.assert(typeWithStringDefault.toJSON(42) === 42);

    const typeWithDefaultNumber = withDefaultT(stringParserT, 5);
    t.assert(typeWithDefaultNumber.fromJSON("2") === 2);
    t.assert(typeWithDefaultNumber.fromJSON(null) === 5);
    t.assert(typeWithDefaultNumber.toJSON(42) === 42);
});

const { excludeFromOutput: excludeFromOutputT } = types;
unwrapTest(
    "can exclude properties from output",
    {
        inputOnlyString: excludeFromOutputT(stringT),
        inputOnlyNumber: optionalT(excludeFromOutputT(numberT)),
    },
    {
        inputOnlyString: "test",
    },
    {
        inputOnlyNumber: undefined,
        inputOnlyString: undefined,
    },
);

const { array: arrayT } = types;
unwrapTest(
    "supports array types",
    { numbers: arrayT(withDefaultT(numberT, 5)) },
    { numbers: [1, 3, undefined] },
    { numbers: [1, 3, 5] },
);

test("safe to pass arrays as default values without sharing array instances", t => {
    const TestModel = buildModel({
        nums: withDefaultT(arrayT(numberT), []),
    });
    const m1 = TestModel.create({});
    const m2 = TestModel.create({});
    m1.nums.push(5);
    t.deepEqual(m1.nums, [5]);
    // Ensures that the two models aren't somehow sharing an array, despite both using the
    t.deepEqual(m2.nums, []);
});

const { record: recordT } = types;
unwrapTest(
    "supports record types",
    { person: recordT({ firstName: stringT, lastName: stringT }) },
    { person: { firstName: "Bob", lastName: "Ross" } },
    { person: { firstName: "Bob", lastName: "Ross" } },
);

unwrapTest(
    "records handle undefined values gracefully",
    { options: withDefaultT(recordT({ verbose: optionalT(booleanT) }), {}) },
    // verbose can be omitted since it supports `undefined` as a possible value
    { options: {} },
    { options: { verbose: undefined } },
);

const appendOnUpdate: TypeDefinition<string, string> = {
    toJSON: s => s,
    fromJSON: s => s,
    update: (newVal, oldVal) => oldVal + newVal,
};

test("records update in place", t => {
    const model = buildModel({
        record: recordT({
            foobar: appendOnUpdate,
            baz: stringT,
        }),
    }).create({
        record: {
            foobar: "foo",
            baz: "baz",
        },
    });
    const record = model.record;

    model.update({
        record: {
            foobar: "bar",
            baz: "BAZ",
        },
    });

    //Update has not affect referential identity
    t.assert(record === model.record);
    // Values have updated as expected
    t.deepEqual(record, {
        foobar: "foobar",
        baz: "BAZ",
    });
});

const { model: modelT } = types;
test("supports sub-models", t => {
    const Contact = buildModel({
        firstName: stringT,
        lastName: stringT,
    }).extend(self => ({
        get fullName() {
            return self.firstName + " " + self.lastName;
        },
    }));

    const { toJSON, fromJSON } = modelT(Contact);
    t.true(
        fromJSON({ firstName: "Jon", lastName: "Snow" }).fullName ===
            "Jon Snow",
    );
    t.deepEqual(
        toJSON(Contact.create({ firstName: "Arya", lastName: "Stark" })),
        { firstName: "Arya", lastName: "Stark" },
    );
});

test("supports sub-models updating", t => {
    const SubModel = buildModel({ foobar: appendOnUpdate });
    const model = buildModel({
        subModel: modelT(SubModel),
    }).create({
        subModel: { foobar: "foo" },
    });

    const subModel = model.subModel;
    model.update({
        subModel: { foobar: "bar" },
    });
    //Update has not affect referential identity
    t.is(subModel, model.subModel);
    t.deepEqual(subModel.unwrap(), {
        foobar: "foobar",
    });
});
