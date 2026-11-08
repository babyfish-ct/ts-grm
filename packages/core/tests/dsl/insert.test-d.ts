import { SqlClient } from "@/dsl/sql_client";
import { describe, expectTypeOf, it } from "vitest";
import { AUTHOR, BOOK, LEARNING_LINK } from "../model/model";
import { dsl } from "@/dsl";

describe("InsertTest", () => {

    function createSqlClient(): SqlClient {
        throw new Error("Not implemented");
    }

    const sqlClient = createSqlClient();
    
    it("insertRows", async() => {
        const insert = sqlClient
            .createInsert(BOOK)
            .using("name", "edition", "price", "storeId")
            .values(
                ["YugabyteDB Guide", 3, 79.9, "1"],
                ["CockroachDB Guide", 3, 69.9, "1"]
            );
        const ids = await insert.executeAndReturn("id");
        expectTypeOf<typeof ids>().toEqualTypeOf<ReadonlyArray<number>>();
    });

    it("insertBaseQuery", async() => {
        const insert = sqlClient
            .createInsert(BOOK)
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
            .do(ctx => ctx
                .insert("name", ctx.new.theName)
                .insert("edition", ctx.new.theEdition)
                .insert("price", ctx.new.thePrice)
                .insert("storeId", ctx.new.theStoreId)
            );
        const ids = await insert.executeAndReturn("id");
        expectTypeOf<typeof ids>().toEqualTypeOf<ReadonlyArray<number>>();
    });

    it("insertAssociation", async() => {
        const insert = sqlClient
            .createInsert(dsl.associationModel(BOOK, "authors"))
            .using(
                dsl.baseQuery(LEARNING_LINK, (q, link) => {
                    return q.select({
                        a: link.studentId,
                        b: link.courseId
                    });
                })
            )
            .do(ctx => ctx
                .insert("sourceId", ctx.new.a)
                .insert("targetId", ctx.new.b)
            );
        const result = await insert.execute();
        expectTypeOf<typeof result>().toEqualTypeOf<void>();
    })
});