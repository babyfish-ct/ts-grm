import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { BOOK } from "../model/model";
import { dsl, dto } from "@ts-grm/core";

describe("CountSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("countOnSingleQuery", async () => {
        const count = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name); // order will be ignored in count mode
            return q.select(
                book.fetch(
                    dto.view(BOOK, c => [
                        c.$allScalars,
                        c.authors.with(c => [
                            c.$allScalars
                        ])
                    ])
                )
            );
        }).fetchCount();
        sqlRecord.assert({
            sql: `
                select 
                    count(1)
                from BOOK tb_1_
                where 
                    tb_1_.EDITION = ?
            `,
            args: [3],
            purpose: "query"
        });
        expect(count).toEqual(4);
    });

    it("countOnMaxQuery", async () => {
        const count = await sqlClient.createQuery(BOOK, (q, book) => {
            return q.select(dsl.max(book.edition));
        }).fetchCount();
        sqlRecord.assert({
            sql: `
                select 
                    count(1)
                from (
                    select 
                        max(tb_1_.EDITION)
                    from BOOK tb_1_
                ) core__
            `,
            args: [],
            purpose: "query"
        });
        expect(count).toEqual(1);
    });

    it("countOnGroupQuery", async () => {
        const count = await sqlClient.createQuery(BOOK, (q, book) => {
            q.groupBy(book.edition);
            return q.select(dsl.max(book.name));
        }).fetchCount();
        sqlRecord.assert({
            sql: `
                select 
                    count(1)
                from (
                    select 
                        max(tb_1_.NAME)
                    from BOOK tb_1_
                    group by 
                        tb_1_.EDITION
                ) core__
            `,
            args: [],
            purpose: "query"
        });
        expect(count).toEqual(3);
    });

    it("countOnMerged", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.store.with(c => [c.name]),
            c.authors.with(c => [c.name])
        ]);
        const count = await dsl.except(
            sqlClient.createQuery(BOOK, (q, book) => {
                q.where(book.edition.eq(3));
                return q.select(book.fetch(view));
            }),
            sqlClient.createQuery(BOOK, (q, book) => {
                q.where(book.name.ilike("graphql"));
                return q.select(book.fetch(view));
            })
        ).fetchCount();
        sqlRecord.assert({
            sql: `
                select 
                    count(1)
                from (
                    select 
                        tb_1_.NAME,
                        tb_1_.STORE_ID,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    except
                    select 
                        tb_2_.NAME,
                        tb_2_.STORE_ID,
                        tb_2_.ID
                    from BOOK tb_2_
                    where 
                        lower(tb_2_.NAME) like ?
                ) core__
            `,
            args: [3, "%graphql%"],
            purpose: "query"
        });
        expect(2).toEqual(count);
    })
});