import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR, BOOK, LEARNING_LINK } from "../../model/model";
import z from "zod";

describe("ScalarInputTest", () => {

    it("simple", () => {
        const input = dto.input(BOOK, c => [
            c.name.use({key: true}),
            c.edition.use({key: true})
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            name: string;
            edition: number;
        }>();
    });

    it("nullish", () => {
        const input = dto.input(LEARNING_LINK, c => [
            c.id,
            c.score
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            id: number;
            score: number | null | undefined;
        }>();
    });

    it("alias", () => {
        const input = dto.input(BOOK, c => [
            c.id.as("bookId"),
            c.name.as("bookName"),
            c.edition.as("bookEdition")
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            bookId: number;
            bookName: string;
            bookEdition: number;
        }>();
    });

    it("input", () => {
        const input = dto.input(AUTHOR, c => [
            c.id,
            c.gender.mapInput(z.enum(["BOY", "GIRL"]), value => {
                return value === "BOY" ? "MALE" : "FEMALE"
            })
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            gender: "BOY" | "GIRL";
            id: number;
        }>();
    });
});