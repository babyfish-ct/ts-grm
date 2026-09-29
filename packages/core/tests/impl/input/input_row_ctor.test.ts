import { dto, TypeOf } from "@/index";
import { describe, it } from "vitest";
import { BOOK, ELECTRONIC_BOOK, PAPER_BOOK, PDF_ELECTRONIC_BOOK } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";

describe("InputRowCtorTest", () => {

    it("polymorphism", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
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
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                __typename: "PaperBook",
                size: {
                    width: 256,
                    height: 128
                }
            },
            {
                name: "Yubabyte DB",
                edition: 3,
                price: 44.9,
                __typename: "PdfElectronicBook",
                address: "https://www.manning.com/",
                pdfVersion: "2.0"
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        console.log(JSON.stringify(collection, null, 4));
    });

    it("m2o", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.store.with(c => [
                c.name.key(),
                c.version
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                store: {
                    name: "MANING",
                    version: 1
                }
            },
            {
                name: "Yugabyte DB",
                edition: 3,
                price: 34.9,
                store: {
                    name: "O'REIILY",
                    version: 1
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        let id = 100;
        for (const row of collection.preCollections[0]!.rows) {
            row.set(2, ++id);
        }
        console.log(collection.rows[0]!.constructor.toString());
        console.log(JSON.stringify(collection, null, 4));
    });
});