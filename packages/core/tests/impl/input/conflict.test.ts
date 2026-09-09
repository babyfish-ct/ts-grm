import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK } from "../../model/model";

describe("ConflictTest", () => {

    it("simple", () => {
        expect(() => {
            dto.input(BOOK, c => [
                c.store.with(c => [
                    c.id
                ]),
                c.$flatRef("store", c => [
                    c.name
                ])
            ])
        }).toThrow(
            `Input DTO for "Book" does not accept conflict property "Book.store"`
        );
    });

    it("referenceAndReferenceKey", () => {
        expect(() => {
            dto.input(BOOK, c => [
                c.storeId,
                c.$flatRef("store", c => [
                    c.name
                ])
            ])
        }).toThrow(
            `Input DTO for "Book" does not accept both reference "Book.store" and reference key "Book.storeId"`
        );
    });

    it("referenceKeyAndReference", () => {
        expect(() => {
            dto.input(BOOK, c => [
                c.$flatRef("store", c => [
                    c.name
                ]),
                c.storeId
            ])
        }).toThrow(
            `Input DTO for "Book" does not accept both reference "Book.store" and reference key "Book.storeId"`
        );
    });

    it("collectionAndAssociatedKeys", () => {
        expect(() => {
            dto.input(BOOK, c => [
                c.id,
                c.authors.with(c => [c.name]),
                c.$associatedKeys("authors", "authorIds")
            ])
        }).toThrow(
            `Input DTO for "Book" does not accept conflict property "Book.authors"`
        );
    });
});