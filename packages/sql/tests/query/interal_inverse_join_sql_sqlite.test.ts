import { newSqlClient } from "@/sql_client";
import { describe, expect, it } from "vitest";
import { SIMPLE_AUTHOR_VIEW, SIMPLE_BOOK_VIEW, SIMPLE_COMMENT_VIEW, SIMPLE_STORE_VIEW } from "./utils";
import { FilterManager } from "@/cfg";
import { AUTHOR, BOOK, BOOK_STORE, COMMENT, ORDER } from "../model/model";
import { dsl, spi, Expression, ExprTuple } from "@ts-grm/core";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";

// Internal API, not public API for users
// This internal API is used to implements association fetch
// and primsa/mongo style predicate such as "none", "some", "every" 
// even it the association is not bidirectional
describe.sequential("InternalInverseJoinSqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    // All global filters should be ignored by internal inverse join
    // That means filters will be only applied to root table.
    const sqlClientWithFilter = newSqlClient(sqlClient, {
        filterManager: new FilterManager()
            .add(BOOK_STORE, table => table.version.ne(0))
            .add(BOOK, table => table.edition.gt(1))
            .add(AUTHOR, table => table.name().firstName.length().gte(4))
            .add(ORDER, table => table.id().x.ne(0))
            .add(COMMENT, table => table.text.length().gte(10))
    });

    it("inverseO2M", async () => {
        const rows = await sqlClientWithFilter.createQuery(BOOK, (q, book) => {
            const parentId1 = (book as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(BOOK_STORE, "books") as Expression<number>;
            const parentId2 = (book as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(BOOK_STORE, "books") as Expression<number>;
            q.where(
                dsl.or(
                    parentId1.eq(1),
                    parentId2.eq(2)
                )
            );
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                        (
                            tb_1_.STORE_ID = ?
                        or
                            tb_1_.STORE_ID = ?
                        )
                    and
                        tb_1_.EDITION > ?
            `,
            args: [1, 2, 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 2,
                "name": "Learning GraphQL",
                "edition": 2
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
            {
                "id": 5,
                "name": "Effective TypeScript",
                "edition": 2
            },
            {
                "id": 6,
                "name": "Effective TypeScript",
                "edition": 3
            },
            {
                "id": 8,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            },
            {
                "id": 11,
                "name": "GraphQL in Action",
                "edition": 2
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3
            }
        ]);
    });

    it("inverseM2O", async() => {
        const rows = await sqlClientWithFilter.createQuery(BOOK_STORE, (q, store) => {
            const parentId1 = (store as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(BOOK, "store") as Expression<number>;
            const parentId2 = (store as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(BOOK, "store") as Expression<number>;
            q.where(
                dsl.or(
                    parentId1.eq(1),
                    parentId2.eq(2)
                )
            );
            return q.select(store.fetch(SIMPLE_STORE_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                inner join BOOK tb_2_ on 
                    tb_1_.ID = tb_2_.STORE_ID
                and
                    tb_2_.EDITION > ?
                where 
                        (
                            tb_2_.ID = ?
                        or
                            tb_2_.ID = ?
                        )
                    and
                        tb_1_.VERSION <> ?
            `,
            args: [1, 1, 2, 0],
            purpose: "query"
        });
        expect(rows).toEqual([{"id":"1","name":"O'REILLY","version":1}]);
    });

    it("inverseM2M1", async () => {
        const rows = await sqlClientWithFilter.createQuery(BOOK, (q, book) => {
            const parentId1 = (book as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(AUTHOR, "books") as Expression<number>;
            const parentId2 = (book as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(AUTHOR, "books") as Expression<number>;
            q.where(
                dsl.or(
                    parentId1.eq(1),
                    parentId2.eq(2)
                )
            );
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                inner join book_author_mapping tb_2_ on 
                    tb_1_.ID = tb_2_.book_id
                where 
                        (
                            tb_2_.author_id = ?
                        or
                            tb_2_.author_id = ?
                        )
                    and
                        tb_1_.EDITION > ?
            `,
            args: [1, 2, 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 2,
                "name": "Learning GraphQL",
                "edition": 2
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
            {
                "id": 2,
                "name": "Learning GraphQL",
                "edition": 2
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            }
        ]);
    });

    it("inverseM2M2", async () => {
        const rows = await sqlClientWithFilter.createQuery(AUTHOR, (q, author) => {
            const parentId1 = (author as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(BOOK, "authors") as Expression<number>;
            const parentId2 = (author as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(BOOK, "authors") as Expression<number>;
            q.where(
                dsl.or(
                    parentId1.eq(1),
                    parentId2.eq(2)
                )
            );
            return q.select(author.fetch(SIMPLE_AUTHOR_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME
                from AUTHOR tb_1_
                inner join book_author_mapping tb_2_ on 
                    tb_1_.ID = tb_2_.author_id
                where 
                        (
                            tb_2_.book_id = ?
                        or
                            tb_2_.book_id = ?
                        )
                    and
                        length(cast(tb_1_.FIRST_NAME as text)) >= ?
            `,
            args: [1, 2, 4],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 2,
                "name": {
                    "firstName": "Alex",
                    "lastName": "Banks"
                }
            },
            {
                "id": 2,
                "name": {
                    "firstName": "Alex",
                    "lastName": "Banks"
                }
            }
        ]);
    });

    it("inverseM2MByMultiColumns", async () => {
        const rows = await sqlClientWithFilter.createQuery(COMMENT, (q, comment) => {
            const parentId1 = (comment as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(ORDER, "comments") as ExprTuple<[
                    Expression<number>,
                    Expression<number>,
                    Expression<number>
                ]>;
            const parentId2 = (comment as any as spi.AbstractEntityTable)
                .__inverseAssociatedKey(ORDER, "comments") as ExprTuple<[
                    Expression<number>,
                    Expression<number>,
                    Expression<number>
                ]>;
            q.where(
                dsl.or(
                    parentId1.eq([1, 1, 1]),
                    parentId2.eq([2, 1, 1])
                )
            );
            return q.select(
                comment.fetch(SIMPLE_COMMENT_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME
                from "COMMENT" tb_1_
                inner join ORDER_COMMENT_MAPPING tb_2_ on 
                    tb_1_.ID = tb_2_.COMMENT_ID
                where 
                        (
                            (tb_2_.order_x, tb_2_.order_y_a, tb_2_.order_y_b) = (?, ?, ?)
                        or
                            (tb_2_.order_x, tb_2_.order_y_a, tb_2_.order_y_b) = (?, ?, ?)
                        )
                    and
                        length(cast(tb_1_.TEXT as text)) >= ?
            `,
            args: [1, 1, 1, 2, 1, 1, 10],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "name": "Delayed"
            },
            {
                "id": 3,
                "name": "Changed"
            },
            {
                "id": 1,
                "name": "Delayed"
            },
            {
                "id": 3,
                "name": "Changed"
            }
        ]);
    });
});