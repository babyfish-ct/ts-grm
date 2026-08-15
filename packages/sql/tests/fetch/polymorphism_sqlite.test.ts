import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { BOOK_STORE, PAPER_BOOK, ELECTRONIC_BOOK, PDF_ELECTRONIC_BOOK, ONLINE_BOOK_STORE, PHYSICAL_BOOK_STORE } from "../model/model";

describe("PolymorphismSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("singleTable", async () => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.$instanceOf(ONLINE_BOOK_STORE, c => [
                c.url
            ]),
            c.$instanceOf(PHYSICAL_BOOK_STORE, c => [
                c.city,
                c.street
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
                        tb_1_.TYPE,
                        tb_1_.URL,
                        tb_1_.CITY,
                        tb_1_.STREET
                    from BOOK_STORE tb_1_
                `,
                args: [],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {
                "name": "O'REILLY",
                "__typename": "OnlineBookStore",
                "url": "https://www.oreilly.com"
            },
            {
                "name": "MANNING",
                "__typename": "PhysicalBookStore",
                "city": "Shelter Island",
                "street": "20 Baldwin Road"
            }
        ]);
    });

    it("multipleTables", async () => {

        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.with(c => [
                c.name,
                c.$instanceOf(PAPER_BOOK, c => [c.size]),
                c.$instanceOf(ELECTRONIC_BOOK, c => [c.address]),
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [c.pdfVersion])
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
                        tb_1_.TYPE,
                        tb_2_.WIDTH,
                        tb_2_.HEIGHT,
                        tb_3_.ADDRESS,
                        tb_4_.PDF_VERSION
                    from BOOK tb_1_
                    left join PAPER_BOOK tb_2_ on 
                        tb_1_.TYPE = 'PaperBook'
                    and
                        tb_1_.ID = tb_2_.PB_ID
                    left join ELECTRONIC_BOOK tb_3_ on 
                        tb_1_.TYPE in('ElectronicBook', 'PdfElectronicBook')
                    and
                        tb_1_.ID = tb_3_.EB_ID
                    left join PDF_ELECTRONIC_BOOK tb_4_ on 
                        tb_1_.TYPE = 'PdfElectronicBook'
                    and
                        tb_1_.ID = tb_4_.PEB_ID
                    where 
                        tb_1_.STORE_ID in(?, ?)
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["1", "2"],
                purpose: "loadAssociation(BookStore.books)"
            },
        );
        expect(rows).toEqual([
            {
                "name": "O'REILLY",
                "books": [
                    {
                        "name": "Effective TypeScript",
                        "__typename": "PaperBook",
                        "size": { "width": 140, "height": 203 }
                    },
                    {
                        "name": "Effective TypeScript",
                        "__typename": "PaperBook",
                        "size": { "width": 140, "height": 203 }
                    },
                    {
                        "name": "Effective TypeScript",
                        "__typename": "PaperBook",
                        "size": { "width": 140, "height": 203 }
                    },
                    {
                        "name": "Learning GraphQL",
                        "__typename": "ElectronicBook",
                        "address": "https://www.oreilly.com/learning-graphql?version=3"
                    },
                    {
                        "name": "Learning GraphQL",
                        "__typename": "ElectronicBook",
                        "address": "https://www.oreilly.com/learning-graphql?version=2"
                    },
                    {
                        "name": "Learning GraphQL",
                        "__typename": "ElectronicBook",
                        "address": "https://www.oreilly.com/learning-graphql?version=1"
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "__typename": "PaperBook",
                        "size": { "width": 145, "height": 210 }
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "__typename": "PaperBook",
                        "size": { "width": 145, "height": 210 }
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "__typename": "PaperBook",
                        "size": { "width": 145, "height": 210 }
                    }
                ]
            },
            {
                "name": "MANNING",
                "books": [
                    {
                        "name": "GraphQL in Action",
                        "__typename": "PdfElectronicBook",
                        "address": "https://www.manning.com/grahql-in-action?version=3",
                        "pdfVersion": "2.0"
                    },
                    {
                        "name": "GraphQL in Action",
                        "__typename": "PdfElectronicBook",
                        "address": "https://www.manning.com/grahql-in-action?version=2",
                        "pdfVersion": "2.0"
                    },
                    {
                        "name": "GraphQL in Action",
                        "__typename": "PdfElectronicBook",
                        "address": "https://www.manning.com/grahql-in-action?version=1",
                        "pdfVersion": "2.0"
                    }
                ]
            }
        ]);
    });

    it("multipleTablesWithFormula", async() => {

        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.with(c => [
                c.name,
                c.$instanceOf(PAPER_BOOK, c => [c.area]),
                c.$instanceOf(ELECTRONIC_BOOK, c => [c.address]),
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [c.pdfVersion])
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
                        tb_1_.TYPE,
                        tb_2_.WIDTH,
                        tb_2_.HEIGHT,
                        tb_3_.ADDRESS,
                        tb_4_.PDF_VERSION
                    from BOOK tb_1_
                    left join PAPER_BOOK tb_2_ on 
                        tb_1_.TYPE = 'PaperBook'
                    and
                        tb_1_.ID = tb_2_.PB_ID
                    left join ELECTRONIC_BOOK tb_3_ on 
                        tb_1_.TYPE in('ElectronicBook', 'PdfElectronicBook')
                    and
                        tb_1_.ID = tb_3_.EB_ID
                    left join PDF_ELECTRONIC_BOOK tb_4_ on 
                        tb_1_.TYPE = 'PdfElectronicBook'
                    and
                        tb_1_.ID = tb_4_.PEB_ID
                    where 
                        tb_1_.STORE_ID in(?, ?)
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["1", "2"],
                purpose: "loadAssociation(BookStore.books)"
            },
        );
        expect(rows).toEqual([
            {
                "name": "O'REILLY",
                "books": [
                    {
                        "name": "Effective TypeScript",
                        "__typename": "PaperBook",
                        "area": 28420
                    },
                    {
                        "name": "Effective TypeScript",
                        "__typename": "PaperBook",
                        "area": 28420
                    },
                    {
                        "name": "Effective TypeScript",
                        "__typename": "PaperBook",
                        "area": 28420
                    },
                    {
                        "name": "Learning GraphQL",
                        "__typename": "ElectronicBook",
                        "address": "https://www.oreilly.com/learning-graphql?version=3"
                    },
                    {
                        "name": "Learning GraphQL",
                        "__typename": "ElectronicBook",
                        "address": "https://www.oreilly.com/learning-graphql?version=2"
                    },
                    {
                        "name": "Learning GraphQL",
                        "__typename": "ElectronicBook",
                        "address": "https://www.oreilly.com/learning-graphql?version=1"
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "__typename": "PaperBook",
                        "area": 30450
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "__typename": "PaperBook",
                        "area": 30450
                    },
                    {
                        "name": "YugabyteDB: The Definitive Guide",
                        "__typename": "PaperBook",
                        "area": 30450
                    }
                ]
            },
            {
                "name": "MANNING",
                "books": [
                    {
                        "name": "GraphQL in Action",
                        "__typename": "PdfElectronicBook",
                        "address": "https://www.manning.com/grahql-in-action?version=3",
                        "pdfVersion": "2.0"
                    },
                    {
                        "name": "GraphQL in Action",
                        "__typename": "PdfElectronicBook",
                        "address": "https://www.manning.com/grahql-in-action?version=2",
                        "pdfVersion": "2.0"
                    },
                    {
                        "name": "GraphQL in Action",
                        "__typename": "PdfElectronicBook",
                        "address": "https://www.manning.com/grahql-in-action?version=1",
                        "pdfVersion": "2.0"
                    }
                ]
            }
        ]);
    });
});