import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR, BOOK, LEARNING_LINK } from "../model/model";
import { dsl, SqlClient } from "@/dsl";

describe("MergeTest", () => {

    function createSqlClient(): SqlClient {
        throw new Error("Not implemented");
    }

    const sqlClient = createSqlClient();

    it("mergeRows", async () => {
        const merge = sqlClient
            .createMerge(BOOK)
            .using("name", "edition", "price", "storeId")
            .values( 
                ["GraphQL in Action", 2, 59.9, "2"],
                ["Learning GraphQL", 3, 49.9, "1"]
            )
            .on(ctx => 
                dsl.tuple(
                    ctx.old.name, ctx.old.edition
                ).eq([
                    ctx.new.name, ctx.new.edition
                ])
            )
            .matched(ctx => ctx
                .update("price", ctx.new.price)
                .update("storeId", ctx.new.storeId)
            )
            .unmatched(ctx => ctx
                .insertAll()
            );
        const ids = await merge.executeAndReturn("id");
        expectTypeOf<typeof ids>().toEqualTypeOf<ReadonlyArray<number>>();
    });

    it("mergeBaseQuery", async () => {
        const merge = sqlClient
            .createMerge(BOOK)
            .using(
                dsl.baseQuery(AUTHOR, (q, a) => {
                    return q.select({
                        theName: a.name().firstName,
                        theEdition: dsl.constant(3),
                        thePrice: dsl.native.num `30 + random() * 70`,
                        theStoreId: dsl.literal("2", "AS_NUMBER")
                    });
                })
            )
            .on(ctx => 
                dsl.tuple(
                    ctx.old.name, ctx.old.edition
                ).eq([
                    ctx.new.theName, ctx.new.theEdition
                ])
            )
            .matched(ctx => ctx
                .update("price", ctx.new.thePrice.plus(ctx.old.price))
                .update("storeId", ctx.new.theStoreId)
            )
            .unmatched(ctx => ctx
                .insert("name", ctx.new.theName)
                .insert("edition", ctx.new.theEdition)
                .insert("price", ctx.new.thePrice)
                .insert("storeId", ctx.new.theStoreId)
            );
        const ids = await merge.executeAndReturn("id");
        expectTypeOf<typeof ids>().toEqualTypeOf<ReadonlyArray<number>>();
    });

    it("mergeAssociation", async() => {
        const merge = sqlClient
            .createMerge(dsl.associationModel(BOOK, "authors"))
            .using(
                dsl.baseQuery(LEARNING_LINK, (q, link) => {
                    return q.select({
                        a: link.studentId,
                        b: link.courseId
                    });
                })
            )
            .on(ctx => 
                dsl.tuple(
                    ctx.old.sourceId, ctx.old.targetId
                ).eq([
                    ctx.new.a, ctx.new.b
                ])
            )
            .matched()
            .unmatched(ctx => ctx
                .insert("sourceId", ctx.new.a)
                .insert("targetId", ctx.new.b)
            )
        const result = await merge.execute();
        expectTypeOf<typeof result>().toEqualTypeOf<void>();
    });
});