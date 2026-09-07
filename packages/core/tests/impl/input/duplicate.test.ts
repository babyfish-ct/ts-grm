import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK } from "../../model/model";

describe("DuplicatedTest", () => {

    it("duplicate", () => {
        expect(() => {
            dto.input(BOOK, c => [
                c.store,
                c.$flatRef("store", c => [
                    c.name
                ])
            ])
        }).toThrow(
            `Input DTO for "Book" does not accept duplicated fields based on "Book.storeId"`
        );
    });
});