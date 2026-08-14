import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useMySqlClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { BOOK } from "../model/model";

describe("MySqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useMySqlClientWithData(sqlRecord);

    it("simple", async() => {
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
});