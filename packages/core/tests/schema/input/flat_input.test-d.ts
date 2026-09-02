import { dto } from "@/index";
import { describe, it, expectTypeOf } from "vitest";
import { BOOK } from "../../model/model";
import { InputAssociationMembers, TypeOf } from "@/schema/dto/api";

describe("FlatInputTest", () => {
    it("flat", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.$flat("store").prefix("owner").with(c => [
                c.name.key(),
                c.version.mask({insert: false})
            ])
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            edition: number;
            name: string;
            ownerName: string | null | undefined;
            ownerVersion: number | null | undefined;
        }>();
        expectTypeOf<keyof InputAssociationMembers<typeof input>>().toEqualTypeOf<
            "store"
        >();
    });
});