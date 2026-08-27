import { describe, it, expect } from "vitest";
import { isExternalDbTestEnabled, newSqlRecord } from "../utils";
import { useSqlServerClientWithData } from "../data_utils";
import { dsl, dto } from "@ts-grm/core";
import { BOOK, CATEGORY, ORDER } from "../model/model";

describe.runIf(isExternalDbTestEnabled)("SqlServerTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqlServerClientWithData(sqlRecord);

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
                        tb_1_.EDITION = @p1
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
                        tb_2_.book_id in(@p1, @p2, @p3, @p4)
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

    it("tupleEq", async() => {
        const view = dto.view(ORDER, c => [
            c.name,
            c.items.with(c => [
                c.productName
            ])
        ]);
        const row = await sqlClient.createQuery(ORDER, (q, order) => {
            q.orderBy(order.name);
            return q.select(order.fetch(view));
        }).limit(1).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        f1,
                        f2,
                        f3,
                        f4
                    from (
                        select 
                            tb_1_.NAME f1,
                            tb_1_.X f2,
                            tb_1_.A f3,
                            tb_1_.B f4,
                            row_number() over(
                                order by 
                                    tb_1_.NAME asc
                            ) rn__
                        from [ORDER] tb_1_
                    ) core__
                    where rn__ between @p1 and @p2
                    order by rn__
                `,
                args: [1, 1],
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
                            tb_1_.order_x = @p1
                        and
                            tb_1_.order_y_a = @p2
                        and
                            tb_1_.order_y_b = @p3
                `,
                args: [1, 1, 1],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(row).toEqual({
            "name": "order-1",
            "items": [
                {
                    "productName": "Pen"
                },
                {
                    "productName": "Pencil"
                }
            ]
        });
    });

    it("tupleIn", async () => {
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
                        f1,
                        f2,
                        f3,
                        f4
                    from (
                        select 
                            tb_1_.NAME f1,
                            tb_1_.X f2,
                            tb_1_.A f3,
                            tb_1_.B f4,
                            row_number() over(
                                order by 
                                    tb_1_.NAME asc
                            ) rn__
                        from [ORDER] tb_1_
                    ) core__
                    where rn__ between @p1 and @p2
                    order by rn__
                `,
                args: [1, 2],
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
                                tb_1_.order_x = @p1
                            and
                                tb_1_.order_y_a = @p2
                            and
                                tb_1_.order_y_b = @p3
                        or
                                tb_1_.order_x = @p4
                            and
                                tb_1_.order_y_a = @p5
                            and
                                tb_1_.order_y_b = @p6
                `,
                args: [1, 1, 1, 1, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        )
        expect(rows).toEqual([
            {
                "name": "order-1",
                "items": [
                    {
                        "productName": "Pen"
                    },
                    {
                        "productName": "Pencil"
                    }
                ]
            },
            {
                "name": "order-2",
                "items": [
                    {
                        "productName": "Panio"
                    },
                    {
                        "productName": "Bike"
                    }
                ]
            }
        ]);
    });

    it("page1OnAtomQuery", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
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
                        tb_1_.EDITION = @p1
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
                            tb_1_.NAME f1,
                            tb_1_.STORE_ID f2,
                            tb_1_.ID f3,
                            tb_2_.NAME f4,
                            row_number() over(
                                order by 
                                    tb_1_.NAME asc
                            ) rn__
                        from BOOK tb_1_
                        left join BOOK_STORE tb_2_ on 
                            tb_1_.STORE_ID = tb_2_.ID
                        where 
                            tb_1_.EDITION = @p1
                    ) core__
                    where rn__ between @p2 and @p3
                    order by rn__
                `,
                args: [3, 1, 2],
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
                        tb_2_.book_id in(@p1, @p2)
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
                }
            ]
        });
    });

    it("page2OnAtomQuery", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
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
                        tb_1_.EDITION = @p1
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        f1,
                        f2,
                        f3
                    from (
                        select 
                            tb_1_.NAME f1,
                            tb_1_.STORE_ID f2,
                            tb_1_.ID f3,
                            row_number() over(
                                order by 
                                    tb_1_.NAME asc
                            ) rn__
                        from BOOK tb_1_
                        where 
                            tb_1_.EDITION = @p1
                    ) core__
                    where rn__ between @p2 and @p3
                    order by rn__
                `,
                args: [3, 3, 4],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = @p1
                `,
                args: ['1'],
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
                        tb_2_.book_id in(@p1, @p2)
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
        await expect(async () => {
            await sqlClient.findPage(view, {pageNo: 2, pageSize: 2})
        }).rejects.toThrowError(
            "Pagination without an \"order by\" clause is not supported by the current driver \"SqlServer\""
        );
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
            "Pagination without an \"order by\" clause is not supported by the current driver \"SqlServer\", " + 
            "please use explicit base query API (Derived table or CTE) instead"
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
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME,
                        tb_1_.CREATED_TIME
                    from [ORDER] tb_1_
                    where 
                            DATEADD(hour, -2, tb_1_.CREATED_TIME) < @p1
                        and
                            DATEADD(hour, -1, tb_1_.CREATED_TIME) > @p2
                `,
                args: [
                    new Date("2026-08-23T12:00:00.000Z"),
                    new Date("2026-08-23T12:00:00.000Z")
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
                            tb_1_.order_x = @p1
                        and
                            tb_1_.order_y_a = @p2
                        and
                            tb_1_.order_y_b = @p3
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
        sqlRecord.log();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME,
                        tb_1_.CREATED_TIME
                    from [ORDER] tb_1_
                    where 
                        datediff(
                            millisecond,
                            @p1,
                            tb_1_.CREATED_TIME
                        ) / 3600000.0 between @p2 and @p3
                `,
                args: [
                    new Date("2026-08-23T12:00:00.000Z"),
                    1.1,
                    1.9
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
                            tb_1_.order_x = @p1
                        and
                            tb_1_.order_y_a = @p2
                        and
                            tb_1_.order_y_b = @p3
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

    it("recursiveWithDerivedRoot", async () => {
        const view = dto.view(CATEGORY, c => [
            c.name,
            c.manager,
            c.$recursive("childNodes").sort("name")
        ]);
        const rows = await sqlClient.createQuery(CATEGORY, (q, category) => {
            q.where(category.parentNodeId.isNull());
            return q.select(category.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_2_.NAME,
                        tb_1_.MANAGER,
                        tb_2_.ID
                    from CATEGORY tb_1_
                    inner join TREE_NODE tb_2_ on 
                        tb_1_.ID = tb_2_.ID
                    where 
                        tb_2_.PARENT_NODE_ID is null
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    with
                        tb_1_(c1, c2, c3, c4) as (
                            select 
                                tb_2_.PARENT_NODE_ID,
                                tb_2_.NAME,
                                tb_2_.ID,
                                0
                            from TREE_NODE tb_2_
                            where 
                                tb_2_.PARENT_NODE_ID = @p1
                            union all
                            select 
                                tb_3_.PARENT_NODE_ID,
                                tb_3_.NAME,
                                tb_3_.ID,
                                tb_1_.c4 + 1
                            from TREE_NODE tb_3_
                            inner join tb_1_ on 
                                tb_3_.PARENT_NODE_ID = tb_1_.c3
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from tb_1_
                    order by 
                        tb_1_.c4 asc,
                        tb_1_.c2 asc
                `,
                args: [1],
                purpose: "loadRecursiveTree(TreeNode.childNodes)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Home",
                "manager": "Michael",
                "childNodes": [
                    {
                        "name": "Clothing",
                        "childNodes": [
                            {
                                "name": "Man",
                                "childNodes": [
                                    {
                                        "name": "Casual wear",
                                        "childNodes": [
                                            {
                                                "name": "Jacket",
                                                "childNodes": []
                                            },
                                            {
                                                "name": "Jeans",
                                                "childNodes": []
                                            }
                                        ]
                                    },
                                    {
                                        "name": "Formal wear",
                                        "childNodes": [
                                            {
                                                "name": "Shirt",
                                                "childNodes": []
                                            },
                                            {
                                                "name": "Suit",
                                                "childNodes": []
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "name": "Woman",
                                "childNodes": [
                                    {
                                        "name": "Casual wear",
                                        "childNodes": [
                                            {
                                                "name": "Dress",
                                                "childNodes": []
                                            },
                                            {
                                                "name": "Jeans",
                                                "childNodes": []
                                            },
                                            {
                                                "name": "Miniskirt",
                                                "childNodes": []
                                            }
                                        ]
                                    },
                                    {
                                        "name": "Formal wear",
                                        "childNodes": [
                                            {
                                                "name": "Shirt",
                                                "childNodes": []
                                            },
                                            {
                                                "name": "Suit",
                                                "childNodes": []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "name": "Food",
                        "childNodes": [
                            {
                                "name": "Bread",
                                "childNodes": [
                                    {
                                        "name": "Baguette",
                                        "childNodes": []
                                    },
                                    {
                                        "name": "Ciabatta",
                                        "childNodes": []
                                    }
                                ]
                            },
                            {
                                "name": "Drinks",
                                "childNodes": [
                                    {
                                        "name": "Coca Cola",
                                        "childNodes": []
                                    },
                                    {
                                        "name": "Fanta",
                                        "childNodes": []
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]);
    });
});