import { describe, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { AUTHOR, BOOK, LEARNING_LINK, ORDER, ORDER_ITEM } from "../model/model";
import { SqlClientImplementor } from "@/sql_client";
import { dsl } from "@ts-grm/core";

describe("InsertSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("insertEntity", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
                .createInsert(BOOK, "__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "Cockroach DB Guide", 1, 67.9, "2"],
                    ["PaperBook", "TiDB Guide", 1, 67.9, "2"]
                )
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
            `,
            args: [
                "PaperBook", "Cockroach DB Guide", 1, 67.9, "2", 
                "PaperBook", "TiDB Guide", 1, 67.9, "2"
            ],
            purpose: "insert"
        });
    });

    it("insertEntityByBaseModel", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
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
                ) select 
                    ?,
                    tb_1_.NAME,
                    tb_1_.EDITION + ?,
                    tb_1_.PRICE,
                    tb_1_.STORE_ID
                from BOOK tb_1_
                where 
                    tb_1_.EDITION = ?
            `,
            args: ["PaperBook", 1, 3],
            purpose: "insert"
        });
    });

    it("insertEntityByCteModelWithExportedTable", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
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
                ) select * from __inserted_source
            `,
            args: ["PaperBook", 1, 3],
            purpose: "insert"
        });
    });

    it("insertAssociation", async () => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
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
    });

    it("insertAssociationByBaseModel", async () => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
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
                .execute();
        });
        sqlRecord.assert({
            sql: `
                insert into book_author_mapping(
                    book_id,
                    author_id
                ) select 
                    tb_1_.STUDENT_ID,
                    tb_1_.COURSE_ID
                from LEARNING_LINK tb_1_
                where 
                    tb_1_.COURSE_ID = ?
            `,
            args: [4],
            purpose: "insert"
        });
    });

    it("insertEmbeddedReferenceKey", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
                .createInsert(ORDER_ITEM, "productName", "orderId.x", "orderId.y.a", "orderId.y.b")
                .row("MacBook", 2, 1, 2)
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
            `,
            args: ["MacBook", 2, 1, 2],
            purpose: "insert"
        });
    });

    it("insertEmbeddedAssociation", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
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
    });
});