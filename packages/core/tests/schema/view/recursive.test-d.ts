import { describe, it, expectTypeOf } from "vitest";
import { CATEGORY, ITEM, TREE_NODE } from "../../model/model";
import { __AllModelMembers, __DtoMappingContract, __DtoType, __UnionToIntersection, __UnrecursiveDtoType, dto, TypeOf } from "@/index";

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

    it("drivedRootWithExplicitProps", () => {
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

    it("recursiveWithPolymorphism", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$instanceOf(CATEGORY, c => [
                c.manager
            ]),
            c.$instanceOf(ITEM, c => [
                c.price
            ]),
            c.$recursive("parentNode"),
            c.$recursive("childNodes").sort("name")
        ]);
        type ParentNodeBody = {
            __typename: "Category";
            id: number;
            name: string;
            manager: string;
            parentNode: ParentNodeBody | null;
        } | {
            __typename: "Item";
            id: number;
            name: string;
            price: number;
            parentNode: ParentNodeBody | null;
        };
        type ChildNodeBody = {
            __typename: "Category";
            id: number;
            name: string;
            manager: string;
            childNodes: Array<ChildNodeBody>;
        } | {
            __typename: "Item";
            id: number;
            name: string;
            price: number;
            childNodes: Array<ChildNodeBody>;
        };
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<
            {
                __typename: "Category";
                id: number;
                name: string;
                manager: string;
                parentNode: ParentNodeBody | null;
                childNodes: Array<ChildNodeBody>;
            } | {
                __typename: "Item";
                id: number;
                name: string;
                price: number;
                parentNode: ParentNodeBody | null;
                childNodes: Array<ChildNodeBody>;
            }
        >();
    });

    it("recusiveWithDrivedRootWithAllScalars", () => {
        const view = dto.view(CATEGORY, c => {
            return [
                c.$allScalars,
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
