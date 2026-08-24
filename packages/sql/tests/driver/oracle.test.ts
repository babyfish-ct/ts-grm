import { describe, it, expect } from "vitest";
import { isExternalDbTestEnabled, newSqlRecord } from "../utils";
import { useOracleClientWithData } from "../data_utils";
import { dsl, dto } from "@ts-grm/core";
import { BOOK, ORDER } from "../model/model";

describe.runIf(isExternalDbTestEnabled)("OracleTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useOracleClientWithData(sqlRecord);

    it("simple", async () => {
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
                        tb_1_.EDITION = :1
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
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
                        tb_2_.book_id in(:1, :2, :3, :4)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
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

    it("tupleIn", async() => {
        const view = dto.view(ORDER, c => [
            c.name,
            c.items.with(c => [
                c.productName
            ])
        ]);
        const rows = await sqlClient.createQuery(ORDER, (q, order) => {
            q.orderBy(order.name);
            return q.select(order.fetch(view));
        }).limit(2).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        core__.f1,
                        core__.f2,
                        core__.f3,
                        core__.f4
                    from (
                        select 
                            tb_1_.NAME f1,
                            tb_1_.X f2,
                            tb_1_.A f3,
                            tb_1_.B f4
                        from "ORDER" tb_1_
                        order by 
                            tb_1_.NAME asc
                    ) core__ 
                    where rownum <= :1
                `,
                args: [2],
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
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) in(
                            (:1, :2, :3),
                            (:4, :5, :6)
                        )
                `,
                args: [1, 1, 1, 1, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "order-1",
                "items": [
                    { "productName": "Pen" },
                    { "productName": "Pencil" }
                ]
            },
            {
                "name": "order-2",
                "items": [
                    { "productName": "Panio" },
                    { "productName": "Bike" }
                ]
            }
        ]);
    });

    it("page1OnAtomQuery", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.price,
            c.store.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
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
            pageNo: 1,
            pageSize: 2
        });
        sqlRecord.assert(
            {
                sql: `
                    select 
                        count(1)
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = :1
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        core__.f1,
                        core__.f2,
                        core__.f3,
                        core__.f4,
                        core__.f5
                    from (
                        select 
                            tb_1_.NAME f1,
                            tb_1_.PRICE f2,
                            tb_1_.STORE_ID f3,
                            tb_1_.ID f4,
                            tb_2_.NAME f5
                        from BOOK tb_1_
                        left join BOOK_STORE tb_2_ on 
                            tb_1_.STORE_ID = tb_2_.ID
                        where 
                            tb_1_.EDITION = :1
                        order by 
                            tb_1_.NAME asc
                    ) core__ 
                    where rownum <= :2
                `,
                args: [3, 2],
                purpose: "query"
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
                        tb_2_.book_id in(:1, :2)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(page).toEqual({
            "totalRowCount": 4,
            "totalPageCount": 2,
            "pageNo": 1,
            "isFirstPage": true,
            "isLastPage": false,
            "rows": [
                {
                    "name": "Effective TypeScript",
                    "price": 63.99,
                    "store": {
                        "name": "O'REILLY"
                    },
                    "authors": [
                        {
                            "name": {
                                "firstName": "Dan",
                                "lastName": "Vanderkam"
                            }
                        }
                    ]
                },
                {
                    "name": "GraphQL in Action",
                    "price": 79.99,
                    "store": {
                        "name": "MANNING"
                    },
                    "authors": [
                        {
                            "name": {
                                "firstName": "Samer",
                                "lastName": "Buna"
                            }
                        }
                    ]
                }
            ]
        });
    });

    it("page2OnAtomQuery", async () => {
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
                        tb_1_.EDITION = :1
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select
                        f1,
                        f2,
                        f3,
                        f4
                    from (
                        select 
                            core__.f1,
                            core__.f2,
                            core__.f3,
                            core__.f4,
                            rownum rn__
                        from (
                            select 
                                tb_1_.NAME f1,
                                tb_1_.PRICE f2,
                                tb_1_.STORE_ID f3,
                                tb_1_.ID f4
                            from BOOK tb_1_
                            where 
                                tb_1_.EDITION = :1
                            order by 
                                tb_1_.NAME asc
                        ) core__
                        where rownum <= :2
                    )
                    where rn__ > :3
                `,
                args: [3, 4, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = :1
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
                        tb_2_.book_id in(:1, :2)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [3, 9],
                purpose: "loadAssociation(Book.authors)"
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

    it("pageWithoutOrderByClause", async () => {
        const view = dto.view(BOOK, c => [
            c.$allScalars
        ]);
        const page = await sqlClient.findPage(
            view, 
            {pageNo: 2, pageSize: 2}
        );
        sqlRecord.assert(
            {
                sql: `
                    select 
                        count(1)
                    from BOOK tb_1_
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select
                        f1,
                        f2,
                        f3,
                        f4
                    from (
                        select 
                            core__.f1,
                            core__.f2,
                            core__.f3,
                            core__.f4,
                            rownum rn__
                        from (
                            select 
                                tb_1_.ID f1,
                                tb_1_.NAME f2,
                                tb_1_.EDITION f3,
                                tb_1_.PRICE f4
                            from BOOK tb_1_
                        ) core__
                        where rownum <= :1
                    )
                    where rn__ > :2
                `,
                args: [4, 2],
                purpose: "query"
            }
        )
        expect(page).toEqual({
            "totalRowCount": 12,
            "totalPageCount": 6,
            "pageNo": 2,
            "isFirstPage": false,
            "isLastPage": false,
            "rows": [
                {
                    "id": 3,
                    "name": "Learning GraphQL",
                    "edition": 3,
                    "price": 33.99
                },
                {
                    "id": 4,
                    "name": "Effective TypeScript",
                    "edition": 1,
                    "price": 43.99
                }
            ]
        });
    });

    it("pageOnMergedQuery", async() => {
        const view = dto.view(BOOK, c => [
            c.$allScalars
        ]);
        await expect(async () => {
            await dsl.unionAll(
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
                pageSize: 2
            });
        }).rejects.toThrowError(
            "Unable to paginate a set operation query (UNION, UNION ALL, EXCEPT, EXCEPT ALL, INTERSECT, or INTERSECT ALL) " + 
            "using \"OracleDriver\": pagination for SQL Server 2005~2008 relies on wrapping the query with " + 
            "\"ROW_NUMBER() OVER(...)\", which cannot be applied directly on top of a set operation query. " + 
            "To fix this, either use \"Oracle12Driver\" (or a later version), which supports " + 
            "\"OFFSET ... FETCH NEXT ... ROWS ONLY\" and can paginate set operation queries directly, " + 
            "or restructure the query so pagination is applied to each sub-query individually " + 
            "before the set operation is performed."
        );
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
                        core__.f1,
                        core__.f2,
                        core__.f3,
                        core__.f4,
                        core__.f5
                    from (
                        select 
                            tb_1_.X f1,
                            tb_1_.A f2,
                            tb_1_.B f3,
                            tb_1_.NAME f4,
                            tb_1_.CREATED_TIME f5
                        from "ORDER" tb_1_
                        where 
                                tb_1_.CREATED_TIME - NUMTODSINTERVAL(7200, 'SECOND') < :1
                            and
                                tb_1_.CREATED_TIME - NUMTODSINTERVAL(3600, 'SECOND') > :2
                    ) core__ 
                    where rownum <= :3
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
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) = (:1, :2, :3)
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
                        core__.f1,
                        core__.f2,
                        core__.f3,
                        core__.f4,
                        core__.f5
                    from (
                        select 
                            tb_1_.X f1,
                            tb_1_.A f2,
                            tb_1_.B f3,
                            tb_1_.NAME f4,
                            tb_1_.CREATED_TIME f5
                        from "ORDER" tb_1_
                        where 
                            (cast (tb_1_.CREATED_TIME as date) - cast (:1 as date)) * 24 between :2 and :3
                    ) core__ 
                    where rownum <= :4
                `,
                args: [
                    new Date("2026-08-23T12:00:00.000Z"),
                    1.1,
                    1.9,
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
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) = (:1, :2, :3)
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