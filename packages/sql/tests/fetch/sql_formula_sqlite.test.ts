import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { dsl, dto } from "@ts-grm/core";
import { BOOK, BOOK_STORE } from "../model/model";
import z from "zod";

describe("SqlFormulaTest", () => {

    const sqlRecord = newSqlRecord();
    
    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("test", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authorCount
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(
                book.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        (
                            select 
                                count(1)
                            from book_author_mapping tb_2_
                            where 
                                tb_2_.book_id = tb_1_.ID
                        )
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            { name: 'Effective TypeScript', authorCount: 1 },
            { name: 'GraphQL in Action', authorCount: 1 },
            { name: 'Learning GraphQL', authorCount: 2 },
            { name: 'YugabyteDB: The Definitive Guide', authorCount: 3 }
        ]);
    });

    it("dtoLevel", async() => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.$formula.sql({
                alias: "avgPrice",
                valueType: z.number(),
                fn: store => dsl.subQuery(BOOK, (q, book) => {
                    q.where(book.storeId.eq(store.id));
                    return q.select(dsl.avg(book.price).asNonNull());
                })
            })
        ]);
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.orderBy(store.name);
            return q.select(store.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        (
                            select 
                                avg(tb_2_.PRICE)
                            from BOOK tb_2_
                            where 
                                tb_2_.STORE_ID = tb_1_.ID
                        )
                    from BOOK_STORE tb_1_
                    order by 
                        tb_1_.NAME asc
                `,
                args: [],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {"name": "MANNING", "avgPrice":69.99},
            {"name": "O'REILLY", "avgPrice":55.989999999999995}
        ]);
    });
});