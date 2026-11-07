import { dsl, Table } from "@/dsl";
import { describe, expectTypeOf, it } from "vitest";
import { BOOK } from "../model/model";

describe("JoinPolicyTest", () => {

    it("arbitraryEntity", () => {
        type T = Table<typeof BOOK, "ARBITRARY">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "as" | "is" | "join" | "association" | "match"| "count" | "fetch" 
            | "every" | "none" | "noneIf" | "some" | "someIf"
            | "id" | "name" | "edition" | "price" | "store" | "storeId" | "authors"
        >();
        expectTypeOf<HasRisk<T["authors"]>>().toEqualTypeOf<false>();
        expectTypeOf<HasRisk<T["association"]>>().toEqualTypeOf<false>();
        expectTypeOf<HasRisk<T["join"]>>().toEqualTypeOf<false>();
    });

    it("referenceEntity", () => {
        type T = Table<typeof BOOK, "REFERENCE">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "as" | "is" | "join" | "association" | "match"| "count" | "fetch" 
            | "every" | "none" | "noneIf" | "some" | "someIf"
            | "id" | "name" | "edition" | "price" | "store" | "storeId" | "authors"
        >();
        expectTypeOf<HasRisk<T["authors"]>>().toEqualTypeOf<true>();
        expectTypeOf<HasRisk<T["association"]>>().toEqualTypeOf<true>();
        expectTypeOf<HasRisk<T["join"]>>().toEqualTypeOf<true>();
    });

    it("noneEntity", () => {
        type T = Table<typeof BOOK, "NONE">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "as" | "is" | "match"| "count" | "fetch" 
            | "every" | "none" | "noneIf" | "some" | "someIf"
            | "id" | "name" | "edition" | "price" | "storeId"
        >();
    });

    it("arbitraryMiddleTable", () => {
        const association = dsl.associationModel(BOOK, "authors");
        type T = Table<typeof association, "ARBITRARY">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "source" | "target" | "sourceId" | "targetId"
        >();
    });

    it("referenceMiddleTable", () => {
        const association = dsl.associationModel(BOOK, "authors");
        type T = Table<typeof association, "REFERENCE">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "source" | "target" | "sourceId" | "targetId"
        >();
    });

    it("referenceMiddleTable", () => {
        const association = dsl.associationModel(BOOK, "authors");
        type T = Table<typeof association, "REFERENCE">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "source" | "target" | "sourceId" | "targetId"
        >();
    });

    it("referenceMiddleTable", () => {
        const association = dsl.associationModel(BOOK, "authors");
        type T = Table<typeof association, "REFERENCE">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "source" | "target" | "sourceId" | "targetId"
        >();
    });

    it("referenceMiddleTable", () => {
        const association = dsl.associationModel(BOOK, "authors");
        type T = Table<typeof association, "NONE">;
        type Keys = Exclude<keyof T, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "sourceId" | "targetId"
        >();
    });
});

type HasRisk<TFun extends (...args: any) => any> =
    keyof ReturnType<TFun> extends "$acceptMulti"
        ? true
        : false;