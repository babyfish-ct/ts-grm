import { EntityTable } from "@/dsl/entity-table";
import { Expression } from "@/dsl/expression";
import { authorModel, bookModel, bookStoreModel } from "tests/model/model";
import { expectTypeOf, test } from "vitest";

test("TableMembers", () => {

    const authorLastName = store().books().$acceptRisk().authors().name().lastName;
    expectTypeOf<typeof authorLastName>().toEqualTypeOf<Expression<string>>();
    
    const storeId = book().storeId;
    expectTypeOf<typeof storeId>().toEqualTypeOf<Expression<string | null | undefined, true>>();

    const bookId = book().id;
    expectTypeOf<typeof bookId>().toEqualTypeOf<Expression<number>>();

    const storeName1 = book().store().name;
    expectTypeOf<typeof storeName1>().toEqualTypeOf<Expression<string>>();

    const storeName2 = book().store("LEFT").name;
    expectTypeOf<typeof storeName2>().toEqualTypeOf<Expression<string | null | undefined>>();

    const storeName3 = book().store({
        filter: (source, target) => source.name.eq(target.name)
    }).name;
    expectTypeOf<typeof storeName3>().toEqualTypeOf<Expression<string>>();

    const weakJoinName1 = store().join(
        authorModel, 
        (source, target) => source.name.eq(target.name().firstName)
    ).$acceptRisk().name().firstName;
    expectTypeOf<typeof weakJoinName1>().toEqualTypeOf<Expression<string>>();

    const weakJoinName2 = store().join(
        authorModel, 
        "LEFT",
        (source, target) => source.name.eq(target.name().firstName)
    ).$acceptRisk().name().firstName;
    expectTypeOf<typeof weakJoinName2>().toEqualTypeOf<Expression<string | null | undefined>>();
});

function book(): EntityTable<typeof bookModel> {
    throw new Error();
}

function store(): EntityTable<typeof bookStoreModel> {
    throw new Error();
}