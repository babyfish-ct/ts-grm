import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { TREE_NODE } from "../../model/model";
import { InputAssociationMembers } from "@/schema/dto/api";

describe("RecursiveTest", () => {

    it("simple", () => {

        const input = dto.input(TREE_NODE, c => [
            c.name.key(),
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs")
        ]);
        type UpObjBody = {
            name: string;
            upObj: UpObjBody | null | undefined;
        };
        type DownObjBody = {
            name: string;
            downObjs: Array<DownObjBody> | null | undefined;
        };
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            name: string;
            upObj: UpObjBody | null | undefined;
            downObjs: Array<DownObjBody> | null | undefined;
        }>();
        expectTypeOf<keyof InputAssociationMembers<typeof input>>().toEqualTypeOf<
            "parentNode*" | "childNodes*"
        >();
    });
});