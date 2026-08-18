import { describe, expect, it } from "vitest";
import { SIMPLE_AUTHOR_VIEW, SIMPLE_BOOK_VIEW, SIMPLE_ITEM_VIEW, SIMPLE_ORDER_VIEW, SIMPLE_STORE_VIEW } from "./utils";
import { AUTHOR, BOOK, BOOK_STORE, ORDER, ORDER_ITEM } from "../model/model";
import { newSqlRecord } from "../utils";
import { dsl } from "@ts-grm/core";
import { useSqliteClientWithData } from "../data_utils";

describe("AssociatedSqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);
    
    it("noneWithoutFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.none("store"));
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
                    not exists(
                        select 
                            1
                        from BOOK_STORE tb_2_
                        where 
                            tb_2_.ID = tb_1_.STORE_ID
                    )
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });

    it("noneWithFilter", async () => {
        const rows = await sqlClient.createQuery(ORDER_ITEM, (q, item) => {
            q.where(item.none("order", order => order.name.length().lt(3)));
            return q.select(item.fetch(SIMPLE_ITEM_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.PRODUCT_NAME
                from ORDER_ITEM tb_1_
                where 
                    not exists(
                        select 
                            1
                        from "ORDER" tb_2_
                        where 
                                (tb_2_.X, tb_2_.A, tb_2_.B) = (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b)
                            and
                                length(cast(tb_2_.NAME as text)) < ?
                    )
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "productName": "Pen"
            },
            {
                "id": 2,
                "productName": "Pencil"
            },
            {
                "id": 3,
                "productName": "Panio"
            },
            {
                "id": 4,
                "productName": "Bike"
            },
            {
                "id": 5,
                "productName": "Bag"
            },
            {
                "id": 6,
                "productName": "TV"
            },
            {
                "id": 7,
                "productName": "Computer"
            },
            {
                "id": 8,
                "productName": "iPhone"
            }
        ]);
    });

    it("noneIfWithoutFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.noneIf("store", store => store.name.likeIf(null)));
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
            `,
            args: [],
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
            },
            {
                "id": 1,
                "name": "Learning GraphQL",
                "edition": 1
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

    it("noneIfWithFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.noneIf("store", store => store.name.likeIf("reilly")));
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
                    not exists(
                        select 
                            1
                        from BOOK_STORE tb_2_
                        where 
                                tb_2_.ID = tb_1_.STORE_ID
                            and
                                tb_2_.NAME like ?
                    )
            `,
            args: ["%reilly%"],
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

    it("someWithoutFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.some("books"));
            return q.select(store.fetch(SIMPLE_STORE_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                where 
                    exists(
                        select 
                            1
                        from BOOK tb_2_
                        where 
                            tb_2_.STORE_ID = tb_1_.ID
                    )
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": "1",
                "name": "O'REILLY",
                "version": 1
            },
            {
                "id": "2",
                "name": "MANNING",
                "version": 1
            }
        ]);
    });

    it("someWithFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.some("books", book => book.name.ilike("sql")));
            return q.select(store.fetch(SIMPLE_STORE_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                where 
                    exists(
                        select 
                            1
                        from BOOK tb_2_
                        where 
                                tb_2_.STORE_ID = tb_1_.ID
                            and
                                lower(tb_2_.NAME) like ?
                    )
            `,
            args: ["%sql%"],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });

    it("someIfWithoutFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.someIf("books", book => book.name.ilikeIf(undefined)));
            return q.select(store.fetch(SIMPLE_STORE_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": "1",
                "name": "O'REILLY",
                "version": 1
            },
            {
                "id": "2",
                "name": "MANNING",
                "version": 1
            }
        ]);
    });

    it("someIfWithFilter", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.someIf("books", book => book.name.ilikeIf("sql")));
            return q.select(store.fetch(SIMPLE_STORE_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                where 
                    exists(
                        select 
                            1
                        from BOOK tb_2_
                        where 
                                tb_2_.STORE_ID = tb_1_.ID
                            and
                                lower(tb_2_.NAME) like ?
                    )
            `,
            args: ["%sql%"],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });

    it("every", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(
                book.every(
                    "authors", 
                    author => dsl.and(
                        author.name().firstName.length().gte(10),
                        author.name().lastName.length().gte(10)
                    )
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
                    not exists(
                        select 
                            1
                        from AUTHOR tb_2_
                        inner join book_author_mapping tb_3_ on 
                            tb_2_.ID = tb_3_.author_id
                        where 
                                tb_3_.book_id = tb_1_.ID
                            and
                                (
                                    length(cast(tb_2_.FIRST_NAME as text)) < ?
                                or
                                    length(cast(tb_2_.LAST_NAME as text)) < ?
                                )
                    )
            `,
            args: [10, 10],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });

    it("sizeWithoutFilter", async () => {
        const rows = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.count("comments").between(10, 20));
            return q.select(order.fetch(SIMPLE_ORDER_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.X,
                    tb_1_.A,
                    tb_1_.B,
                    tb_1_.NAME
                from "ORDER" tb_1_
                where 
                    (
                        select 
                            count(1)
                        from "COMMENT" tb_2_
                        inner join ORDER_COMMENT_MAPPING tb_3_ on 
                            tb_2_.ID = tb_3_.COMMENT_ID
                        where 
                            (tb_3_.order_x, tb_3_.order_y_a, tb_3_.order_y_b) = (tb_1_.X, tb_1_.A, tb_1_.B)
                    ) between ? and ?
            `,
            args: [10, 20],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });

    it("sizeWithFilter", async () => {
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(author.count("books", book => book.name.ilike("sql")).gt(1))
            return q.select(author.fetch(SIMPLE_AUTHOR_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME
                from AUTHOR tb_1_
                where 
                    (
                        select 
                            count(1)
                        from BOOK tb_2_
                        inner join book_author_mapping tb_3_ on 
                            tb_2_.ID = tb_3_.book_id
                        where 
                                tb_3_.author_id = tb_1_.ID
                            and
                                lower(tb_2_.NAME) like ?
                    ) > ?
            `,
            args: ["%sql%", 1],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });
});