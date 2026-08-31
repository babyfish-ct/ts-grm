import { dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { TREE_NODE } from "../../model/model";
import { SelectableAssocaitionPaths } from "@/schema/dto/api";

describe("RecursiveTest", () => {

    it("simple", () => {

        const input = dto.input(TREE_NODE, c => [
            c.name.use({key: true}),
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs")
        ]);
        type ParentNodeBody = {
            name: string;
            upObj: ParentNodeBody | null | undefined;
        };
        type ChildNodeBody = {
            name: string;
            downObjs: Array<ChildNodeBody> | null | undefined;
        };
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            name: string;
            upObj: ParentNodeBody | null | undefined;
            downObjs: Array<ChildNodeBody> | null | undefined;
        }>();
        expectTypeOf<SelectableAssocaitionPaths<typeof input>>().toEqualTypeOf<
            "$all" | "$root" | "parentNode*" | "childNodes*"
        >();
    });
});