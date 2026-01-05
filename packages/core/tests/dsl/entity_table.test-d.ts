import { EntityTable } from "@/dsl/entity-table";
import { NonNullExpression, NullableExpression } from "@/dsl/expression";
import { authorModel, bookModel, bookStoreModel } from "tests/model/model";
import { expectTypeOf, test } from "vitest";

test("TableMembers", () => { 

    const authorLastName = store().books().$acceptRisk().authors().name().lastName;
    expectTypeOf<typeof authorLastName>().toEqualTypeOf<NonNullExpression<string>>();
    
    const storeId = book().storeId;
    expectTypeOf<typeof storeId>().toEqualTypeOf<NullableExpression<number>>();

    const storeName1 = book().store().name;
    expectTypeOf<typeof storeName1>().toEqualTypeOf<NonNullExpression<string>>();

    const storeName2 = book().store("LEFT").name;
    expectTypeOf<typeof storeName2>().toEqualTypeOf<NullableExpression<string>>();

    const storeName3 = book().store({
        filter: (source, target) => source.name.eq(target.name)
    }).name;
    expectTypeOf<typeof storeName3>().toEqualTypeOf<NonNullExpression<string>>();

    const weakJoinName1 = store().join(
        authorModel, 
        (source, target) => source.name.eq(target.name().firstName)
    ).$acceptRisk().name().firstName;
    expectTypeOf<typeof weakJoinName1>().toEqualTypeOf<NonNullExpression<string>>();

    const weakJoinName2 = store().join(
        authorModel, 
        "LEFT",
        (source, target) => source.name.eq(target.name().firstName)
    ).$acceptRisk().name().firstName;
    expectTypeOf<typeof weakJoinName2>().toEqualTypeOf<NullableExpression<string>>();
});

function book(): EntityTable<typeof bookModel> {
    throw new Error();
}

function store(): EntityTable<typeof bookStoreModel> {
    throw new Error();
}