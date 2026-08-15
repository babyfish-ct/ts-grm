import { describe, it, expect } from "vitest";
import { AUTHOR, BOOK, BOOK_STORE, STUDENT } from "../model/model";
import { dto } from "@ts-grm/core";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import z from "zod";

describe("TsFormulaTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("fullName", async () => {
        const view = dto.view(AUTHOR, c => [c.fullName]);
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(author.id.in(1, 2));
            return q.select(author.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME
                from AUTHOR tb_1_
                where 
                    tb_1_.ID in(?, ?)
            `,
            args: [1, 2],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"fullName":"Eve Procello"},
            {"fullName":"Alex Banks"}
        ]);
    });

    it("bookNames", async () => {
        const view = dto.view(BOOK_STORE, c => [c.bookNames]);
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            return q.select(store.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
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
                        tb_1_.EDITION
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID in(?, ?)
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["1", "2"],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(rows).toEqual([
            {
                "bookNames": [
                    "Effective TypeScript(3)",
                    "Effective TypeScript(2)",
                    "Effective TypeScript(1)",
                    "Learning GraphQL(3)",
                    "Learning GraphQL(2)",
                    "Learning GraphQL(1)",
                    "YugabyteDB: The Definitive Guide(3)",
                    "YugabyteDB: The Definitive Guide(2)",
                    "YugabyteDB: The Definitive Guide(1)"
                ]
            },
            {
                "bookNames": [
                    "GraphQL in Action(3)",
                    "GraphQL in Action(2)",
                    "GraphQL in Action(1)"
                ]
            }
        ]);
    });

    it("association", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.authors.with(c => [c.fullName])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.name.ilike("yugabyte"));
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        lower(tb_1_.NAME) like ?
                `,
                args: ['%yugabyte%'],
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
                        tb_2_.book_id in(?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [7, 8, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1,
                "authors": [
                    { "fullName": "Kannappan Muthukkaruppan" },
                    { "fullName": "Karthik Ranganathan" },
                    { "fullName": "Mikhail Bautin" }
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2,
                "authors": [
                    { "fullName": "Kannappan Muthukkaruppan" },
                    { "fullName": "Karthik Ranganathan" },
                    { "fullName": "Mikhail Bautin" }
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "authors": [
                    { "fullName": "Kannappan Muthukkaruppan" },
                    { "fullName": "Karthik Ranganathan" },
                    { "fullName": "Mikhail Bautin" }
                ]
            }
        ]);
    });

    it("deepAssociation", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.store.with(c => [
                c.bookNames
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.name.ilike("yugabyte"));
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.STORE_ID
                    from BOOK tb_1_
                    where 
                        lower(tb_1_.NAME) like ?
                `,
                args: ['%yugabyte%'],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID
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
                        tb_1_.STORE_ID,
                        tb_1_.NAME,
                        tb_1_.EDITION
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID = ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["1"],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1,
                "store": {
                    "bookNames": [
                        "Effective TypeScript(3)",
                        "Effective TypeScript(2)",
                        "Effective TypeScript(1)",
                        "Learning GraphQL(3)",
                        "Learning GraphQL(2)",
                        "Learning GraphQL(1)",
                        "YugabyteDB: The Definitive Guide(3)",
                        "YugabyteDB: The Definitive Guide(2)",
                        "YugabyteDB: The Definitive Guide(1)"
                    ]
                }
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2,
                "store": {
                    "bookNames": [
                        "Effective TypeScript(3)",
                        "Effective TypeScript(2)",
                        "Effective TypeScript(1)",
                        "Learning GraphQL(3)",
                        "Learning GraphQL(2)",
                        "Learning GraphQL(1)",
                        "YugabyteDB: The Definitive Guide(3)",
                        "YugabyteDB: The Definitive Guide(2)",
                        "YugabyteDB: The Definitive Guide(1)"
                    ]
                }
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "store": {
                    "bookNames": [
                        "Effective TypeScript(3)",
                        "Effective TypeScript(2)",
                        "Effective TypeScript(1)",
                        "Learning GraphQL(3)",
                        "Learning GraphQL(2)",
                        "Learning GraphQL(1)",
                        "YugabyteDB: The Definitive Guide(3)",
                        "YugabyteDB: The Definitive Guide(2)",
                        "YugabyteDB: The Definitive Guide(1)"
                    ]
                }
            }
        ]);
    });

    it("flatDeepAssociation", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.$flat("store").with(c => [
                c.bookNames
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.name.ilike("yugabyte"));
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.STORE_ID
                    from BOOK tb_1_
                    where 
                        lower(tb_1_.NAME) like ?
                `,
                args: ['%yugabyte%'],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID
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
                        tb_1_.STORE_ID,
                        tb_1_.NAME,
                        tb_1_.EDITION
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID = ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["1"],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1,
                "storeBookNames": [
                    "Effective TypeScript(3)",
                    "Effective TypeScript(2)",
                    "Effective TypeScript(1)",
                    "Learning GraphQL(3)",
                    "Learning GraphQL(2)",
                    "Learning GraphQL(1)",
                    "YugabyteDB: The Definitive Guide(3)",
                    "YugabyteDB: The Definitive Guide(2)",
                    "YugabyteDB: The Definitive Guide(1)"
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2,
                "storeBookNames": [
                    "Effective TypeScript(3)",
                    "Effective TypeScript(2)",
                    "Effective TypeScript(1)",
                    "Learning GraphQL(3)",
                    "Learning GraphQL(2)",
                    "Learning GraphQL(1)",
                    "YugabyteDB: The Definitive Guide(3)",
                    "YugabyteDB: The Definitive Guide(2)",
                    "YugabyteDB: The Definitive Guide(1)"
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "storeBookNames": [
                    "Effective TypeScript(3)",
                    "Effective TypeScript(2)",
                    "Effective TypeScript(1)",
                    "Learning GraphQL(3)",
                    "Learning GraphQL(2)",
                    "Learning GraphQL(1)",
                    "YugabyteDB: The Definitive Guide(3)",
                    "YugabyteDB: The Definitive Guide(2)",
                    "YugabyteDB: The Definitive Guide(1)"
                ]
            }
        ]);
    });

    it("dtoLevel", async() => {
        const view = dto.view(BOOK, c => [
            c.$formula.ts({
                alias: "key",
                valueType: z.string(),
                dependency: c => [
                    c.name,
                    c.edition
                ],
                fn: data => `${data.name}(${data.edition})`
            })
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.storeId.eq(2));
            q.orderBy(book.name, book.edition.desc());
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.EDITION
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID = ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: [2],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            { "key": "GraphQL in Action(3)" },
            { "key": "GraphQL in Action(2)" },
            { "key": "GraphQL in Action(1)" }
        ]);
    });

    it("dtoLevelComplex", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.$formula.ts({
                alias: "authorNames",
                valueType: z.array(z.string()),
                dependency: c => [
                    c.authors.with(c => [
                        c.name
                    ])
                ],
                fn: data => data.authors.map(a => `${a.name.firstName} ${a.name.lastName}`)
            })
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.name.like("Yugabyte", "STARTS_WITH"));
            q.orderBy(book.edition);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.NAME like ?
                    order by 
                        tb_1_.EDITION asc
                `,
                args: ["Yugabyte%"],
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
                        tb_2_.book_id in(?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [7, 8, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1,
                "authorNames": [
                    "Kannappan Muthukkaruppan",
                    "Karthik Ranganathan",
                    "Mikhail Bautin"
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2,
                "authorNames": [
                    "Kannappan Muthukkaruppan",
                    "Karthik Ranganathan",
                    "Mikhail Bautin"
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "authorNames": [
                    "Kannappan Muthukkaruppan",
                    "Karthik Ranganathan",
                    "Mikhail Bautin"
                ]
            }
        ]);
    });

    it("dtoLevelByJoinEntity", async() => {
        const view = dto.view(STUDENT, c => [
            c.name,
            c.$formula.ts({
                alias: "courseNames",
                valueType: z.array(z.string()),
                dependency: c => [
                    c.courses.with(c => [
                        c.name
                    ])
                ],
                fn: data => data.courses.map(course => course.name)
            })
        ]);
        const rows = await sqlClient.createQuery(STUDENT, (q, student) => {
            q.where(student.name.like("i"));
            q.orderBy(student.name);
            return q.select(student.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from STUDENT tb_1_
                    where 
                        tb_1_.NAME like ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: ["%i%"],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STUDENT_ID,
                        tb_1_.COURSE_ID,
                        tb_2_.NAME
                    from LEARNING_LINK tb_1_
                    inner join COURSE tb_2_ on 
                        tb_1_.COURSE_ID = tb_2_.ID
                    where 
                        tb_1_.STUDENT_ID in(?, ?)
                `,
                args: [4, 1],
                purpose: "loadAssociation(Student.learningLinks)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Jim",
                "courseNames": [
                    "Psychology and Life",
                    "Introduction to Artificial Intelligence"
                ]
            },
            {
                "name": "Tim",
                "courseNames": [
                    "Film Appreciation",
                    "Workplace Communication and Presentation"
                ]
            }
        ]);
    });
});