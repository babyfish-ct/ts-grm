import { dto } from "@ts-grm/core";
import { describe, expect, it } from "vitest";
import { BOOK, LEARNING_LINK, TREE_NODE } from "../model/model";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { newSqlClient } from "@/sql_client";

describe("JoinFetchTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("simple", async() => {
        const view = dto.view(BOOK, c => [
            c.id,
            c.name,
            c.store.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.id,
                c.name
            ])
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
                    tb_1_.STORE_ID,
                    tb_2_.ID,
                    tb_2_.NAME
                from BOOK tb_1_
                left join BOOK_STORE tb_2_ on 
                    tb_1_.STORE_ID = tb_2_.ID
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
                "store": {
                    "id": "1",
                    "name": "O'REILLY"
                }
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "store": {
                    "id": "2",
                    "name": "MANNING"
                }
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "store": {
                    "id": "1",
                    "name": "O'REILLY"
                }
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "store": {
                    "id": "1",
                    "name": "O'REILLY"
                }
            }
        ]);
    });

    it("flat", async() => {
        const view = dto.view(BOOK, c => [
            c.id,
            c.name,
            c.$flat("store").fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.id,
                c.name
            ])
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
                    tb_1_.STORE_ID,
                    tb_2_.ID,
                    tb_2_.NAME
                from BOOK tb_1_
                left join BOOK_STORE tb_2_ on 
                    tb_1_.STORE_ID = tb_2_.ID
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
                "storeId": "1",
                "storeName": "O'REILLY"
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "storeId": "2",
                "storeName": "MANNING"
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "storeId": "1",
                "storeName": "O'REILLY"
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "storeId": "1",
                "storeName": "O'REILLY"
            }
        ]);
    });

    it("multipleLayerFlat", async() => {
        const view = dto.view(TREE_NODE, c => [
            c.$allScalars,
            c.$flat("parentNode").fetch("JOIN_LOW_OFFSET_ONLY").prefix("parent").with(c => [
                c.$allScalars,
                c.$flat("parentNode").fetch("JOIN_LOW_OFFSET_ONLY").prefix("grand")
            ])
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.name.eq("Coca Cola"));
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.PARENT_NODE_ID,
                    tb_2_.ID,
                    tb_2_.NAME,
                    tb_2_.PARENT_NODE_ID,
                    tb_3_.ID,
                    tb_3_.NAME
                from TREE_NODE tb_1_
                left join TREE_NODE tb_2_ on 
                    tb_1_.PARENT_NODE_ID = tb_2_.ID
                left join TREE_NODE tb_3_ on 
                    tb_2_.PARENT_NODE_ID = tb_3_.ID
                where 
                    tb_1_.NAME = ?
                limit ?
            `,
            args: ["Coca Cola", 2],
            purpose: "query"
        });
        expect(row).toEqual({
            "id": 4,
            "name": "Coca Cola",
            "parentId": 3,
            "parentName": "Drinks",
            "parentGrandId": 2,
            "parentGrandName": "Food"
        });
    });

    it("twoJoinFetches", async () => {
        const view = dto.view(LEARNING_LINK, c => [
            c.id,
            c.student.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.name
            ]),
            c.course.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(LEARNING_LINK, (q, link) => {
            q.where(link.id.in(1, 2));
            q.orderBy(link.id);
            return q.select(link.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.STUDENT_ID,
                        tb_1_.COURSE_ID,
                        tb_2_.NAME,
                        tb_3_.NAME
                    from LEARNING_LINK tb_1_
                    inner join STUDENT tb_2_ on 
                        tb_1_.STUDENT_ID = tb_2_.ID
                    inner join COURSE tb_3_ on 
                        tb_1_.COURSE_ID = tb_3_.ID
                    where 
                        tb_1_.ID in(?, ?)
                    order by 
                        tb_1_.ID asc
                `,
                args: [1, 2],
                purpose: "query"
            }
        );
        expect(rows).toEqual([
            {
                "id": 1,
                "student": {
                    "name": "Tim"
                },
                "course": {
                    "name": "Film Appreciation"
                }
            },
            {
                "id": 2,
                "student": {
                    "name": "Tim"
                },
                "course": {
                    "name": "Workplace Communication and Presentation"
                }
            }
        ]);
    });

    it("nullable", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.$allScalars,
            c.parentNode.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.$allScalars,
                c.parentNode.fetch("JOIN_LOW_OFFSET_ONLY")
            ])
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.name.eq("Food"));
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.PARENT_NODE_ID,
                    tb_2_.ID,
                    tb_2_.NAME,
                    tb_2_.PARENT_NODE_ID,
                    tb_3_.ID,
                    tb_3_.NAME
                from TREE_NODE tb_1_
                left join TREE_NODE tb_2_ on 
                    tb_1_.PARENT_NODE_ID = tb_2_.ID
                left join TREE_NODE tb_3_ on 
                    tb_2_.PARENT_NODE_ID = tb_3_.ID
                where 
                    tb_1_.NAME = ?
                limit ?
            `,
            args: ["Food", 2],
            purpose: "query"
        });
        expect(row).toEqual({
            "id": 2,
            "name": "Food",
            "parentNode": {
                "id": 1,
                "name": "Home",
                "parentNode": null
            }
        });
    });

    it("explicitMixed", async() => {
        const view = dto.view(TREE_NODE, c => [
            c.$allScalars,
            c.parentNode.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                c.$allScalars,
                c.parentNode.fetch("JOIN_LOW_OFFSET_ONLY").with(c => [
                    c.$allScalars,
                    c.parentNode.with(c => [
                        c.$allScalars,
                        c.parentNode.with(c => [
                            c.$allScalars
                        ])
                    ])
                ])
            ])
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.name.eq("Coca Cola"));
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.PARENT_NODE_ID,
                        tb_2_.ID,
                        tb_2_.NAME,
                        tb_2_.PARENT_NODE_ID,
                        tb_3_.ID,
                        tb_3_.NAME,
                        tb_3_.PARENT_NODE_ID
                    from TREE_NODE tb_1_
                    left join TREE_NODE tb_2_ on 
                        tb_1_.PARENT_NODE_ID = tb_2_.ID
                    left join TREE_NODE tb_3_ on 
                        tb_2_.PARENT_NODE_ID = tb_3_.ID
                    where 
                        tb_1_.NAME = ?
                    limit ?
                `,
                args: ["Coca Cola", 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.PARENT_NODE_ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID = ?
                `,
                args: [1],
                purpose: "loadAssociation(TreeNode.parentNode)"
            }
        );
        expect(row).toEqual({
            "id": 4,
            "name": "Coca Cola",
            "parentNode": {
                "id": 3,
                "name": "Drinks",
                "parentNode": {
                    "id": 2,
                    "name": "Food",
                    "parentNode": {
                        "id": 1,
                        "name": "Home",
                        "parentNode": null
                    }
                }
            }
        });
    });

    it("implicitMixed", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.$allScalars,
            c.$flat("parentNode").fetch("JOIN_LOW_OFFSET_ONLY").prefix("parent").with(c => [
                c.$allScalars,
                c.$flat("parentNode").fetch("JOIN_LOW_OFFSET_ONLY").prefix("parent").with(c => [
                    c.$allScalars,
                    c.$flat("parentNode").fetch("JOIN_LOW_OFFSET_ONLY").prefix("parent").with(c => [
                        c.$allScalars,
                        c.$flat("parentNode").fetch("JOIN_LOW_OFFSET_ONLY").prefix("parent").with(c => [
                            c.$allScalars
                        ])
                    ])
                ])
            ])
        ]);
        const row = await newSqlClient(sqlClient, {
            maxJoinFetchDepth: 2
        }).createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.name.eq("Coca Cola"));
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.PARENT_NODE_ID,
                        tb_2_.ID,
                        tb_2_.NAME,
                        tb_2_.PARENT_NODE_ID,
                        tb_3_.ID,
                        tb_3_.NAME,
                        tb_3_.PARENT_NODE_ID
                    from TREE_NODE tb_1_
                    left join TREE_NODE tb_2_ on 
                        tb_1_.PARENT_NODE_ID = tb_2_.ID
                    left join TREE_NODE tb_3_ on 
                        tb_2_.PARENT_NODE_ID = tb_3_.ID
                    where 
                        tb_1_.NAME = ?
                    limit ?
                `,
                args: ["Coca Cola", 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.PARENT_NODE_ID,
                        tb_2_.ID,
                        tb_2_.NAME
                    from TREE_NODE tb_1_
                    left join TREE_NODE tb_2_ on 
                        tb_1_.PARENT_NODE_ID = tb_2_.ID
                    where 
                        tb_1_.ID = ?
                `,
                args: [1],
                purpose: "loadAssociation(TreeNode.parentNode)"
            }
        );
        expect(row).toEqual({
            "id": 4,
            "name": "Coca Cola",
            "parentId": 3,
            "parentName": "Drinks",
            "parentParentId": 2,
            "parentParentName": "Food",
            "parentParentParentId": 1,
            "parentParentParentName": "Home",
            "parentParentParentParentId": null,
            "parentParentParentParentName": null
        });
    });

    it("illegalJoinFetch", async() => {
        const view = dto.view(BOOK, c => [
            c.$allScalars,
            c.store.fetch("JOIN_LOW_OFFSET_ONLY")
        ]);
        await expect(async () => {
            await sqlClient.findPage(view, {pageNo: 2, pageSize: 2})
        }).rejects.toThrowError(
            "Unable to execute join fetch at a large offset: the selected DTOs contain " + 
            "association properties with fetchType \"JOIN_LOW_OFFSET_ONLY\" (Book.store), " + 
            "whose join fetch is only allowed when the query offset does not exceed the configured limit. " + 
            "Current offset is 2, but the configured maxJoinFetchOffset is 0. " + 
            "To fix this, either reduce the offset (e.g. use a smaller page number/size), " +
            "increase \"maxJoinFetchOffset\" in the global configuration, " + 
            "or change the fetch type of these properties from \"JOIN_LOW_OFFSET_ONLY\" to a \"LOAD\""
        );
    });
});