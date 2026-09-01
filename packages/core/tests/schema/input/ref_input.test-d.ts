import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { BOOK } from "../../model/model";
import { SelectableAssocaitionPaths } from "@/schema/dto/api";

/*
 * Tests for short-associations
 */
describe("RefInputTest", () => {

    it("implicit", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.storeId,
            c.$associatedKeys("authors", "authorIds")
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            authorIds: number[];
            edition: number;
            name: string;
            storeId: string | null | undefined;
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            never
        >();
    });

    it("explicit", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.$ref("store", c => [
                c.name
            ]).as("owner"),
            c.$ref("authors", c => [
                c.name
            ]).as("creators"),
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            creators: {
                name: {
                    firstName: string;
                    lastName: string;
                };
            }[];
            edition: number;
            name: string;
            owner: {
                name: string;
            } | null | undefined;
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            never
        >();
    });
});