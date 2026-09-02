import { __Prettify, dto, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { CATEGORY, ITEM, TREE_NODE } from "../../model/model";
import { InputAssociationMembers } from "@/schema/dto/api";

describe("PolymorphismInputTest", () => {

    it("polymorphism", () => {
        const input = dto.input(TREE_NODE, c => [
            c.name.key(),
            c.$instanceOf(CATEGORY, c => [
                c.manager
            ]),
            c.$instanceOf(ITEM, c => [
                c.price,
                c.tags.with(c => [
                    c.name.key()
                ])
            ]),
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs")
        ]);
        type UpObjBody = {
            __typename: "Category";
            name: string;
            manager: string;
            upObj: UpObjBody | null | undefined;
        } | {
            __typename: "Item";
            name: string;
            price: number;
            tags: {
                name: string;
            }[];
            upObj: UpObjBody | null | undefined;
        };
        type DownObjBody = {
            __typename: "Category";
            name: string;
            manager: string;
            downObjs: DownObjBody[] | null | undefined;
        } | {
            __typename: "Item";
            name: string;
            price: number;
            tags: {
                name: string;
            }[];
            downObjs: DownObjBody[] | null | undefined;
        };
        expectTypeOf<TypeOf<typeof input>>().toEqualTypeOf<{
            __typename: "Category";
            name: string;
            manager: string;
            upObj: UpObjBody | null | undefined;
            downObjs: DownObjBody[] | null | undefined;
        } | {
            __typename: "Item";
            name: string;
            price: number;
            tags: {
                name: string;
            }[];
            upObj: UpObjBody | null | undefined;
            downObjs: DownObjBody[] | null | undefined;
        }>();
        expectTypeOf<keyof InputAssociationMembers<typeof input>>().toEqualTypeOf<
            "childNodes*" | "parentNode*" | "tags"
        >();
    });
});