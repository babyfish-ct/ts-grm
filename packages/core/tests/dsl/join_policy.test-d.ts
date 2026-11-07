import { dsl, Table } from "@/dsl";
import { describe, expectTypeOf, it } from "vitest";
import { BOOK } from "../model/model";

describe("JoinPolicyTest", () => {

    it("arbitraryEntity", () => {
        type Keys = Exclude<keyof Table<typeof BOOK, "ARBITRARY">, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "as" | "is" | "join" | "association" | "match"| "count" | "fetch" 
            | "every" | "none" | "noneIf" | "some" | "someIf"
            | "id" | "name" | "edition" | "price" | "store" | "storeId" | "authors"
        >();
    });

    it("referenceEntity", () => {
        type Keys = Exclude<keyof Table<typeof BOOK, "REFERENCE">, "__type">;
        expectTypeOf<Keys>().toEqualTypeOf<
            "as" | "is" | "join" | "association" | "match"| "count" | "fetch" 
            | "every" | "none" | "noneIf" | "some" | "someIf"
            | "id" | "name" | "edition" | "price" | "store" | "storeId" | "authors"
        >();
    });

    it("noneEntity", () => {
        type Keys = Exclude<keyof Table<typeof BOOK, "NONE">, "__type">;
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
