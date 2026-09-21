import { dto } from "@/index";
import { describe, it } from "vitest";
import { BOOK, BOOK_STORE, ELECTRONIC_BOOK, ORDER, ORDER_ITEM, PAPER_BOOK, PDF_ELECTRONIC_BOOK } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";

describe("InputMetadataTest", () => {

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
        const metadata = createInputMetadata(input.mapper);
        console.log(JSON.stringify(metadata, null, 4));
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
        const metadata = createInputMetadata(input.mapper);
        console.log(JSON.stringify(metadata, null, 4));
    });

    it("wideM2O", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
                c.id,
                c.name
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        console.log(JSON.stringify(metadata, null, 4));
    });

    it("o2m", () => {
        const input = dto.input(BOOK_STORE, c => [
            c.name.key(),
            c.version,
            c.books.with(c => [
                c.name.key(),
                c.edition.key(),
                c.price
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        console.log(JSON.stringify(metadata, null, 4));
    });

    it("wideO2M", () => {
        const input = dto.input(ORDER, c => [
            c.id,
            c.name,
            c.items.with(c => [
                c.id
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        console.log(JSON.stringify(metadata, null, 4));
    });

    it("m2m", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.name.key(),
                c.gender
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        console.log(JSON.stringify(metadata, null, 4));
    });
});