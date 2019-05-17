import test from "ava";
import {
    buildModel,
    types,
    ModelConstructorData,
    PropertiesDefs,
    ModelOutputData,
    TypeDefinition,
} from "modeltyped";

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
    },
    { str: "string", num: 5, bool: true },
    { str: "string", num: 5, bool: true },
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
