import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useOracle12ClientWithData } from "../data_utils";
import { BOOK } from "../model/model";
import { dto } from "@ts-grm/core";

describe("Oracle12Test", () => {

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