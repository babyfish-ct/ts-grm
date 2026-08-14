import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqlServerClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { BOOK } from "../model/model";

describe("SqlServerTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqlServerClientWithData(sqlRecord);

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
});