import { describe, it, expectTypeOf } from "vitest";
import { CATEGORY, TREE_NODE } from "../../model/model";
import { dto, TypeOf } from "@/index";

describe("RecursiveTest", () => {

    it("simple", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode"),
            c.$recursive("childNodes")
        ]);
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "parentNode" | "childNodes"
        >();
        expectTypeOf<keyof Exclude<ViewType["parentNode"], null>>().toEqualTypeOf<
            "id" | "name" | "parentNode"
        >();
        expectTypeOf<keyof ElementOf<ViewType["childNodes"]>>().toEqualTypeOf<
            "id" | "name" | "childNodes"
        >();
        expectTypeOf<null extends ViewType["childNodes"] ? "NULLABLE" : "NONNULL">().toEqualTypeOf<
            "NONNULL"
        >();

        make<ViewType>().parentNode?.parentNode?.parentNode;
        make<ViewType>().childNodes[0]!.childNodes[0]!.childNodes[0];
    });

    it("alias", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs")
        ]);
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "upObj" | "downObjs"
        >();
        expectTypeOf<keyof Exclude<ViewType["upObj"], null>>().toEqualTypeOf<
            "id" | "name" | "upObj"
        >();
        expectTypeOf<keyof ElementOf<ViewType["downObjs"]>>().toEqualTypeOf<
            "id" | "name" | "downObjs"
        >();
        expectTypeOf<null extends ViewType["downObjs"] ? "NULLABLE" : "NONNULL">().toEqualTypeOf<
            "NONNULL"
        >();

        make<ViewType>().upObj?.upObj?.upObj;
        make<ViewType>().downObjs[0]!.downObjs[0]!.downObjs[0];
    });

    it("aliasWithDepth", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs").depth(3)
        ]);
        type ViewType = TypeOf<typeof view>;
        expectTypeOf<keyof ViewType>().toEqualTypeOf<
            "id" | "name" | "upObj" | "downObjs"
        >();
        expectTypeOf<keyof Exclude<ViewType["upObj"], null>>().toEqualTypeOf<
            "id" | "name" | "upObj"
        >();
        expectTypeOf<keyof ElementOf<ViewType["downObjs"]>>().toEqualTypeOf<
            "id" | "name" | "downObjs"
        >();
        expectTypeOf<null extends ViewType["downObjs"] ? "NULLABLE" : "NONNULL">().toEqualTypeOf<
            "NULLABLE"
        >();

        make<ViewType>().upObj?.upObj?.upObj;
        make<ViewType>().downObjs![0]!.downObjs![0]!.downObjs![0];
    });

    it("drivedRoot", () => {
        const view = dto.view(CATEGORY, c => [
            c.name,
            c.manager,
            c.$recursive("childNodes")
        ])
    });
});

type ElementOf<T> = 
    T extends ReadonlyArray<infer R> 
        ? R 
        : never;

function make<T>(): T {
    throw new Error("Not implemented");
}