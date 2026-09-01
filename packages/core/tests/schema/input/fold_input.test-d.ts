import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { BOOK } from "../../model/model";
import { SelectableAssocaitionPaths } from "@/schema/dto/api";

describe("FoldInputTest", () => {

    it("fold", () => {
        const input = dto.input(BOOK, c => [
            c.$fold("scalars", c => [
                c.name.key(),
                c.edition.key()
            ]),
            c.$fold("associations", c => [
                c.store.as("owner").with(c => [
                    c.name.key(),
                    c.version.key()
                ]),
                c.authors.as("creators").with(c => [
                    c.name.key(),
                    c.gender
                ])
            ])
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            associations: {
                owner: {
                    name: string;
                    version: number;
                } | null | undefined;
                creators: {
                    gender: "FEMALE" | "MALE";
                    name: {
                        firstName: string;
                        lastName: string;
                    };
                }[];
            };
            scalars: {
                name: string;
                edition: number;
            };
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            "$all" | "$root" | "store" | "authors"
        >();
    });
});