import { describe, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { BOOK } from "../model/model";
import { SqlClientImplementor } from "@/sql_client";
import { dsl } from "@ts-grm/core";

describe("InsertSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("insertEntity", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
                .createInsert(BOOK)
                .using("__typename", "name", "edition", "price", "storeId")
                .values(
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
                .createInsert(BOOK)
                .using(
                    dsl.baseQuery(BOOK, (q, book) => {
                        q.where(book.edition.eq(3));
                        return q.select({
                            a: dsl.literal("PaperBook"),
                            b: book.name,
                            c: book.edition.plus(1),
                            d: book.price,
                            e: book.storeId
                        });
                    })
                )
                // TODO: `do` is wrong design, remove it
                .do(ctx => ctx
                    .insert("__typename", ctx.new.a)
                    .insert("name", ctx.new.b)
                    .insert("edition", ctx.new.c)
                    .insert("price", ctx.new.d)
                    .insert("storeId", ctx.new.e)
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

    it("insertEntityByBaseModelWithExportedTable", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
                .createInsert(BOOK)
                .using(
                    dsl.baseQuery(BOOK, (q, book) => {
                        q.where(book.edition.eq(3));
                        return q.select({
                            tn: dsl.literal("PaperBook"), 
                            book,
                            newEdition: book.edition.plus(1)
                        });
                    })
                )
                // TODO: `do` is wrong design, remove it
                .do(ctx => ctx.insert("__typename", ctx.new.tn).insert("name", ctx.new.book.name).insert("edition", ctx.new.newEdition).insert("price", ctx.new.book.price).insert("storeId", ctx.new.book.storeId))
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
                .createInsert(BOOK)
                .using(
                    dsl.cteModel(
                        dsl.baseQuery(BOOK, (q, book) => {
                            q.where(book.edition.eq(3));
                            return q.select({
                                tn: dsl.literal("PaperBook"), 
                                book,
                                newEdition: book.edition.plus(1)
                            });
                        })
                    )
                )
                // TODO: `do` is wrong design, remove it
                .do(ctx => ctx.insert("__typename", ctx.new.tn).insert("name", ctx.new.book.name).insert("edition", ctx.new.newEdition).insert("price", ctx.new.book.price).insert("storeId", ctx.new.book.storeId))
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
});