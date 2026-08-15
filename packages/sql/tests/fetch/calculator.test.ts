import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { BOOK_STORE } from "../model/model";

describe("CalculatorTest", async() => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("targetCalculator", async () => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.newestBooks.with(c => [
                c.name,
                c.edition,
                c.price
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            return q.select(
                store.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK_STORE tb_1_
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STORE_ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    where 
                        (tb_1_.NAME, tb_1_.EDITION) in(
                            select 
                                tb_2_.NAME,
                                max(tb_2_.EDITION)
                            from BOOK tb_2_
                            where 
                                tb_2_.STORE_ID in(?, ?)
                            group by 
                                tb_2_.NAME
                        )
                `,
                args: ["1", "2"],
                purpose: "loadCalculator(BookStore.newestBooks)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "O'REILLY",
                "newestBooks": [
                    {
                        "name": "Effective TypeScript",
                        "edition": 3,
                        "price": 63.99
                    },
                    {
                        "name": "Learning GraphQL",
                        "edition": 3,
                        "price": 33.99
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "edition": 3,
                        "price": 89.99
                    }
                ]
            },
            {
                "name": "MANNING",
                "newestBooks": [
                    {
                        "name": "GraphQL in Action",
                        "edition": 3,
                        "price": 79.99
                    }
                ]
            }
        ]);
    });

    it("parameterizedTargetCalculator", async() => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.$parameterized("specifiedBooks", {minPrice: 60}).as("expensiveBooks").with(c => [
                c.name,
                c.edition,
                c.price
            ]),
            c.$parameterized("specifiedBooks", {maxPriceExclusive: 60}).as("cheapBooks").with(c => [
                c.name,
                c.edition,
                c.price
            ])
        ]);
        const row = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.id.eq(1));
            return q.select(
                store.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [1, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STORE_ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    where 
                            tb_1_.STORE_ID = ?
                        and
                            tb_1_.PRICE >= ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION asc
                `,
                args: ["1", 60],
                purpose: 'loadCalculator(BookStore.specifiedBooks, {"minPrice":60})'
            },
            {
                sql: `
                    select 
                        tb_1_.STORE_ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    where 
                            tb_1_.STORE_ID = ?
                        and
                            tb_1_.PRICE < ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION asc
                `,
                args: ["1", 60],
                purpose: 'loadCalculator(BookStore.specifiedBooks, {"maxPriceExclusive":60})'
            }
        );
        expect(row).toEqual({
            "name": "O'REILLY",
            "expensiveBooks": [
                {
                    "name": "Effective TypeScript",
                    "edition": 3,
                    "price": 63.99
                },
                {
                    "name": "YugabyteDB: The Definitive Guide",
                    "edition": 1,
                    "price": 69.99
                },
                {
                    "name": "YugabyteDB: The Definitive Guide",
                    "edition": 2,
                    "price": 79.99
                },
                {
                    "name": "YugabyteDB: The Definitive Guide",
                    "edition": 3,
                    "price": 89.99
                }
            ],
            "cheapBooks": [
                {
                    "name": "Effective TypeScript",
                    "edition": 1,
                    "price": 43.99
                },
                {
                    "name": "Effective TypeScript",
                    "edition": 2,
                    "price": 53.99
                },
                {
                    "name": "Learning GraphQL",
                    "edition": 1,
                    "price": 33.99
                },
                {
                    "name": "Learning GraphQL",
                    "edition": 2,
                    "price": 33.99
                },
                {
                    "name": "Learning GraphQL",
                    "edition": 3,
                    "price": 33.99
                }
            ]
        });
    });
});