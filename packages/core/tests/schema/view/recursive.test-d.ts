import { describe, it, expectTypeOf } from "vitest";
import { CATEGORY, TREE_NODE } from "../../model/model";
import { __AllModelMembers, __DtoMapping, __DtoType, __UnionToIntersection, __UnrecursiveDtoType, dto, TypeOf } from "@/index";

describe("RecursiveTest", () => {

    it("simple", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode"),
            c.$recursive("childNodes")
        ]);
        type ParentNodeBody = {
            id: number;
            name: string;
            parentNode: ParentNodeBody | null;
        };
        type ChildNodeBody = {
            id: number;
            name: string;
            childNodes: Array<ChildNodeBody>;
        };
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            name: string;
            parentNode: ParentNodeBody | null;
            childNodes: Array<ChildNodeBody>;
        }>();
    });

    it("alias", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs")
        ]);
        type ParentNodeBody = {
            id: number;
            name: string;
            upObj: ParentNodeBody | null;
        };
        type ChildNodeBody = {
            id: number;
            name: string;
            downObjs: Array<ChildNodeBody>;
        };
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            name: string;
            upObj: ParentNodeBody | null;
            downObjs: Array<ChildNodeBody>;
        }>();
    });

    it("aliasWithDepth", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs").depth(3)
        ]);
        type ParentNodeBody = {
            id: number;
            name: string;
            upObj: ParentNodeBody | null;
        };
        type ChildNodeBody = {
            id: number;
            name: string;
            downObjs: Array<ChildNodeBody> | null;
        };
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            name: string;
            upObj: ParentNodeBody | null;
            downObjs: Array<ChildNodeBody> | null;
        }>();
    });

    it("drivedRoot", () => {
        const view = dto.view(CATEGORY, c => {
            return [
                c.id,
                c.name,
                c.manager,
                c.$recursive("parentNode"),
                c.$recursive("childNodes")
            ]
        });
        type ParentNodeBody = {
            id: number;
            name: string;
            parentNode: ParentNodeBody | null;
        };
        type ChildNodeBody = {
            id: number;
            name: string;
            childNodes: Array<ChildNodeBody>;
        };
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            name: string;
            manager: string;
            parentNode: ParentNodeBody | null;
            childNodes: Array<ChildNodeBody>;
        }>();
    });
});
