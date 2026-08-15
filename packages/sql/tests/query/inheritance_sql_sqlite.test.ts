import { describe, expect, it } from "vitest";
import { SIMPLE_BOOK_VIEW, SIMPLE_PAPER_BOOK_VIEW, SIMPLE_PHYSICAL_BOOK_STORE_VIEW, SIMPLE_STORE_VIEW } from "./utils";
import { BOOK, BOOK_STORE, ELECTRONIC_BOOK, PAPER_BOOK, PHYSICAL_BOOK_STORE } from "../model/model";
import { dsl } from "@ts-grm/core";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";

describe("InheritanceSqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);
    
    it("isFunctionOfMultipleTables", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(
                dsl.or(
                    book.name.ilike('graphql'),
                    book.is(ELECTRONIC_BOOK)
                )
            );
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                        lower(tb_1_.NAME) like ?
                    or
                        tb_1_.TYPE in('ElectronicBook', 'PdfElectronicBook')
            `,
            args: ["%graphql%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "name": "Learning GraphQL",
                "edition": 1
            },
            {
                "id": 2,
                "name": "Learning GraphQL",
                "edition": 2
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
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
        ]);
    });

    it("asFunctionOfMultipleTables", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(
                dsl.or(
                    book.name.ilike('graphql'),
                    book.as(ELECTRONIC_BOOK).address.like("https:", "STARTS_WITH")
                )
            );
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                left join ELECTRONIC_BOOK tb_2_ on 
                    tb_1_.TYPE in('ElectronicBook', 'PdfElectronicBook')
                and
                    tb_1_.ID = tb_2_.EB_ID
                where 
                        lower(tb_1_.NAME) like ?
                    or
                        tb_2_.ADDRESS like ?
            `,
            args: ["%graphql%", "https:%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "name": "Learning GraphQL",
                "edition": 1
            },
            {
                "id": 2,
                "name": "Learning GraphQL",
                "edition": 2
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
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
        ]);
    });

    it("superPropsOfMultipleTables", async () => {
        const rows = await sqlClient.createQuery(PAPER_BOOK, (q, book) => {
            q.where(
                book.size().width.gt(100),
                book.size().height.gt(100),
                book.name.ilike("db")
            );
            return q.select(book.fetch(SIMPLE_PAPER_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.PB_ID,
                    tb_2_.NAME,
                    tb_2_.EDITION,
                    tb_2_.PRICE,
                    tb_1_.WIDTH,
                    tb_1_.HEIGHT
                from PAPER_BOOK tb_1_
                inner join BOOK tb_2_ on 
                    tb_1_.PB_ID = tb_2_.ID
                where 
                        tb_1_.WIDTH > ?
                    and
                        tb_1_.HEIGHT > ?
                    and
                        lower(tb_2_.NAME) like ?
            `,
            args: [100, 100, "%db%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 7,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 1,
                "price": 69.99,
                "size": {
                    "width": 145,
                    "height": 210
                }
            },
            {
                "id": 8,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2,
                "price": 79.99,
                "size": {
                    "width": 145,
                    "height": 210
                }
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "price": 89.99,
                "size": {
                    "width": 145,
                    "height": 210
                }
            }
        ]);
    });

    it("superPropOfDownCastTypeOfMultipleTables", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(
                dsl.or(
                    book.name.ilike('graphql'),
                    book.as(ELECTRONIC_BOOK).address.like("https:", "STARTS_WITH"),
                    book.as(ELECTRONIC_BOOK).edition.lt(3),
                    book.as(ELECTRONIC_BOOK).edition.gt(10)
                )
            );
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                left join ELECTRONIC_BOOK tb_2_ on 
                    tb_1_.TYPE in('ElectronicBook', 'PdfElectronicBook')
                and
                    tb_1_.ID = tb_2_.EB_ID
                left join BOOK tb_3_ on 
                    tb_2_.EB_ID = tb_3_.ID
                where 
                        lower(tb_1_.NAME) like ?
                    or
                        tb_2_.ADDRESS like ?
                    or
                        tb_3_.EDITION < ?
                    or
                        tb_3_.EDITION > ?
            `,
            args: ["%graphql%", "https:%", 3, 10],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "name": "Learning GraphQL",
                "edition": 1
            },
            {
                "id": 2,
                "name": "Learning GraphQL",
                "edition": 2
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
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
        ]);
    });

    it("isFunctionOfSingleTable", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(
                dsl.or(
                    store.name.ilike("room"),
                    store.is(PHYSICAL_BOOK_STORE)
                )
            );
            return q.select(
                store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                where 
                        lower(tb_1_.NAME) like ?
                    or
                        tb_1_.TYPE = 'PhysicalBookStore'
            `,
            args: ["%room%"],
            purpose: "query"
        });
        expect(rows).toEqual([{"id": "2", "name": "MANNING","version": 1}]);
    });

    it("asFunctionOfSingleTable", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(
                dsl.or(
                    store.name.ilike("ing"),
                    store.as(PHYSICAL_BOOK_STORE).city.eq("Shelter Island")
                )
            );
            return q.select(
                store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                where 
                        lower(tb_1_.NAME) like ?
                    or
                        tb_1_.CITY = ?
            `,
            args: ["%ing%", "Shelter Island"],
            purpose: "query"
        });
        expect(rows).toEqual([{"id":"2", "name": "MANNING", "version": 1}]);
    });

    it("superPropsOfSingleTables", async () => {
        const rows = await sqlClient.createQuery(PHYSICAL_BOOK_STORE, (q, store) => {
            q.where(
                store.city.eq("Shelter Island"),
                store.name.ilike("ing")
            );
            return q.select(
                store.fetch(SIMPLE_PHYSICAL_BOOK_STORE_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION,
                    tb_1_.CITY,
                    tb_1_.STREET,
                    tb_1_.TAGS
                from BOOK_STORE tb_1_
                where 
                        tb_1_.CITY = ?
                    and
                        lower(tb_1_.NAME) like ?
                    and
                        tb_1_.TYPE = 'PhysicalBookStore'
            `,
            args: ["Shelter Island", "%ing%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": "2",
                "name": "MANNING",
                "version": 1,
                "city": "Shelter Island",
                "street": "20 Baldwin Road",
                "tags": [
                    "READING_ROOM",
                    "AIR_CONDITION"
                ]
            }
        ]);
    });

    it("superPropOfDownCastTypeOfSingleTable", async () => {
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(
                dsl.or(
                    store.name.ilike("ing"),
                    store.as(PHYSICAL_BOOK_STORE).city.eq("Shelter Island"),
                    store.as(PHYSICAL_BOOK_STORE).version.lt(3),
                    store.as(PHYSICAL_BOOK_STORE).version.gt(0)
                )
            );
            return q.select(
                store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                left join BOOK_STORE tb_2_ on 
                    tb_1_.ID = tb_2_.ID
                where 
                        lower(tb_1_.NAME) like ?
                    or
                        tb_1_.CITY = ?
                    or
                        tb_2_.VERSION < ?
                    or
                        tb_2_.VERSION > ?
            `,
            args: ["%ing%", "Shelter Island", 3, 0],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":"1", "name":"O'REILLY", "version":1},
            {"id":"2", "name":"MANNING", "version":1}
        ]);
    });
});