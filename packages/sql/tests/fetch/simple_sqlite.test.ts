import { describe, it, expect } from "vitest";
import { useSqliteClientWithData } from "../data_utils";
import { AUTHOR, BOOK, BOOK_STORE, STUDENT } from "../model/model";
import { newSqlRecord } from "../utils";
import { dto } from "@ts-grm/core";

describe("SimpleSqliteFetchTest", () => {

    const sqlRecord = newSqlRecord();
    
    const sqlClient = useSqliteClientWithData(sqlRecord);
    
    it("alone", async() => {
        const view = dto.view(BOOK, c => [c.$allScalars.exclude("price")]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.storeId.eq(2));
            q.orderBy(book.edition.desc())
            return q.select(
                book.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
            select 
                tb_1_.ID,
                tb_1_.NAME,
                tb_1_.EDITION
            from BOOK tb_1_
            where 
                tb_1_.STORE_ID = ?
            order by 
                tb_1_.EDITION desc
            `,
            args: [2],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":12,"name":"GraphQL in Action","edition":3},
            {"id":11,"name":"GraphQL in Action","edition":2},
            {"id":10,"name":"GraphQL in Action","edition":1}
        ]);
    });

    it("m2o", async() => {
        const view = dto.view(BOOK, c => [
            c.$allScalars,
            c.store.with(c => [
                c.id,
                c.name,
                c.version
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.name.ilike("graphql"));
            q.orderBy(book.name, book.edition.desc());
            return q.select(
                book.fetch(view)
            );
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
                        lower(tb_1_.NAME) like ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["%graphql%"],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.VERSION
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: ["2", "1"],
                purpose: "loadAssociation(Book.store)"
            }
        );
        expect(rows).toEqual([
            {
                id: 12,
                name: 'GraphQL in Action',
                edition: 3,
                price: 79.99,
                store: { id: "2", name: 'MANNING', version: 1 }
            },
            {
                id: 11,
                name: 'GraphQL in Action',
                edition: 2,
                price: 69.99,
                store: { id: "2", name: 'MANNING', version: 1 }
            },
            {
                id: 10,
                name: 'GraphQL in Action',
                edition: 1,
                price: 59.99,
                store: { id: "2", name: 'MANNING', version: 1 }
            },
            {
                id: 3,
                name: 'Learning GraphQL',
                edition: 3,
                price: 33.99,
                store: { id: "1", name: "O'REILLY", version: 1 }
            },
            {
                id: 2,
                name: 'Learning GraphQL',
                edition: 2,
                price: 33.99,
                store: { id: "1", name: "O'REILLY", version: 1 }
            },
            {
                id: 1,
                name: 'Learning GraphQL',
                edition: 1,
                price: 33.99,
                store: { id: "1", name: "O'REILLY", version: 1 }
            }
        ]);
    });

    it("o2m", async () => {
        const view = dto.view(BOOK_STORE, c => [
            c.$allScalars,
            c.books.with(c => [
                c.id,
                c.name,
                c.edition
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.orderBy(store.name);
            return q.select(
                store.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.VERSION
                    from BOOK_STORE tb_1_
                    order by 
                        tb_1_.NAME asc
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STORE_ID,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID in(?, ?)
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["2", "1"],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(rows).toEqual([
            {
                "id": "2",
                "name": "MANNING",
                "version": 1,
                "books": [
                    {
                        "id": 12,
                        "name": "GraphQL in Action",
                        "edition": 3
                    },
                    {
                        "id": 11,
                        "name": "GraphQL in Action",
                        "edition": 2
                    },
                    {
                        "id": 10,
                        "name": "GraphQL in Action",
                        "edition": 1
                    }
                ]
            },
            {
                "id": "1",
                "name": "O'REILLY",
                "version": 1,
                "books": [
                    {
                        "id": 6,
                        "name": "Effective TypeScript",
                        "edition": 3
                    },
                    {
                        "id": 5,
                        "name": "Effective TypeScript",
                        "edition": 2
                    },
                    {
                        "id": 4,
                        "name": "Effective TypeScript",
                        "edition": 1
                    },
                    {
                        "id": 3,
                        "name": "Learning GraphQL",
                        "edition": 3
                    },
                    {
                        "id": 2,
                        "name": "Learning GraphQL",
                        "edition": 2
                    },
                    {
                        "id": 1,
                        "name": "Learning GraphQL",
                        "edition": 1
                    },
                    {
                        "id": 9,
                        "name": "YugabyteDB: The Definitive Guide",
                        "edition": 3
                    },
                    {
                        "id": 8,
                        "name": "YugabyteDB: The Definitive Guide",
                        "edition": 2
                    },
                    {
                        "id": 7,
                        "name": "YugabyteDB: The Definitive Guide",
                        "edition": 1
                    }
                ]
            }
        ]);
    });

    it("m2m", async() => {
        const view = dto.view(BOOK, c => [
            c.$allScalars,
            c.authors.with(c => [
                c.id,
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name.asc())
            return q.select(
                book.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
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
                        tb_1_.ID,
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
                "id": 6,
                "name": "Effective TypeScript",
                "edition": 3,
                "price": 63.99,
                "authors": [
                    {
                        "id": 3,
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ]
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3,
                "price": 79.99,
                "authors": [
                    {
                        "id": 7,
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ]
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3,
                "price": 33.99,
                "authors": [
                    {
                        "id": 2,
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "id": 1,
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ]
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "price": 89.99,
                "authors": [
                    {
                        "id": 5,
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "id": 4,
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "id": 6,
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ]
            }
        ]);
    });

    it("inverseM2M", async() => {
        const view = dto.view(AUTHOR, c => [
            c.$allScalars,
            c.books.with(c => [
                c.id,
                c.name,
                c.edition
            ])
        ]);
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(author.id.in(3, 7));
            return q.select(
                author.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME,
                        tb_1_.GENDER
                    from AUTHOR tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: [3, 7],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_2_.author_id,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION
                    from BOOK tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.book_id
                    where 
                        tb_2_.author_id in(?, ?)
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION asc
                `,
                args: [3, 7],
                purpose: "loadAssociation(Author.books)"
            }
        );
        expect(rows).toEqual([
            {
                "id": 3,
                "name": {
                    "firstName": "Dan",
                    "lastName": "Vanderkam"
                },
                "gender": "MALE",
                "books": [
                    {
                        "id": 4,
                        "name": "Effective TypeScript",
                        "edition": 1
                    },
                    {
                        "id": 5,
                        "name": "Effective TypeScript",
                        "edition": 2
                    },
                    {
                        "id": 6,
                        "name": "Effective TypeScript",
                        "edition": 3
                    }
                ]
            },
            {
                "id": 7,
                "name": {
                    "firstName": "Samer",
                    "lastName": "Buna"
                },
                "gender": "MALE",
                "books": [
                    {
                        "id": 10,
                        "name": "GraphQL in Action",
                        "edition": 1
                    },
                    {
                        "id": 11,
                        "name": "GraphQL in Action",
                        "edition": 2
                    },
                    {
                        "id": 12,
                        "name": "GraphQL in Action",
                        "edition": 3
                    }
                ]
            }
        ]);
    });

    it("m2mByJoinEntity", async() => {
        const view = dto.view(STUDENT, c => [
            c.name,
            c.courses.with(c => [
                c.name
            ])
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
                "courses": [
                    {
                        "name": "Psychology and Life"
                    },
                    {
                        "name": "Introduction to Artificial Intelligence"
                    }
                ]
            },
            {
                "name": "Tim",
                "courses": [
                    {
                        "name": "Film Appreciation"
                    },
                    {
                        "name": "Workplace Communication and Presentation"
                    }
                ]
            }
        ]);
    });
});