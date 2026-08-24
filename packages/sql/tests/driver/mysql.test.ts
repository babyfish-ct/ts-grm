import { describe, expect, it } from "vitest";
import { isExternalDbTestEnabled, newSqlRecord } from "../utils";
import { useMySqlClientWithData } from "../data_utils";
import { dsl, dto } from "@ts-grm/core";
import { BOOK, ORDER } from "../model/model";

describe.runIf(isExternalDbTestEnabled)("MySqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useMySqlClientWithData(sqlRecord);

    it("simple", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.store.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.name
            ]),
            c.authors.with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.STORE_ID,
                        tb_1_.ID,
                        tb_2_.NAME
                    from BOOK tb_1_
                    left join BOOK_STORE tb_2_ on 
                        tb_1_.STORE_ID = tb_2_.ID
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query",
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)",
            }
        )
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authors": [
                    {
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ],
                "store": {
                    "name": "O'REILLY"
                }
            },
            {
                "name": "GraphQL in Action",
                "authors": [
                    {
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ],
                "store": {
                    "name": "MANNING"
                }
            },
            {
                "name": "Learning GraphQL",
                "authors": [
                    {
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ],
                "store": {
                    "name": "O'REILLY"
                }
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authors": [
                    {
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ],
                "store": {
                    "name": "O'REILLY"
                }
            }
        ]);
    });

    it("pageOnAtomQuery", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.price,
            c.store.with(c => [
                c.name
            ]),
            c.authors.with(c => [
                c.name
            ])
        ]);
        const page = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchPage({
            pageNo: 2,
            pageSize: 2
        });
        sqlRecord.assert(
            {
                sql: `
                    select 
                        count(1)
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.PRICE,
                        tb_1_.STORE_ID,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                    limit ?
                    offset ?
                `,
                args: [3, 2, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = ?
                `,
                args: ["1"],
                purpose: "loadAssociation(Book.store)"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        )
        expect(page).toEqual({
            "totalRowCount": 4,
            "totalPageCount": 2,
            "pageNo": 2,
            "isFirstPage": false,
            "isLastPage": true,
            "rows": [
                {
                    "name": "Learning GraphQL",
                    "price": 33.99,
                    "store": {
                        "name": "O'REILLY"
                    },
                    "authors": [
                        {
                            "name": {
                                "firstName": "Alex",
                                "lastName": "Banks"
                            }
                        },
                        {
                            "name": {
                                "firstName": "Eve",
                                "lastName": "Procello"
                            }
                        }
                    ]
                },
                {
                    "name": "YugabyteDB: The Definitive Guide",
                    "price": 89.99,
                    "store": {
                        "name": "O'REILLY"
                    },
                    "authors": [
                        {
                            "name": {
                                "firstName": "Kannappan",
                                "lastName": "Muthukkaruppan"
                            }
                        },
                        {
                            "name": {
                                "firstName": "Karthik",
                                "lastName": "Ranganathan"
                            }
                        },
                        {
                            "name": {
                                "firstName": "Mikhail",
                                "lastName": "Bautin"
                            }
                        }
                    ]
                }
            ]
        });
    });

    it("pageOnMergedQuery", async () => {
        const view = dto.view(BOOK, c => [
            c.$allScalars
        ]);
        const page = await dsl.unionAll(
            sqlClient.createQuery(BOOK, (q, book) => {
                q.where(
                    book.storeId.eq(2),
                    book.edition.eq(3)
                );
                return q.select(book.fetch(view));
            }),
            sqlClient.createQuery(BOOK, (q, book) => {
                q.where(
                    book.storeId.eq(1),
                    book.edition.eq(2)
                );
                return q.select(book.fetch(view));
            })
        ).fetchPage({
            pageNo: 2,
            pageSize: 2
        });
        sqlRecord.assert(
            {
                sql: `
                    select 
                        count(1)
                    from (
                        select 
                            tb_1_.ID,
                            tb_1_.NAME,
                            tb_1_.EDITION,
                            tb_1_.PRICE
                        from BOOK tb_1_
                        where 
                                tb_1_.STORE_ID = ?
                            and
                                tb_1_.EDITION = ?
                        union all
                        select 
                            tb_2_.ID,
                            tb_2_.NAME,
                            tb_2_.EDITION,
                            tb_2_.PRICE
                        from BOOK tb_2_
                        where 
                                tb_2_.STORE_ID = ?
                            and
                                tb_2_.EDITION = ?
                    ) core__
                `,
                args: [2, 3, 1, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        *
                    from (
                        select 
                            tb_1_.ID,
                            tb_1_.NAME,
                            tb_1_.EDITION,
                            tb_1_.PRICE
                        from BOOK tb_1_
                        where 
                                tb_1_.STORE_ID = ?
                            and
                                tb_1_.EDITION = ?
                        union all
                        select 
                            tb_2_.ID,
                            tb_2_.NAME,
                            tb_2_.EDITION,
                            tb_2_.PRICE
                        from BOOK tb_2_
                        where 
                                tb_2_.STORE_ID = ?
                            and
                                tb_2_.EDITION = ?
                    ) core__
                    limit ?
                    offset ?
                `,
                args: [2, 3, 1, 2, 2, 2],
                purpose: "query"
            }
        );
        expect(page).toEqual({
            "totalRowCount": 4,
            "totalPageCount": 2,
            "pageNo": 2,
            "isFirstPage": false,
            "isLastPage": true,
            "rows": [
                {
                    "id": 5,
                    "name": "Effective TypeScript",
                    "edition": 2,
                    "price": 53.99
                },
                {
                    "id": 8,
                    "name": "YugabyteDB: The Definitive Guide",
                    "edition": 2,
                    "price": 79.99
                }
            ]
        });
    });

    it("timeMinus", async () => {
        const view = dto.view(ORDER, c => [
            c.$allScalars,
            c.items.with(c => [
                c.productName
            ])
        ]);
        const time = new Date("2026-08-23T12:00:00.000Z");
        const row = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.createdTime.minus(2, "HOURS").lt(time));
            q.where(order.createdTime.minus(1, "HOURS").gt(time));
            return q.select(order.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME,
                        tb_1_.CREATED_TIME
                    from \`ORDER\` tb_1_
                    where 
                            DATE_SUB(tb_1_.CREATED_TIME, INTERVAL 2 HOUR) < ?
                        and
                            DATE_SUB(tb_1_.CREATED_TIME, INTERVAL 1 HOUR) > ?
                    limit ?
                `,
                args: [
                    new Date("2026-08-23T12:00:00.000Z"),
                    new Date("2026-08-23T12:00:00.000Z"),
                    2
                ],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b,
                        tb_1_.PRODUCT_NAME
                    from ORDER_ITEM tb_1_
                    where 
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) = (?, ?, ?)
                `,
                args: [2, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(row).toEqual({
            "id": {
                "x": 2,
                "y": {
                    "a": 1,
                    "b": 2
                }
            },
            "name": "order-4",
            "createdTime": new Date("2026-08-23T13:47:37.000Z"),
            "items": [
                { "productName": "Computer" },
                { "productName": "iPhone" }
            ]
        });
    });

    it("timeDiff", async () => {
        const view = dto.view(ORDER, c => [
            c.$allScalars,
            c.items.with(c => [
                c.productName
            ])
        ]);
        const time = new Date("2026-08-23T12:00:00.000Z");
        const row = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.createdTime.diff(time, "HOURS").between(1.1, 1.9));
            return q.select(order.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME,
                        tb_1_.CREATED_TIME
                    from \`ORDER\` tb_1_
                    where 
                        TIMESTAMPDIFF(SECOND, ?, tb_1_.CREATED_TIME) / 3600 between ? and ?
                    limit ?
                `,
                args: [new Date("2026-08-23T12:00:00.000Z"), 1.1, 1.9, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b,
                        tb_1_.PRODUCT_NAME
                    from ORDER_ITEM tb_1_
                    where 
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) = (?, ?, ?)
                `,
                args: [2, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(row).toEqual({
            "id": {
                "x": 2,
                "y": {
                    "a": 1,
                    "b": 2
                }
            },
            "name": "order-4",
            "createdTime": new Date("2026-08-23T13:47:37.000Z"),
            "items": [
                { "productName": "Computer" },
                { "productName": "iPhone" }
            ]
        });
    });
});