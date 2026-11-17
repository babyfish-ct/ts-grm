import { SqlClient } from "@/dsl/sql_client";
import { describe, expectTypeOf, it } from "vitest";
import { BOOK, LEARNING_LINK, ORDER, ORDER_ITEM, PAPER_BOOK } from "../model/model";
import { dsl } from "@/dsl";
import { __FlattenMembers } from "@/auxiliary_types";
import { __AllModelMembers, __MutatedReferenceKeyMembers } from "@/index";

describe("InsertTest", () => {

    function createSqlClient(): SqlClient {
        throw new Error("Not implemented");
    }

    const sqlClient = createSqlClient();
    
    it("insertRow", async() => {
        const insert = sqlClient
            .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
            .row("PaperBook", "YugabyteDB Guide", 3, 79.9, "1");
        const result1 = await insert.returning("id").execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<number>
        }>();
        const result2 = await insert.returning("id", "edition").execute();
        expectTypeOf<typeof result2>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<[number, number]>
        }>();
    });

    it("insertRows", async() => {
        const insert = sqlClient
            .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
            .rows(
                ["PaperBook", "YugabyteDB Guide", 3, 79.9, "1"],
                ["PaperBook", "CockroachDB Guide", 3, 69.9, "1"]
            );
        const result1 = await insert.returning("id").execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<number>
        }>();
        const result2 = await insert.returning("id", "edition").execute();
        expectTypeOf<typeof result2>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<[number, number]>
        }>();
    });

    it("insertBaseQuery", async() => {
        const insert = sqlClient
            .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
            .using(ctx =>
                ctx.source(BOOK, (q, book) => {
                    q.where(book.edition.eq(3));
                    return q.select({
                        __discriminator: book.__discriminator,
                        name: book.name,
                        edition: book.edition.plus(1),
                        price: book.price,
                        storeId: book.storeId
                    });
                })
            );
        const result1 = await insert.returning("id").execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<number>
        }>();
        const result2 = await insert.returning("id", "edition").execute();
        expectTypeOf<typeof result2>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<[number, number]>
        }>();
    });

    it("insertAssociation", async() => {
        const insert = sqlClient
            .createInsert(dsl.associationModel(BOOK, "authors"), "sourceId", "targetId")
            .using(ctx =>
                ctx.unionAll(
                    ctx.source(LEARNING_LINK, (q, link) => {
                        return q.select({
                            sourceId: link.studentId,
                            targetId: link.courseId
                        });
                    }),
                    ctx.source(LEARNING_LINK, (q, link) => {
                        return q.select({
                            sourceId: link.studentId,
                            targetId: link.courseId
                        });
                    })
                )
            );
        const result1 = await insert.execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
        }>();
        const result2 = await insert.execute("NOTHING");
        expectTypeOf<typeof result2>().toEqualTypeOf<void>();
    });

    it("insertEmbeddedScalar", async () => {
        const insert = sqlClient
            .createInsert(PAPER_BOOK, "name", "edition", "price", "size.width", "size.height")
            .row("YugabyteDB", 3, 59.9, 120, 80);
        const result1 = await insert.returning("id", "size.width", "size.height").execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
            readonly rows: ReadonlyArray<[number, number, number]>;
        }>();
        const result2 = await insert.execute("NOTHING");
        expectTypeOf<typeof result2>().toEqualTypeOf<void>();
    });

    it("insertEmbeddedReferenceKey", async() => {
        const insert = sqlClient
            .createInsert(ORDER_ITEM, "id", "orderId.x", "orderId.y.a", "orderId.y.b")
            .row(1, 1, 1, 1);
        const result1 = await insert.execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
        }>();
        const result2 = await insert.execute("NOTHING");
        expectTypeOf<typeof result2>().toEqualTypeOf<void>();
    });

    it("insertEmbeddedAssociation", async () => {
        const insert = sqlClient
            .createInsert(
                dsl.associationModel(ORDER, "tags"), 
                "sourceId.x", 
                "sourceId.y.b", 
                "sourceId.y.b",
                "targetId.low",
                "targetId.high"
            )
            .row(1, 1, 1, 1, 1);
        const result1 = await insert.execute();
        expectTypeOf<typeof result1>().toEqualTypeOf<{
            readonly affectedRowCount: number;
        }>();
        const result2 = await insert.execute("NOTHING");
        expectTypeOf<typeof result2>().toEqualTypeOf<void>();
    });
});