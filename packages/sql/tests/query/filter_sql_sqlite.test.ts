import { describe, expect, it } from "vitest";
import { AUTHOR, BOOK, BOOK_STORE, ORDER, TAG } from "../model/model";
import { SIMPLE_BOOK_VIEW } from "./utils";
import { newSqlRecord } from "../utils";
import { FilterManager } from "@/cfg";
import { newSqlClient } from "@/sql_client";
import { useSqliteClientWithData } from "../data_utils";

describe("FilterSqlTest", () => {

    const sqlRecord = newSqlRecord();
    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("globalFilter", async () => {
        const filterManager = new FilterManager()
            .add(BOOK, table => table.edition.eq(1));
        const rows = await newSqlClient(sqlClient, {
            filterManager
        }).createQuery(BOOK, (q, book) => {
            q.where(book.name.ilike("graphql"));
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
                        lower(tb_1_.NAME) like ?
                    and
                        tb_1_.EDITION = ?
            `,
            args: ["%graphql%", 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            },
            {
                "id": 1,
                "name": "Learning GraphQL",
                "edition": 1
            }
        ]);
    });

    it("m2oOptimization", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.store().id.eq(2));
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                    tb_1_.STORE_ID = ?
            `,
            args: [2],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
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

    it("m2oFilter", async () => {
        const filterManager = new FilterManager()
            .add(BOOK_STORE, table => table.version.eq(1));
        const rows = await newSqlClient(
            sqlClient, { filterManager }
        ).createQuery(BOOK, (q, book) => {
            q.where(book.store().id.eq(2));
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                inner join BOOK_STORE tb_2_ on 
                    tb_1_.STORE_ID = tb_2_.ID
                and
                    tb_2_.VERSION = ?
                where 
                    tb_2_.ID = ?
            `,
            args: [1, 2],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
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

    it("m2mOptimization", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.authors().$acceptMulti().id.in(3, 4));
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW)
            );
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
                    tb_2_.author_id in(?, ?)
            `,
            args: [3, 4],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 4,
                "name": "Effective TypeScript",
                "edition": 1
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
                "id": 7,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1
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
            }
        ]);
    });

    it("m2mFilter", async () => {
        const filterManager = new FilterManager()
            .add(AUTHOR, table =>
                table.name().firstName.length()
                    .plus(table.name().lastName.length())
                    .lte(20)
            );
        const rows = await newSqlClient(sqlClient, {
            filterManager
        }).createQuery(BOOK, (q, book) => {
            q.where(book.authors().$acceptMulti().id.in(3, 4));
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW)
            );
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
                inner join AUTHOR tb_3_ on 
                    tb_2_.author_id = tb_3_.ID
                and
                    length(cast(tb_3_.FIRST_NAME as text)) + length(cast(tb_3_.LAST_NAME as text)) <= ?
                where 
                    tb_3_.ID in(?, ?)
            `,
            args: [20, 3, 4],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 4,
                "name": "Effective TypeScript",
                "edition": 1
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
                "id": 7,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1
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
            }
        ]);
    });

    it("inverseMultiColumnsM2MOptimization", async () => {
        const rows = await sqlClient.createQuery(TAG, (q, tag) => {
            q.where(tag.orders().$acceptMulti().id().y().a.lt(5));
            return q.select(tag.id().low, tag.id().high, tag.name);
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.LOW,
                    tb_1_.HIGH,
                    tb_1_.NAME
                from TAG tb_1_
                inner join ORDER_TAG_MAPPING tb_2_ on 
                    tb_1_.LOW = tb_2_.tag_low
                and
                    tb_1_.HIGH = tb_2_.tag_high
                where 
                    tb_2_.order_y_a < ?
            `,
            args: [5],
            purpose: "query"
        });
        expect(rows).toEqual([
            [1, 2, "orange"],
            [1, 3, "yellow"],
            [1, 4, "green"],
            [2, 1, "cyan"],
            [2, 2, "blue"],
            [2, 3, "purple"],
            [1, 1, "red"],
            [1, 2, "orange"]
        ]);
    });

    it("inverseMultiColumnsM2MFilter", async () => {
        const filterManager = new FilterManager()
            .add(ORDER, table => table.name.notLike("DELETED"));
        const rows = await newSqlClient(sqlClient, {
            filterManager
        }).createQuery(TAG, (q, tag) => {
            q.where(tag.orders().$acceptMulti().id().y().a.lt(5));
            return q.select(tag.id().low, tag.id().high, tag.name);
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.LOW,
                    tb_1_.HIGH,
                    tb_1_.NAME
                from TAG tb_1_
                inner join ORDER_TAG_MAPPING tb_2_ on 
                    tb_1_.LOW = tb_2_.tag_low
                and
                    tb_1_.HIGH = tb_2_.tag_high
                inner join "ORDER" tb_3_ on 
                    tb_2_.order_x = tb_3_.X
                and
                    tb_2_.order_y_a = tb_3_.A
                and
                    tb_2_.order_y_b = tb_3_.B
                and
                    tb_3_.NAME not like ?
                where 
                    tb_3_.A < ?
            `,
            args: ["%DELETED%", 5],
            purpose: "query"
        });
        expect(rows).toEqual([
            [1, 2, "orange"],
            [1, 3, "yellow"],
            [1, 4, "green"],
            [2, 1, "cyan"],
            [2, 2, "blue"],
            [2, 3, "purple"],
            [1, 1, "red"],
            [1, 2, "orange"]
        ]);
    });
});