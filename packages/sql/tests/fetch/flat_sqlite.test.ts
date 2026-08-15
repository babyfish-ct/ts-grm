import { dto } from "@ts-grm/core";
import { describe, it, expect } from "vitest";
import { BOOK, TREE_NODE } from "../model/model";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";

describe("FlatTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("embedded", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authors.with(c => [
                c.id,
                c.$flat("name").prefix("the")
            ])
        ]);
        const row = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.id.eq(9));
            return q.select(
                book.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [9, 2],
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
                        tb_2_.book_id = ?
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(row).toEqual({
            name: 'YugabyteDB: The Definitive Guide',
            authors: [
                { id: 5, theFirstName: 'Kannappan', theLastName: 'Muthukkaruppan' },
                { id: 4, theFirstName: 'Karthik', theLastName: 'Ranganathan' },
                { id: 6, theFirstName: 'Mikhail', theLastName: 'Bautin' }
            ]
        });
    });

    it("shallow", async () => {
        const view = dto.view(BOOK, c => [
            c.$allScalars,
            c.$flat("store").with(c => [
                c.id,
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.id.in(9, 12));
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
                        tb_1_.ID in(?, ?)
                `,
                args: [9, 12],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID,
                        tb_1_.NAME
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: ["1", "2"],
                purpose: "loadAssociation(Book.store)"
            }
        );
        expect(rows).toEqual([
            {
                id: 9,
                name: 'YugabyteDB: The Definitive Guide',
                edition: 3,
                price: 89.99,
                storeId: "1",
                storeName: "O'REILLY"
            },
            {
                id: 12,
                name: 'GraphQL in Action',
                edition: 3,
                price: 79.99,
                storeId: "2",
                storeName: 'MANNING'
            }
        ]);
    });

    it("deep", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.$allScalars,
            c.$flat("parentNode").prefix("parent").with(c => [
                c.$allScalars,
                c.$flat("parentNode").prefix("grand")
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
                        tb_1_.PARENT_NODE_ID
                    from TREE_NODE tb_1_
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
                args: [3],
                purpose: "loadAssociation(TreeNode.parentNode)"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.ID,
                        tb_1_.NAME
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID = ?
                `,
                args: [2],
                purpose: "loadAssociation(TreeNode.parentNode)"
            }
        );
        expect(row).toEqual({
            id: 4,
            name: 'Coca Cola',
            parentId: 3,
            parentName: 'Drinks',
            parentGrandId: 2,
            parentGrandName: 'Food'
        });
    });
});