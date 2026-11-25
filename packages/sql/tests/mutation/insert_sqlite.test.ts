import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { AUTHOR, BOOK, LEARNING_LINK, ORDER, ORDER_ITEM } from "../model/model";
import { dsl } from "@ts-grm/core";
import { setRollbackOnly } from "./utils";

describe("InsertSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("insertEntity", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "Cockroach DB Guide", 1, 67.9, "2"],
                    ["PaperBook", "TiDB Guide", 1, 67.9, "2"]
                )
                .returning("id")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into BOOK(
                    TYPE,
                    NAME,
                    EDITION,
                    PRICE,
                    STORE_ID
                )
                values
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?)
                returning
                    ID
            `,
            args: [
                "PaperBook", "Cockroach DB Guide", 1, 67.9, "2", 
                "PaperBook", "TiDB Guide", 1, 67.9, "2"
            ],
            purpose: "insert"
        });
        expect(result).toEqual({ 
            affectedRowCount: 2, 
            rows: [ 101, 102 ] 
        });
    });

    it("insertEntityByBaseModel", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .using(ctx => 
                    ctx.source(BOOK, (q, book) => {
                        q.where(book.edition.eq(3));
                        return q.select({
                            __discriminator: dsl.literal("PaperBook"),
                            name: book.name,
                            edition: book.edition.plus(1),
                            price: book.price,
                            storeId: book.storeId
                        });
                    })
                )
                .returning("id", "name", "edition")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into BOOK(
                    TYPE,
                    NAME,
                    EDITION,
                    PRICE,
                    STORE_ID
                )
                select 
                    ?,
                    tb_1_.NAME,
                    tb_1_.EDITION + ?,
                    tb_1_.PRICE,
                    tb_1_.STORE_ID
                from BOOK tb_1_
                where 
                    tb_1_.EDITION = ?
                returning
                    ID,
                    NAME,
                    EDITION
            `,
            args: ["PaperBook", 1, 3],
            purpose: "insert"
        });
        expect(result).toEqual({
            affectedRowCount: 4,
            rows: [
                [ 101, 'Learning GraphQL', 4 ],
                [ 102, 'Effective TypeScript', 4 ],
                [ 103, 'YugabyteDB: The Definitive Guide', 4 ],
                [ 104, 'GraphQL in Action', 4 ]
            ]
        });
    });

    it("insertEntityByCteModelWithExportedTable", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .using("CTE", ctx => 
                    ctx.source(BOOK, (q, book) => {
                        q.where(book.edition.eq(3));
                        return q.select({
                            __discriminator: dsl.literal("PaperBook"),
                            name: book.name,
                            edition: book.edition.plus(1),
                            price: book.price,
                            storeId: book.storeId
                        });
                    })
                )
                .returning("id", "name", "edition")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                with 
                    __inserted_source(c1, c2, c3, c4, c5) as (
                        select 
                            ?,
                            tb_1_.NAME,
                            tb_1_.EDITION + ?,
                            tb_1_.PRICE,
                            tb_1_.STORE_ID
                        from BOOK tb_1_
                        where 
                            tb_1_.EDITION = ?
                    )
                insert into BOOK(
                    TYPE,
                    NAME,
                    EDITION,
                    PRICE,
                    STORE_ID
                )
                select * from __inserted_source
                returning
                    ID,
                    NAME,
                    EDITION
            `,
            args: ["PaperBook", 1, 3],
            purpose: "insert"
        });
        expect(result).toEqual({
            affectedRowCount: 4,
            rows: [
                [ 101, 'Learning GraphQL', 4 ],
                [ 102, 'Effective TypeScript', 4 ],
                [ 103, 'YugabyteDB: The Definitive Guide', 4 ],
                [ 104, 'GraphQL in Action', 4 ]
            ]
        });
    });

    it("insertAssociation", async () => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(
                    dsl.associationModel(AUTHOR, "books"),
                    "sourceId",
                    "targetId"
                )
                .row(4, 5)
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into book_author_mapping(
                    author_id,
                    book_id
                )
                values
                    (?, ?)
            `,
            args: [4, 5],
            purpose: "insert"
        });
        expect(result).toEqual({ affectedRowCount: 1 });
    });

    it("insertAssociationByBaseModel", async () => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(
                    dsl.associationModel(BOOK, "authors"),
                    "sourceId",
                    "targetId"
                )
                .using(ctx =>
                    ctx.source(LEARNING_LINK, (q, link) => {
                        q.where(link.courseId.eq(4));
                        return q.select({
                            sourceId: link.studentId,
                            targetId: link.courseId
                        });
                    })
                )
                .returning("sourceId", "targetId")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into book_author_mapping(
                    book_id,
                    author_id
                )
                select 
                    tb_1_.STUDENT_ID,
                    tb_1_.COURSE_ID
                from LEARNING_LINK tb_1_
                where 
                    tb_1_.COURSE_ID = ?
                returning
                    book_id,
                    author_id
            `,
            args: [4],
            purpose: "insert"
        });
        expect(result).toEqual({ 
            affectedRowCount: 2, 
            rows: [ [ 2, 4 ], [ 4, 4 ] ] 
        });
    });

    it("insertEmbeddedReferenceKey", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(ORDER_ITEM, "productName", "orderId.x", "orderId.y.a", "orderId.y.b")
                .row("MacBook", 2, 1, 2)
                .returning("id")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into ORDER_ITEM(
                    PRODUCT_NAME,
                    order_x,
                    order_y_a,
                    order_y_b
                )
                values
                    (?, ?, ?, ?)
                returning
                    ID
            `,
            args: ["MacBook", 2, 1, 2],
            purpose: "insert"
        });
        expect(result).toEqual({ 
            affectedRowCount: 1, 
            rows: [ 101 ] 
        });
    });

    it("insertEmbeddedAssociation", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(
                    dsl.associationModel(ORDER, "tags"),
                    "sourceId.x",
                    "sourceId.y.a",
                    "sourceId.y.b",
                    "targetId.low",
                    "targetId.high"
                )
                .row(2, 1, 2, 2, 3)
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into ORDER_TAG_MAPPING(
                    order_x,
                    order_y_a,
                    order_y_b,
                    tag_low,
                    tag_high
                )
                values
                    (?, ?, ?, ?, ?)
            `,
            args: [2, 1, 2, 2, 3],
            purpose: "insert"
        });
        expect(result).toEqual({ affectedRowCount: 1 });
    });

    it("insertEntityOnConflictDoUpdate", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "GraphQL in Action", 3, 69.9, "2"],
                    ["PaperBook", "Cockroach DB", 4, 69.9, "2"]
                )
                .onConflict("name", "edition")
                .doUpdate(ctx => ctx
                    .update("price",ctx.old.price.plus(ctx.new.price))
                    .update("storeId", ctx.new.storeId)
                )
                .returning("id")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into BOOK(
                    TYPE,
                    NAME,
                    EDITION,
                    PRICE,
                    STORE_ID
                )
                values
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?)
                on conflict(
                    NAME,
                    EDITION
                ) do update set
                    PRICE = PRICE + excluded.PRICE,
                    STORE_ID = excluded.STORE_ID
                returning
                    ID
            `,
            args: [
                'PaperBook', 'GraphQL in Action', 3, 69.9, '2',
                'PaperBook', 'Cockroach DB', 4, 69.9, '2'
            ],
            purpose: "insert"
        });
        expect(result).toEqual({
            "affectedRowCount":2,
            "rows":[12,102]
        });
    });

    it("insertEntityOnConflictDoNothing", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "GraphQL in Action", 3, 69.9, "2"],
                    ["PaperBook", "Cockroach DB", 4, 69.9, "2"]
                )
                .onConflict("name", "edition")
                .doNothing()
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into BOOK(
                    TYPE,
                    NAME,
                    EDITION,
                    PRICE,
                    STORE_ID
                )
                values
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?)
                on conflict(
                    NAME,
                    EDITION
                ) do nothing
            `,
            args: [
                'PaperBook', 'GraphQL in Action', 3, 69.9, '2',
                'PaperBook', 'Cockroach DB', 4, 69.9, '2'
            ],
            purpose: "insert"
        });
        expect(result).toEqual({"affectedRowCount":1});
    });

    it("insertEntityOnConflictDoByFakeUpdating", async() => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "GraphQL in Action", 3, 69.9, "2"],
                    ["PaperBook", "Cockroach DB", 4, 69.9, "2"]
                )
                .onConflict("name", "edition")
                .doNothing()
                .returning("id")
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into BOOK(
                    TYPE,
                    NAME,
                    EDITION,
                    PRICE,
                    STORE_ID
                )
                values
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?)
                on conflict(
                    NAME,
                    EDITION
                ) do update set /* fake update */ EDITION = excluded.EDITION
                returning
                    ID
            `,
            args: [
                'PaperBook', 'GraphQL in Action', 3, 69.9, '2',
                'PaperBook', 'Cockroach DB', 4, 69.9, '2'
            ],
            purpose: "insert"
        });
        expect(result).toEqual({ 
            affectedRowCount: 2, 
            rows: [ 12, 102 ] 
        });
    });

    it("insertAssociationOnConflictDoNothing", async () => {
        const result = await sqlClient.execute(async() => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createInsert(dsl.associationModel(BOOK, "authors"), "sourceId", "targetId")
                .using(ctx => 
                    ctx.source(LEARNING_LINK, (q, link) => {
                        return q.select({
                            sourceId: link.studentId,
                            targetId: link.courseId
                        })
                    })
                )
                .onConflictAll()
                .doNothing()
                .returning("sourceId", "targetId")
                .execute();
        });
        sqlRecord.log();
    });
});