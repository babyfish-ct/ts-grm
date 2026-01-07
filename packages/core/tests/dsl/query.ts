import { native } from "@/dsl/native";
import { orderBy, select, where } from "@/dsl/query";
import { SqlClient } from "@/dsl/sql-client";
import { dto } from "@/schema/dto";
import { authorModel, bookModel } from "tests/model/model";
import { expectTypeOf, test } from "vitest";

test("TestRootQueryByOne", async () => {

    const rows = await sqlClient().createQuery(bookModel, book => {
        where(book.storeId.eq("2"));
        orderBy()
        return select(book.fetch(simpleBookView));
    }).list();
    
    expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
        id: number;
        name: string;
    }>();
});

test("TestRootQueryByArray", async () => {
    
    const rows = await sqlClient().createQuery(bookModel, authorModel, (book, author) => {
        where(book.name.eq(author.name().firstName));
        orderBy(book.price.desc());
        return select(
            book.fetch(simpleBookView), 
            author.fetch(simpleAuthorView)
        );
    }).list();

    expectTypeOf<typeof rows[0]>().toEqualTypeOf<[{
        id: number;
        name: string;
    }, {
        id: number;
        name: {
            fn: string;
            ln: string;
        };
    }]>();
});

test("TestRootQueryByMap", async () => {

    const rows = await sqlClient().createQuery(bookModel, (book) => {
        where(book.name.ilikeIf(undefined));
        return select({
            book: book.fetch(simpleBookView),
            globalRank: native.number("row_number() over(order by ...)"),
            localRank: native.number("row_number() over(parition by ...)")
        });
    }).list();

    expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
        readonly book: {
            id: number;
            name: string;
        };
        readonly globalRank: number;
        readonly localRank: number;
    }>();
});

const simpleBookView = dto.view(bookModel, $ => $
    .id
    .name
);

const simpleAuthorView = dto.view(authorModel, $ => $
    .id
    .name($ => $
        .firstName.$as("fn")
        .lastName.$as("ln")
    )
)

function sqlClient(): SqlClient {
    throw new Error();
}