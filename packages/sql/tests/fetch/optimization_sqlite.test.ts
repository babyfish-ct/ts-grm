import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { BOOK, ORDER_ITEM, STUDENT, TAG } from "../model/model";
import { dto } from "@ts-grm/core";

describe("OptimizationTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("m2o", async() => {
        const view = dto.view(BOOK, c => [
            c.$allScalars,
            c.store.with(c => [c.id])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.storeId.eq(2));
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE,
                        tb_1_.STORE_ID
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID = ?
                `,
                args: [2],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1,
                "price": 59.99,
                "store": {
                    "id": "2"
                }
            },
            {
                "id": 11,
                "name": "GraphQL in Action",
                "edition": 2,
                "price": 69.99,
                "store": {
                    "id": "2"
                }
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3,
                "price": 79.99,
                "store": {
                    "id": "2"
                }
            }
        ]);
    });

    it("multipleColumnsM2O", async () => {
        const view = dto.view(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
                c.id.with(c => [
                    c.x,
                    c.y.with(c => [
                        c.b
                    ])
                ])
            ])
        ]);
        const rows = await sqlClient.createQuery(ORDER_ITEM, (q, item) => {
            q.where(item.id.in(6, 7));
            return q.select(
                item.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b
                    from ORDER_ITEM tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: [6, 7],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {
                "id": 6,
                "order": {
                    "id": {
                        "x": 2,
                        "y": {
                            "b": 1
                        }
                    }
                }
            },
            {
                "id": 7,
                "order": {
                    "id": {
                        "x": 2,
                        "y": {
                            "b": 2
                        }
                    }
                }
            }
        ]);
    });

    it("m2m", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authors.with(c => [c.id]).sort()
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
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.book_id,
                        tb_1_.author_id
                    from book_author_mapping tb_1_
                    where 
                        tb_1_.book_id in(?, ?, ?, ?)
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authors": [
                    {"id": 3}
                ]
            },
            {
                "name": "GraphQL in Action",
                "authors": [
                    {"id": 7}
                ]
            },
            {
                "name": "Learning GraphQL",
                "authors": [
                    {"id": 1},
                    {"id": 2}
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authors": [
                    {"id": 4},
                    {"id": 5},
                    {"id": 6}
                ]
            }
        ]);
    });

    it("multipleColumnsM2M", async () => {
        const view = dto.view(TAG, c => [
            c.name,
            c.orders.with(c => [
                c.id.with(c => [
                    c.x,
                    c.y.with(c => [c.b])
                ])
            ])
        ]);
        const rows = await sqlClient.createQuery(TAG, (q, tag) => {
            return q.select(
                tag.fetch(view)
            )
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.LOW,
                        tb_1_.HIGH
                    from TAG tb_1_
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.tag_low,
                        tb_1_.tag_high,
                        tb_1_.order_x,
                        tb_1_.order_y_b
                    from ORDER_TAG_MAPPING tb_1_
                    where 
                        (tb_1_.tag_low, tb_1_.tag_high) in(
                            (?, ?),
                            (?, ?),
                            (?, ?),
                            (?, ?),
                            (?, ?),
                            (?, ?),
                            (?, ?)
                        )
                `,
                args: [1, 1, 1, 2, 1, 3, 1, 4, 2, 1, 2, 2, 2, 3],
                purpose: "loadAssociation(Tag.orders)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "red",
                "orders": [
                    {
                        "id": {
                            "x": 2,
                            "y": {
                                "b": 2
                            }
                        }
                    }
                ]
            },
            {
                "name": "orange",
                "orders": [
                    {
                        "id": {
                            "x": 1,
                            "y": {
                                "b": 1
                            }
                        }
                    },
                    {
                        "id": {
                            "x": 2,
                            "y": {
                                "b": 2
                            }
                        }
                    }
                ]
            },
            {
                "name": "yellow",
                "orders": [
                    {
                        "id": {
                            "x": 1,
                            "y": {
                                "b": 1
                            }
                        }
                    }
                ]
            },
            {
                "name": "green",
                "orders": [
                    {
                        "id": {
                            "x": 1,
                            "y": {
                                "b": 2
                            }
                        }
                    }
                ]
            },
            {
                "name": "cyan",
                "orders": [
                    { 
                        "id": {
                            "x": 1,
                            "y": {
                                "b": 2
                            }
                        }
                    }
                ]
            },
            {
                "name": "blue",
                "orders": [
                    {
                        "id": {
                            "x": 2,
                            "y": {
                                "b": 1
                            }
                        }
                    }
                ]
            },
            {
                "name": "purple",
                "orders": [
                    {
                        "id": {
                            "x": 2,
                            "y": {
                                "b": 1
                            }
                        }
                    }
                ]
            }
        ]);
    });

    it("m2mByJoinEntity", async() => {
        const view = dto.view(STUDENT, c => [
            c.name,
            c.courses.with(c => [c.id])
        ]);
        const rows = await sqlClient.createQuery(STUDENT, (q, student) => {
            return q.select(
                student.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from STUDENT tb_1_
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STUDENT_ID,
                        tb_1_.COURSE_ID
                    from LEARNING_LINK tb_1_
                    where 
                        tb_1_.STUDENT_ID in(?, ?, ?, ?)
                `,
                args: [1, 2, 3, 4],
                purpose: "loadAssociation(Student.learningLinks)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Tim",
                "courses": [
                    { "id": 2 },
                    { "id": 3 }
                ]
            },
            {
                "name": "Sam",
                "courses": [
                    {"id": 1},
                    {"id": 4}
                ]
            },
            {
                "name": "Tom",
                "courses": [
                    {"id": 2},
                    {"id": 3}
                ]
            },
            {
                "name": "Jim",
                "courses": [
                    {"id": 1},
                    {"id": 4}
                ]
            }
        ]);
    });
});