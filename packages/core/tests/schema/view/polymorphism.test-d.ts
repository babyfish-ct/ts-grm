import { describe, expectTypeOf, it } from "vitest";
import { BOOK, BOOK_STORE, ELECTRONIC_BOOK, ONLINE_BOOK_STORE, PAPER_BOOK, PDF_ELECTRONIC_BOOK, PHYSICAL_BOOK_STORE } from "../../model/model";
import { dto, TypeOf } from "@/index";

describe("PolymorephismTest", () => {

    it("simple", () => {});

    it("simple", () => {
        const view = dto.view(BOOK_STORE, c => [
            c.id,
            c.$instanceOf(PHYSICAL_BOOK_STORE, c => [
                c.city
            ]),
            c.$instanceOf(ONLINE_BOOK_STORE, c => [
                c.url
            ])
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            __typename: "OnlineBookStore";
            id: string;
            url: string;
        } | {
            __typename: "PhysicalBookStore";
            city: string;
            id: string;
        }>();
    });

    it("deep", () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.$instanceOf(ELECTRONIC_BOOK, c => [
                c.address,
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<
            {
                __typename: "Book";
                edition: number;
                name: string;
            } | {
                __typename: "ElectronicBook";
                address: string;
                edition: number;
                name: string;
            } | {
                __typename: "PdfElectronicBook";
                address: string;
                edition: number;
                name: string;
                pdfVersion: string | null;
            }
        >();
    });

    it("deepAndWide", () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.$instanceOf(PAPER_BOOK, c => [
                c.size
            ]),
            c.$instanceOf(ELECTRONIC_BOOK, c => [
                c.address,
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<
            {
                __typename: "Book";
                name: string;
                edition: number;
            } | {
                __typename: "PaperBook";
                name: string;
                edition: number;
                size: {
                    width: number;
                    height: number;
                };
            } | {
                __typename: "ElectronicBook";
                name: string;
                edition: number;
                address: string;
            } | {
                __typename: "PdfElectronicBook";
                name: string;
                edition: number;
                address: string;
                pdfVersion: string | null;
            }
        >();
    });

    it("associatedDeepAndWide", () => {
        const view = dto.view(BOOK_STORE, c => [
            c.$allScalars,
            c.books.with(c => [
                c.name,
                c.edition,
                c.$instanceOf(PAPER_BOOK, c => [
                    c.size
                ]),
                c.$instanceOf(ELECTRONIC_BOOK, c => [
                    c.address,
                    c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                        c.pdfVersion
                    ])
                ])
            ])
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: string;
            name: string;
            version: number;
            books: ({
                __typename: "Book";
                edition: number;
                name: string;
            } | {
                __typename: "PaperBook";
                edition: number;
                name: string;
                size: {
                    height: number;
                    width: number;
                };
            } | {
                __typename: "ElectronicBook";
                address: string;
                edition: number;
                name: string;
            } | {
                __typename: "PdfElectronicBook";
                address: string;
                edition: number;
                name: string;
                pdfVersion: string | null;
            })[];
        }>();
    })
});