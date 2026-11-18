import { MergeSourceTable } from "@/dsl/merge_source_table";
import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR, BOOK, ORDER, ORDER_ITEM } from "../model/model";
import { dsl, NumExpression, StrExpression } from "@/dsl";

describe("MergeSourceTableTest", () => {

    it("partialEmbeeded", () => {
        
        type PartialAuthorType = MergeSourceTable<typeof AUTHOR, "id" | "name.firstName">;
        expectTypeOf<Exclude<keyof PartialAuthorType, "__type">>().toEqualTypeOf<
            "id" | "name"
        >();
        expectTypeOf<PartialAuthorType["id"]>().toEqualTypeOf<NumExpression<number>>();

        type NameType = ReturnType<PartialAuthorType["name"]>;
        expectTypeOf<keyof NameType>().toEqualTypeOf<"firstName">();
        expectTypeOf<NameType["firstName"]>().toEqualTypeOf<StrExpression<string>>();
    });

    it("partialWithReferenceKey", () => {
        type PartialBookType = MergeSourceTable<typeof BOOK, "__discriminator" | "storeId">;
        expectTypeOf<Exclude<keyof PartialBookType, "__type">>().toEqualTypeOf<
            "__discriminator" | "storeId"
        >();
        expectTypeOf<PartialBookType["__discriminator"]>().toEqualTypeOf<StrExpression<string>>();
        expectTypeOf<PartialBookType["storeId"]>().toEqualTypeOf<NumExpression<string | null>>();
    });

    it("partialWithEmbeddedReferenceKey", () => {
        
        type PartialOrderItemType = MergeSourceTable<typeof ORDER_ITEM, "orderId.y.a">;
        expectTypeOf<Exclude<keyof PartialOrderItemType, "__type">>().toEqualTypeOf<
            "orderId"
        >();

        type OrderIdType = ReturnType<PartialOrderItemType["orderId"]>;
        expectTypeOf<keyof OrderIdType>().toEqualTypeOf<"y">();

        type yType = ReturnType<OrderIdType["y"]>;
        expectTypeOf<keyof yType>().toEqualTypeOf<"a">();
        expectTypeOf<yType["a"]>().toEqualTypeOf<NumExpression<number>>();
    });

    it("assocation", () => {
        const model = dsl.associationModel(BOOK, "authors");
        type PartialAssocationType = MergeSourceTable<typeof model, "sourceId">;
        expectTypeOf<Exclude<keyof PartialAssocationType, "__type">>().toEqualTypeOf<
            "sourceId"
        >();
        expectTypeOf<PartialAssocationType["sourceId"]>().toEqualTypeOf<NumExpression<number>>();
    });

    it("embeddedAssocation", () => {
        const model = dsl.associationModel(ORDER, "tags");
        type PartialAssocationType = MergeSourceTable<typeof model, "sourceId.y.b" | "targetId.high">;
        expectTypeOf<Exclude<keyof PartialAssocationType, "__type">>().toEqualTypeOf<
            "sourceId" | "targetId"
        >();

        type SourceIdType = ReturnType<PartialAssocationType["sourceId"]>;
        expectTypeOf<keyof SourceIdType>().toEqualTypeOf<"y">();
        
        type yType = ReturnType<SourceIdType["y"]>;
        expectTypeOf<keyof yType>().toEqualTypeOf<"b">();
        expectTypeOf<yType["b"]>().toEqualTypeOf<NumExpression<number>>();
    });

    it("withoutEmbeddedReferenceKey", () => {
        
        type PartialOrderItemType = MergeSourceTable<typeof ORDER_ITEM, "id">;
        expectTypeOf<Exclude<keyof PartialOrderItemType, "__type">>().toEqualTypeOf<"id">();
        expectTypeOf<PartialOrderItemType["id"]>().toEqualTypeOf<NumExpression<number>>();
    });
});