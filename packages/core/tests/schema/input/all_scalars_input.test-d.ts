import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR } from "../../model/model";
import { InputAssociationMembers } from "@/schema/dto/api";

describe("AllScalarsInput", () => {

    it("simple", () => {
        const input = dto.input(AUTHOR, c => [
            c.$allScalars
        ]);
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            id: number;
            name: {
                firstName: string;
                lastName: string;
            };
            gender: "FEMALE" | "MALE";
        }>();
        expectTypeOf<keyof InputAssociationMembers<typeof input>>().toEqualTypeOf<
            never
        >();
    });

    it("exclude", () => {
        const input = dto.input(AUTHOR, c => [
            c.$allScalars.exclude("gender")
        ])
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            id: number;
            name: {
                firstName: string;
                lastName: string;
            };
        }>();
        expectTypeOf<keyof InputAssociationMembers<typeof input>>().toEqualTypeOf<
            never
        >();
    });

    it("excludeArr", () => {
        const input = dto.input(AUTHOR, c => [
            c.$allScalars.exclude("id", "gender")
        ])
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            name: {
                firstName: string;
                lastName: string;
            };
        }>();
        expectTypeOf<keyof InputAssociationMembers<typeof input>>().toEqualTypeOf<
            never
        >();
    });
});