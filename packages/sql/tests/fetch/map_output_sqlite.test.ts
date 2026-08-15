import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { dsl, dto } from "@ts-grm/core";
import { AUTHOR, BOOK, BOOK_STORE } from "../model/model";
import z from "zod";

describe("MapOutputSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("oneOutputMapper", async() => {
        const view = dto.view(BOOK, c => [
            c.name.mapOutput(
                z.string(), value => `${
                    value.slice(0, 2)
                }${
                    '*'.repeat(value.length - 4)
                }${
                    value.slice(-2)
                }`
            ),
            c.edition
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                    tb_1_.EDITION = ?
                order by 
                    tb_1_.NAME asc
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "name": "Ef****************pt",
                "edition": 3
            },
            {
                "name": "Gr*************on",
                "edition": 3
            },
            {
                "name": "Le************QL",
                "edition": 3
            },
            {
                "name": "Yu****************************de",
                "edition": 3
            }
        ]);
    });

    it("twoOutputMappers", async () => {
        const view = dto.view(AUTHOR, c => [
            c.name,
            c.gender.mapOutput(z.enum(["Boy", "Girl"]), gender => {
                return gender === "MALE" ? "Boy" : "Girl";
            })
        ]);
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.orderBy(author.name().firstName, author.name().lastName);
            return q.select(author.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME,
                    tb_1_.GENDER
                from AUTHOR tb_1_
                order by 
                    tb_1_.FIRST_NAME asc,
                    tb_1_.LAST_NAME asc
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "name": {
                    "firstName": "Alex",
                    "lastName": "Banks"
                },
                "gender": "Boy"
            },
            {
                "name": {
                    "firstName": "Dan",
                    "lastName": "Vanderkam"
                },
                "gender": "Boy"
            },
            {
                "name": {
                    "firstName": "Eve",
                    "lastName": "Procello"
                },
                "gender": "Girl"
            },
            {
                "name": {
                    "firstName": "Kannappan",
                    "lastName": "Muthukkaruppan"
                },
                "gender": "Boy"
            },
            {
                "name": {
                    "firstName": "Karthik",
                    "lastName": "Ranganathan"
                },
                "gender": "Boy"
            },
            {
                "name": {
                    "firstName": "Mikhail",
                    "lastName": "Bautin"
                },
                "gender": "Boy"
            },
            {
                "name": {
                    "firstName": "Samer",
                    "lastName": "Buna"
                },
                "gender": "Boy"
            }
        ]);
    });

    it("mapperOnTsFormula", async() => {
        const view = dto.view(AUTHOR, c => [
            c.id,
            c.fullName.mapOutput(z.string(), value => value.toUpperCase())
        ]);
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.orderBy(author.name().firstName, author.name().lastName);
            q.where(
                author.some(
                    "books", 
                    book => book.name.like("Yugabyte", "STARTS_WITH")
                )
            )
            return q.select(author.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME
                from AUTHOR tb_1_
                where 
                    exists(
                        select 
                            1
                        from BOOK tb_2_
                        inner join book_author_mapping tb_3_ on 
                            tb_2_.ID = tb_3_.book_id
                        where 
                                tb_3_.author_id = tb_1_.ID
                            and
                                tb_2_.NAME like ?
                    )
                order by 
                    tb_1_.FIRST_NAME asc,
                    tb_1_.LAST_NAME asc
            `,
            args: ["Yugabyte%"],
            purpose: "query"
        })
        expect(rows).toEqual([
            {
                "id": 5,
                "fullName": "KANNAPPAN MUTHUKKARUPPAN"
            },
            {
                "id": 4,
                "fullName": "KARTHIK RANGANATHAN"
            },
            {
                "id": 6,
                "fullName": "MIKHAIL BAUTIN"
            }
        ]);
    });

    it("mapperOnSqlFormula", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authorCount.mapOutput(
                z.string(), 
                value => `${value} author(s)`
            )
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.NAME,
                    (
                        select 
                            count(1)
                        from book_author_mapping tb_2_
                        where 
                            tb_2_.book_id = tb_1_.ID
                    )
                from BOOK tb_1_
                where 
                    tb_1_.EDITION = ?
                order by 
                    tb_1_.NAME asc
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authorCount": "1 author(s)"
            },
            {
                "name": "GraphQL in Action",
                "authorCount": "1 author(s)"
            },
            {
                "name": "Learning GraphQL",
                "authorCount": "2 author(s)"
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authorCount": "3 author(s)"
            }
        ]);
    });

    it("mapperOnTmpTsFormula", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.$formula.ts({
                alias: "authorNames",
                valueType: z.array(z.string()),
                dependency: c => [
                    c.authors.with(c => [
                        c.name
                    ])
                ],
                fn: data => data.authors.map(author => `${author.name.firstName} ${author.name.lastName}`)
            }).mapOutput(
                z.string(), 
                value => `There are ${value.length} author(s): ${value.join(", ")}`
            )
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
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authorNames": "There are 1 author(s): Dan Vanderkam"
            },
            {
                "name": "GraphQL in Action",
                "authorNames": "There are 1 author(s): Samer Buna"
            },
            {
                "name": "Learning GraphQL",
                "authorNames": "There are 2 author(s): Alex Banks, Eve Procello"
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authorNames": "There are 3 author(s): Kannappan Muthukkaruppan, Karthik Ranganathan, Mikhail Bautin"
            }
        ]);
    });

    it("mapperOnTmpSqlFormula", async() => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.$formula.sql({
                alias: "avgPrice",
                valueType: z.number(),
                fn: store => dsl.subQuery(BOOK, (q, book) => {
                    q.where(book.storeId.eq(store.id));
                    return q.select(dsl.avg(book.price).asNonNull());
                })
            }).mapOutput(
                z.string(), 
                value => `Thee average price of my books is: ${Math.round(value * 100) / 100}`
            )
        ]);
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.orderBy(store.name);
            return q.select(store.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.NAME,
                    (
                        select 
                            avg(tb_2_.PRICE)
                        from BOOK tb_2_
                        where 
                            tb_2_.STORE_ID = tb_1_.ID
                    )
                from BOOK_STORE tb_1_
                order by 
                    tb_1_.NAME asc
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "name": "MANNING",
                "avgPrice": "Thee average price of my books is: 69.99"
            },
            {
                "name": "O'REILLY",
                "avgPrice": "Thee average price of my books is: 55.99"
            }
        ]);
    });
});