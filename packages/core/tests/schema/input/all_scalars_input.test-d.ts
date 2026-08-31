import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR } from "../../model/model";

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
    });
});