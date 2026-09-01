import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { BOOK } from "../../model/model";

describe("FoldInputTest", () => {

    it("fold", () => {
        const input = dto.input(BOOK, c => [
            c.$fold("scalars", c => [
                c.name.use({key: true}),
                c.edition.use({key: true})
            ]),
            c.$fold("associations", c => [
                c.store.as("owner").with(c => [
                    c.name.use({key: true}),
                    c.version.use({key: true})
                ]),
                c.authors.as("creators").with(c => [
                    c.name.use({key: true}),
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
    });
});