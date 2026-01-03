import { test, expectTypeOf } from "vitest";
import { dto } from "@/schema/dto";
import type { TypeOf } from "@/schema/dto";
import { bookStoreModel, electronicBookModel, paperBookModel } from "tests/model/model";

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

test("TestInheritView", () => {

    const view = dto.view(bookStoreModel, $ => $
        .name
        .books(
            $ => $.name
                .instanceOf(paperBookModel, $ => $
                    .size($ => $.width.height)
                )
                .instanceOf(electronicBookModel, $ => $
                    .address
                )
        )
    );
    
    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        name: string;
        books: ({
            __typename: "Book";
            name: string;
        } | {
            __typename: "ElectronicBook";
            name: string;
            address: string;
        } | {
            __typename: "PaperBook";
            name: string;
            size: {
                width: number;
                height: number;
            };
        })[];
    }>();
});
