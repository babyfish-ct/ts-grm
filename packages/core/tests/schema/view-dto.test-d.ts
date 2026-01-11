import { test, expectTypeOf } from "vitest";
import { dto } from "@/schema/dto";
import type { TypeOf } from "@/schema/dto";
import { bookModel, bookStoreModel, electronicBookModel, paperBookModel, orderItemModel, orderModel, pdfElectronicBookModel } from "tests/model/model";

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
        id: string;
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
                .flat({prop: "name", prefix: "flatted"}, $ => $
                    .firstName
                    .lastName,
                )
            ).$orderBy("name.firstName", "name.lastName")
        )
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        id: string;
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
                .instanceOf(pdfElectronicBookModel, $ => $
                    .pdfVersion
                )
        )
    );
    
    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        name: string;
        books: ({
            name: string;
            __typename: "Book";
        } | {
            __typename: "PaperBook";
            name: string;
            size: {
                width: number;
                height: number;
            };
        } | {
            __typename: "ElectronicBook";
            name: string;
            address: string;
        } | {
            name: string;
            address: string;
            __typename: "PdfElectronicBook";
            pdfVersion: string | null | undefined;
        })[];
    }>();
});

test("TestInheritView2", () => {

    const view = dto.view(bookStoreModel, $ => $
        .name
        .books(
            $ => $.name
                .instanceOf(paperBookModel, $ => $
                    .size($ => $.width.height)
                )
                .instanceOf(electronicBookModel, $ => $
                    .address
                    .instanceOf(pdfElectronicBookModel, $ => $
                        .pdfVersion
                    )
                )
        )
    );
    
    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        name: string;
        books: ({
            name: string;
            __typename: "Book";
        } | {
            __typename: "PaperBook";
            name: string;
            size: {
                width: number;
                height: number;
            };
        } | {
            __typename: "ElectronicBook";
            name: string;
            address: string;
        } | {
            name: string;
            address: string;
            __typename: "PdfElectronicBook";
            pdfVersion: string | null | undefined;
        })[];
    }>();
});

test("TestFlatAssociation", () => {
    
    const view = dto.view(bookModel, $ => $
        .name
        .flat("store", $ => $
            .id
        )
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        name: string;
        storeId: string | null | undefined;
    }>()
});

test("TestReferenceKey", () => {
    
    const view = dto.view(bookModel, $ => $
        .storeId.$as("fk")
        .name
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        name: string;
        fk: string | null | undefined;
    }>()
});

test("TestEmbeddedReferenceKey", () => {

    const view = dto.view(orderItemModel, $ => $
        .orderId
        .id
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        id: number;
        orderId: {
            x: number;
            y: {
                a: number;
                b: number;
            };
        };
    }>();
});

test("TestAllScalars", () => {

    const view = dto.view(bookModel, $ => $
        .allScalars()
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        id: number;
        name: string;
        edition: number;
        price: number;
    }>();
});

test("TestAllScalarsWithEmbedded", () => {

    const view = dto.view(orderModel, $ => $
        .allScalars()
    );

    type ViewType = TypeOf<typeof view>;

    expectTypeOf<ViewType>().toEqualTypeOf<{
        id: {
            x: number;
            y: {
                a: number;
                b: number;
            };
        };
        name: number;
    }>();
});
