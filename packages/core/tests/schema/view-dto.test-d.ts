import { test, expectTypeOf } from "vitest";
import { model } from "@/schema/model";
import { prop } from "@/schema/prop";
import { dto } from "@/schema/dto";
import type { TypeOf } from "@/schema/dto";

const bookStoreModel = model("BookStore", class {
    id = prop.i64()
    name = prop.str()
    version = prop.i32()
    books = prop.o2m(bookModel)
        .mappedBy("store")
        .orderBy("name", { path: "edition", desc: true })
});

const bookModel = model("Book", class {
    id = prop.i64()
    name = prop.str()
    edition = prop.i32()
    store = prop.m2o(bookStoreModel)
        .joinColumns({cascade: "DELETE"})
        .nullable()
    authors = prop.m2m(authorModel).joinTable({
        name: "book_author_mapping",
        toThisColumns: ["book_id"],
        toTargetColumns: ["author_id"]
    })
});

const authorModel = model("Author", class {
    id = prop.i64()
    name = prop.embedded({
        firstName: prop.str(),
        lastName: prop.str()
    })
    books = prop.m2m(bookModel).mappedBy("authors");
}, ctx => ctx.unique("name.firstName", "name.lastName"));

test("TestSimpleView", () => {

    const view = dto.view(bookStoreModel, $ => $
        .id
        .name
        .version
        .books($ => $
            .id
            .name
            .edition
            .authors($ => $
                .id
                .name($ => $
                    .firstName
                    .lastName
                )
            ).$orderBy("name.firstName", "name.lastName")
        )
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        id: number;
        name: string;
        version: number;
        books: {
            id: number;
            name: string;
            edition: number;
            authors: {
                id: number;
                name: {
                    firstName: string;
                    lastName: string;
                };
            }[];
        }[];
    }>();
});

test("TestComplexView", () => {

    const view = dto.view(bookStoreModel, $ => $
        .id
        .name
        .version.$as("optimisticLock")
        .books($ => $
            .id.$as("bookId")
            .fold("foldKey", $ => $
                .name
                .edition
            )
            .authors($ => $
                .id
                .flat("name", $ => $
                    .firstName
                    .lastName,
                    {prefix: "flatted"}
                )
            ).$orderBy("name.firstName", "name.lastName")
        )
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        id: number;
        name: string;
        optimisticLock: number;
        books: {
            bookId: number;
            foldKey: {
                name: string;
                edition: number;
            };
            authors: {
                id: number;
                flattedFirstName: string;
                flattedLastName: string;
            }[];
        }[];
    }>();
});
