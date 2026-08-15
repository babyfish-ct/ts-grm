import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { BOOK, ORDER_ITEM, STUDENT, TAG } from "../model/model";
import { dto } from "@ts-grm/core";

describe("AssociatedKeySqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("referenceKey", async() => {
        const view = dto.view(BOOK, c => [
            c.id,
            c.name,
            c.storeId
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.STORE_ID
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
                "id": 6,
                "name": "Effective TypeScript",
                "storeId": "1"
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "storeId": "2"
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "storeId": "1"
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "storeId": "1"
            }
        ]);
    });

    it("embeddedKey", async() => {
        const view = dto.view(ORDER_ITEM, c => [
            c.id,
            c.orderId
        ]);
        const row = await sqlClient.createQuery(ORDER_ITEM, (q, item) => {
            q.where(item.id.eq(8));
            return q.select(item.fetch(view));
        }).fetchRequired();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.order_x,
                    tb_1_.order_y_a,
                    tb_1_.order_y_b
                from ORDER_ITEM tb_1_
                where 
                    tb_1_.ID = ?
                limit ?
            `,
            args: [8, 2],
            purpose: "query"
        });
        expect(row).toEqual({
            id: 8, 
            orderId: { 
                x: 2, 
                y: { a: 1, b: 2 } 
            } 
        });
    });

    it("embeddedKeyWithBody", async() => {
        const view = dto.view(ORDER_ITEM, c => [
            c.id,
            c.orderId.with(c => [
                c.x,
                c.$flat("y").prefix("").with(c => [
                    c.b
                ])
            ])
        ]);
        const row = await sqlClient.createQuery(ORDER_ITEM, (q, item) => {
            q.where(item.id.eq(8));
            return q.select(item.fetch(view));
        }).fetchRequired();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.order_x,
                    tb_1_.order_y_b
                from ORDER_ITEM tb_1_
                where 
                    tb_1_.ID = ?
                limit ?
            `,
            args: [8, 2],
            purpose: "query"
        });
        expect(row).toEqual({
            id: 8, 
            orderId: { 
                x: 2, 
                b: 2
            } 
        });
    });

    it("m2m", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.edition,
            c.$associatedKeys("authors", "authorIds")
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
                        tb_1_.ID
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
                "authorIds": [5, 4, 6]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 2,
                "authorIds": [5, 4, 6]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3,
                "authorIds": [5, 4, 6]
            }
        ]);
    });

    it("m2mByEmbedded", async () => {
        const view = dto.view(TAG, c => [
            c.name,
            c.$associatedKeys("orders", "orderIds").with(c => [
                c.x,
                c.$flat("y").prefix("").with(c => [
                    c.b
                ])
            ])
        ]);
        const rows = await sqlClient.createQuery(TAG, (q, tag) => {
            q.where(tag.name.like("o"));
            q.orderBy(tag.name);
            return q.select(tag.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.LOW,
                        tb_1_.HIGH
                    from TAG tb_1_
                    where 
                        tb_1_.NAME like ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: ["%o%"],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.tag_low,
                        tb_1_.tag_high,
                        tb_1_.order_x,
                        tb_1_.order_y_b
                    from ORDER_TAG_MAPPING tb_1_
                    where 
                        (tb_1_.tag_low, tb_1_.tag_high) in(
                            (?, ?),
                            (?, ?)
                        )
                `,
                args: [1, 2, 1, 3],
                purpose: "loadAssociation(Tag.orders)"
            }
        )
        expect(rows).toEqual([
            {
                "name": "orange",
                "orderIds": [
                    { "x": 1, "b": 1 },
                    { "x": 2, "b": 2 }
                ]
            },
            {
                "name": "yellow",
                "orderIds": [{ "x": 1, "b": 1 }]
            }
        ]);
    });

    it("m2mByJoinEntity", async() => {
        const view = dto.view(STUDENT, c => [
            c.name,
            c.$associatedKeys("courses", "courseIds")
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
                        tb_1_.COURSE_ID
                    from LEARNING_LINK tb_1_
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
                "courseIds": [1, 4]
            },
            {
                "name": "Tim",
                "courseIds": [2, 3]
            }
        ]);
    });
});