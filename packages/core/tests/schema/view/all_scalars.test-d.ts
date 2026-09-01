import { describe, it } from "node:test";
import { AUTHOR } from "../../model/model";
import { expectTypeOf } from "vitest";
import { dto, TypeOf } from "@/index";

describe("AllScalarsTest", () => {

    it("simple", () => {
        const view = dto.view(AUTHOR, c => [
            c.$allScalars
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            name: {
                firstName: string;
                lastName: string;
            };
            gender: "FEMALE" | "MALE";
        }>();
    });

    it("exclude", () => {
        const view = dto.view(AUTHOR, c => [
            c.$allScalars.exclude("gender")
        ])
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            name: {
                firstName: string;
                lastName: string;
            };
        }>();
    });

    it("excludeArr", () => {
        const view = dto.view(AUTHOR, c => [
            c.$allScalars.exclude("id", "gender")
        ])
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            name: {
                firstName: string;
                lastName: string;
            };
        }>();
    });
});