import { describe, it, expect } from "vitest";
import { useSqliteClientWithData } from "../data_utils";
import { newSqlRecord } from "../utils";
import { AUTHOR, PHYSICAL_BOOK_STORE } from "../model/model";
import { dsl, dto } from "@ts-grm/core";
import { SIMPLE_PHYSICAL_BOOK_STORE_VIEW } from "./utils";

describe("ScalarProviderTest", () => {

    const sqlRecord = newSqlRecord();
    
    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("enumEq", async () => {
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(author.gender.eq("FEMALE"));
            return q.select(
                author.fetch(
                    dto.view(AUTHOR, c => [c.$allScalars])
                )
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME,
                    tb_1_.GENDER
                from AUTHOR tb_1_
                where 
                    tb_1_.GENDER = ?
            `,
            args: ['F'],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "name": {
                    "firstName": "Eve",
                    "lastName": "Procello"
                },
                "gender": "FEMALE"
            }
        ]);
    });

    it("enumTupleEq", async () => {
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(
                dsl.tuple(author.name().firstName, author.gender).eq(["Eve", "FEMALE"])
            );
            return q.select(
                author.fetch(
                    dto.view(AUTHOR, c => [c.$allScalars])
                )
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME,
                    tb_1_.GENDER
                from AUTHOR tb_1_
                where 
                    (tb_1_.FIRST_NAME, tb_1_.GENDER) = (?, ?)
            `,
            args: ['Eve', 'F'],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 1,
                "name": {
                    "firstName": "Eve",
                    "lastName": "Procello"
                },
                "gender": "FEMALE"
            }
        ]);
    });

    it("enumIn", async() => {
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(
                author.gender.in("MALE", "FEMALE")
            );
            return q.select(
                author.fetch(
                    dto.view(AUTHOR, c => [c.$allScalars])
                )
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
                        tb_1_.GENDER in(?, ?)
                `,
                args: ['M', 'F'],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {
                "id": 1,
                "name": {
                    "firstName": "Eve",
                    "lastName": "Procello"
                },
                "gender": "FEMALE"
            },
            {
                "id": 2,
                "name": {
                    "firstName": "Alex",
                    "lastName": "Banks"
                },
                "gender": "MALE"
            },
            {
                "id": 3,
                "name": {
                    "firstName": "Dan",
                    "lastName": "Vanderkam"
                },
                "gender": "MALE"
            },
            {
                "id": 4,
                "name": {
                    "firstName": "Karthik",
                    "lastName": "Ranganathan"
                },
                "gender": "MALE"
            },
            {
                "id": 5,
                "name": {
                    "firstName": "Kannappan",
                    "lastName": "Muthukkaruppan"
                },
                "gender": "MALE"
            },
            {
                "id": 6,
                "name": {
                    "firstName": "Mikhail",
                    "lastName": "Bautin"
                },
                "gender": "MALE"
            },
            {
                "id": 7,
                "name": {
                    "firstName": "Samer",
                    "lastName": "Buna"
                },
                "gender": "MALE"
            }
        ]);
    });

    it("enumTupleIn", async() => {
        const rows = await sqlClient.createQuery(AUTHOR, (q, author) => {
            q.where(
                dsl.tuple(author.name().firstName, author.gender).in(
                    ["Eve", "FEMALE"],
                    ["Alex", "MALE"]
                )
            );
            return q.select(
                author.fetch(
                    dto.view(AUTHOR, c => [c.$allScalars])
                )
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
                        (tb_1_.FIRST_NAME, tb_1_.GENDER) in(
                            (?, ?),
                            (?, ?)
                        )
                `,
                args: ['Eve', 'F', 'Alex', 'M'],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {
                "id": 1,
                "name": {
                    "firstName": "Eve",
                    "lastName": "Procello"
                },
                "gender": "FEMALE"
            },
            {
                "id": 2,
                "name": {
                    "firstName": "Alex",
                    "lastName": "Banks"
                },
                "gender": "MALE"
            }
        ]);
    });

    it("enumSetContainsAny", async () => {
        const rows = await sqlClient.createQuery(PHYSICAL_BOOK_STORE, (q, store) => {
            q.where(store.tags.containsAny("READING_ROOM", "BEVERAGE_SALES"));
            return q.select(
                store.fetch(SIMPLE_PHYSICAL_BOOK_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert(
            {
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
                            (tb_1_.TAGS & ?) <> 0
                        and
                            tb_1_.TYPE = 'PhysicalBookStore'
                `,
                args: [5],
                purpose: 'query'
            }
        );
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

    it("enumSetContainsAll", async () => {
        const rows = await sqlClient.createQuery(PHYSICAL_BOOK_STORE, (q, store) => {
            q.where(store.tags.containsAll("READING_ROOM", "BEVERAGE_SALES"));
            return q.select(
                store.fetch(SIMPLE_PHYSICAL_BOOK_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert(
            {
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
                            (tb_1_.TAGS & ?) = ?
                        and
                            tb_1_.TYPE = 'PhysicalBookStore'
                `,
                args: [5, 5],
                purpose: 'query'
            }
        );
        expect(rows).toEqual([]);
    });
});