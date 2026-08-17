import { describe, it, expect } from "vitest";
import { isExternalDbTestEnabled, newSqlRecord } from "../utils";
import { useOracle12ClientWithData } from "../data_utils";
import { BOOK } from "../model/model";
import { dsl, dto } from "@ts-grm/core";

describe.runIf(isExternalDbTestEnabled)("Oracle12Test", () => {

    const sqlRecord = newSqlRecord();
    
    const sqlClient = useOracle12ClientWithData(sqlRecord);

    it("pageOnAtomQuery", async() => {
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
                        tb_1_.NAME,
                        tb_1_.PRICE,
                        tb_1_.STORE_ID,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = :1
                    order by 
                        tb_1_.NAME asc
                    offset :2 rows
                    fetch next :3 rows only
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
        const page = await sqlClient.findPage(view, {pageNo: 2, pageSize: 2});
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
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    offset :1 rows
                    fetch next :2 rows only
                `,
                args: [2, 2],
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
                                tb_1_.STORE_ID = :1
                            and
                                tb_1_.EDITION = :2
                        union all
                        select 
                            tb_2_.ID,
                            tb_2_.NAME,
                            tb_2_.EDITION,
                            tb_2_.PRICE
                        from BOOK tb_2_
                        where 
                                tb_2_.STORE_ID = :3
                            and
                                tb_2_.EDITION = :4
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
                                tb_1_.STORE_ID = :1
                            and
                                tb_1_.EDITION = :2
                        union all
                        select 
                            tb_2_.ID,
                            tb_2_.NAME,
                            tb_2_.EDITION,
                            tb_2_.PRICE
                        from BOOK tb_2_
                        where 
                                tb_2_.STORE_ID = :3
                            and
                                tb_2_.EDITION = :4
                    ) core__
                    offset :5 rows
                    fetch next :6 rows only
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
});