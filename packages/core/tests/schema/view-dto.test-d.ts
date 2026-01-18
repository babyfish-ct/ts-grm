import { describe, it, expectTypeOf } from "vitest";
import { dto } from "@/schema/dto";
import type { TypeOf } from "@/schema/dto";
import { BOOK, BOOK_STORE, ELECTRONIC_BOOK, PAPER_BOOK, ORDER_ITEM, ORDER, PDF_ELECTRONIC_BOOK, TREE_NODE } from "tests/model/model";

describe("ViewShapeTest", () => {
    function make<T>(): T {
        throw new Error();
    }

    type ElementOf<T> = 
        T extends Array<infer R> 
            ? R 
            : never;
            
    it("TestSimpleView", () => {

        const view = dto.view(BOOK_STORE, $ => $
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

    it("TestComplexView", () => {

        const view = dto.view(BOOK_STORE, $ => $
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

    it("TestInheritViewWithNull", () => {

        const view = dto.view(BOOK_STORE, $ => $
            .name
            .books(
                $ => $.name
                    .instanceOf(PAPER_BOOK, $ => $
                        .size($ => $.width.height)
                    )
                    .instanceOf(ELECTRONIC_BOOK, $ => $
                        .address
                    )
                    .instanceOf(PDF_ELECTRONIC_BOOK, $ => $
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
                pdfVersion: string | null;
            })[];
        }>();
    });

    it("TestInheritViewWithUndefined", () => {

        const view = dto.view.nullAsUndefined(BOOK_STORE, $ => $
            .name
            .books(
                $ => $.name
                    .instanceOf(PAPER_BOOK, $ => $
                        .size($ => $.width.height)
                    )
                    .instanceOf(ELECTRONIC_BOOK, $ => $
                        .address
                    )
                    .instanceOf(PDF_ELECTRONIC_BOOK, $ => $
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
                pdfVersion?: string | undefined;
            })[];
        }>();
    });

    it("TestInheritView2WithNull", () => {

        const view = dto.view(BOOK_STORE, $ => $
            .name
            .books(
                $ => $.name
                    .instanceOf(PAPER_BOOK, $ => $
                        .size($ => $.width.height)
                    )
                    .instanceOf(ELECTRONIC_BOOK, $ => $
                        .address
                        .instanceOf(PDF_ELECTRONIC_BOOK, $ => $
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
                pdfVersion: string | null;
            })[];
        }>();
    });

    it("TestInheritView2WithUndefined", () => {

        const view = dto.view.nullAsUndefined(BOOK_STORE, $ => $
            .name
            .books(
                $ => $.name
                    .instanceOf(PAPER_BOOK, $ => $
                        .size($ => $.width.height)
                    )
                    .instanceOf(ELECTRONIC_BOOK, $ => $
                        .address
                        .instanceOf(PDF_ELECTRONIC_BOOK, $ => $
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
                pdfVersion?: string | undefined;
            })[];
        }>();
    });

    it("TestFlatAssociationWithNull", () => {
        
        const view = dto.view(BOOK, $ => $
            .name
            .flat("store", $ => $
                .id
            )
        );

        type ViewType = TypeOf<typeof view>;

        expectTypeOf<ViewType>().toEqualTypeOf<{
            name: string;
            storeId: string | null;
        }>()
    });

    it("TestFlatAssociationWithUndefined", () => {
        
        const view = dto.view.nullAsUndefined(BOOK, $ => $
            .name
            .flat("store", $ => $
                .id
            )
        );

        type ViewType = TypeOf<typeof view>;

        expectTypeOf<ViewType>().toEqualTypeOf<{
            name: string;
            storeId?: string | undefined;
        }>()
    });

    it("TestReferenceKeyWithNull", () => {
        
        const view = dto.view(BOOK, $ => $
            .storeId.$as("fk")
            .name
        );

        type ViewType = TypeOf<typeof view>;

        expectTypeOf<ViewType>().toEqualTypeOf<{
            name: string;
            fk: string | null;
        }>()
    });

    it("TestReferenceKeyWithUndefined", () => {
        
        const view = dto.view.nullAsUndefined(BOOK, $ => $
            .storeId.$as("fk")
            .name
        );

        type ViewType = TypeOf<typeof view>;

        expectTypeOf<ViewType>().toEqualTypeOf<{
            name: string;
            fk?: string | undefined;
        }>()
    });

    it("TestEmbeddedReferenceKey", () => {

        const view = dto.view(ORDER_ITEM, $ => $
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

    it("TestAllScalars", () => {

        const view = dto.view(BOOK, $ => $
            .allScalars()
            .remove("price")
        );

        type ViewType = TypeOf<typeof view>;

        expectTypeOf<ViewType>().toEqualTypeOf<{
            id: number;
            name: string;
            edition: number;
        }>();
    });

    it("TestAllScalarsWithEmbedded", () => {

        const view = dto.view(ORDER, $ => $
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

    it("TestDefaultEmbedded", () => {
        
        const view = dto.view(BOOK, $ => $
            .allScalars()
            .authors($ => $
                .id
                .name()
            )
        );
        type ViewType = TypeOf<typeof view>;

        expectTypeOf<ViewType>().toEqualTypeOf<{
            id: number;
            name: string;
            edition: number;
            price: number;
            authors: {
                id: number;
                name: {
                    firstName: string;
                    lastName: string;
                };
            }[];
        }>();
    });

    it("TestRecursiveWithNull", () => {

        const view = dto.view((TREE_NODE), $ => $
            .allScalars() // Before recursion
            .recursive("parentNode")
            .recursive("childNodes")
        );
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "parentNode" | "childNodes"
        >();
        expectTypeOf<keyof Exclude<ViewType["parentNode"], null>>().toEqualTypeOf<
            "id" | "name" | "parentNode"
        >();
        expectTypeOf<keyof ElementOf<ViewType["childNodes"]>>().toEqualTypeOf<
            "id" | "name" | "childNodes"
        >();

        make<ViewType>().parentNode?.parentNode?.parentNode;
        make<ViewType>().childNodes[0]?.childNodes[0]?.childNodes[0];
    });

    it("TestRecursiveWithUndefined", () => {

        const view = dto.view.nullAsUndefined((TREE_NODE), $ => $
            .allScalars() // Before recursion
            .recursive("parentNode")
            .recursive("childNodes")
        );
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "parentNode" | "childNodes"
        >();
        expectTypeOf<keyof Exclude<ViewType["parentNode"], undefined>>().toEqualTypeOf<
            "id" | "name" | "parentNode"
        >();
        expectTypeOf<keyof ElementOf<ViewType["childNodes"]>>().toEqualTypeOf<
            "id" | "name" | "childNodes"
        >();

        make<ViewType>().parentNode?.parentNode?.parentNode;
        make<ViewType>().childNodes[0]?.childNodes[0]?.childNodes[0];
    });

    it("TestRecursiveWithAliasAndNull", () => {

        const view = dto.view((TREE_NODE), $ => $
            .recursive({prop: "parentNode", alias: "up"})
            .recursive({prop: "childNodes", alias: "downs"})
            .allScalars() // After recursion
        );
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "up" | "downs"
        >();
        expectTypeOf<keyof Exclude<ViewType["up"], null>>().toEqualTypeOf<
            "id" | "name" | "up"
        >();
        expectTypeOf<keyof ElementOf<ViewType["downs"]>>().toEqualTypeOf<
            "id" | "name" | "downs"
        >();

        make<ViewType>().up?.up?.up;
        make<ViewType>().downs[0]?.downs[0]?.downs[0];
    });

    it("TestRecursiveWithAliasAndUndefined", () => {

        const view = dto.view.nullAsUndefined((TREE_NODE), $ => $
            .recursive({prop: "parentNode", alias: "up"})
            .recursive({prop: "childNodes", alias: "downs"})
            .allScalars() // After recursion
        );
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "up" | "downs"
        >();
        expectTypeOf<keyof Exclude<ViewType["up"], undefined>>().toEqualTypeOf<
            "id" | "name" | "up"
        >();
        expectTypeOf<keyof ElementOf<ViewType["downs"]>>().toEqualTypeOf<
            "id" | "name" | "downs"
        >();

        make<ViewType>().up?.up?.up;
        make<ViewType>().downs[0]?.downs[0]?.downs[0];
    });
});