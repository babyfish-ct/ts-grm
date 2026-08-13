import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useOracleClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { BOOK, ORDER } from "../model/model";

describe.sequential("OracleTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useOracleClientWithData(sqlRecord);

    it("simple", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.store.fetch("JOIN_UNPAGED_ONLY").with(c => [
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
                        core__.*
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
            c.store.fetch("JOIN_UNPAGED_ONLY").with(c => [
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
                        core__.*
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
                        *
                    from (
                        select 
                            core__.*,
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
});