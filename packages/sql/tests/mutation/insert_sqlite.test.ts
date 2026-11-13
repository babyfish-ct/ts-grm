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
                .using("name", "edition", "price", "storeId")
                .values(
                    ["Cockroach DB Guide", 1, 67.9, "2"],
                    ["TiDB Guide", 1, 67.9, "2"]
                )
                .execute();
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
                            a: book.name,
                            b: book.edition,
                            c: book.price,
                            d: book.storeId
                        });
                    })
                )
                .do(ctx => ctx
                    .insert("name", ctx.new.a)
                    .insert("edition", ctx.new.b)
                    .insert("price", ctx.new.c)
                    .insert("storeId", ctx.new.d)
                )
                .execute();
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
                        return q.select({book});
                    })
                )
                .do(ctx => ctx
                    .insert("name", ctx.new.book.name)
                    .insert("edition", ctx.new.book.edition)
                    .insert("price", ctx.new.book.price)
                    .insert("storeId", ctx.new.book.storeId)
                )
                .execute();
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
                            return q.select({book});
                        })
                    )
                )
                .do(ctx => ctx
                    .insert("name", ctx.new.book.name)
                    .insert("edition", ctx.new.book.edition)
                    .insert("price", ctx.new.book.price)
                    .insert("storeId", ctx.new.book.storeId)
                )
                .execute();
        });
    });
});