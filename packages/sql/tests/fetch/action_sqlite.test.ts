import { dto } from "@ts-grm/core";
import { describe, it, expect } from "vitest";
import { BOOK, BOOK_STORE, LIBRARY, TREE_NODE } from "../model/model";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";

describe("ActionSqliteTest", () => {
    
    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("rename", async () => {
        const view = dto.view(BOOK_STORE, c => [
            c.id.as("bookStoreId"),
            c.name.as("bookStoreName"),
            c.version.as("bookStoreVersion"),
            c.books.as("bookStoreBooks").with(c => [
                c.id.as("bookId"),
                c.name.as("bookName"),
                c.edition.as("bookEdition"),
                c.price.as("bookPrice"),
                c.authors.as("bookAuthors").with(c => [
                    c.id.as("authorId"),
                    c.name.as("authorName").with(c => [
                        c.firstName.as("_1"),
                        c.lastName.as("_2")
                    ])
                ])
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.id.eq(2));
            return q.select(store.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.VERSION
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = ?
                `,
                args: [2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STORE_ID,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID = ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["2"],
                purpose: "loadAssociation(BookStore.books)"
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
                        tb_2_.book_id in(?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [12, 11, 10],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "bookStoreId": "2",
                "bookStoreName": "MANNING",
                "bookStoreVersion": 1,
                "bookStoreBooks": [
                    {
                        "bookId": 12,
                        "bookName": "GraphQL in Action",
                        "bookEdition": 3,
                        "bookPrice": 79.99,
                        "bookAuthors": [
                            {
                                "authorId": 7,
                                "authorName": {
                                    "_1": "Samer",
                                    "_2": "Buna"
                                }
                            }
                        ]
                    },
                    {
                        "bookId": 11,
                        "bookName": "GraphQL in Action",
                        "bookEdition": 2,
                        "bookPrice": 69.99,
                        "bookAuthors": [
                            {
                                "authorId": 7,
                                "authorName": {
                                    "_1": "Samer",
                                    "_2": "Buna"
                                }
                            }
                        ]
                    },
                    {
                        "bookId": 10,
                        "bookName": "GraphQL in Action",
                        "bookEdition": 1,
                        "bookPrice": 59.99,
                        "bookAuthors": [
                            {
                                "authorId": 7,
                                "authorName": {
                                    "_1": "Samer",
                                    "_2": "Buna"
                                }
                            }
                        ]
                    }
                ]
            }
        ]);
    });

    it("filter", async () => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.filter(table => table.edition.eq(3))
        ])
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
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    where 
                            tb_1_.STORE_ID in(?, ?)
                        and
                            tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc,
                        tb_1_.EDITION desc
                `,
                args: ["1", "2", 3],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "O'REILLY",
                "books": [
                    {
                        "id": 6,
                        "name": "Effective TypeScript",
                        "edition": 3,
                        "price": 63.99
                    },
                    {
                        "id": 3,
                        "name": "Learning GraphQL",
                        "edition": 3,
                        "price": 33.99
                    },
                    {
                        "id": 9,
                        "name": "YugabyteDB: The Definitive Guide",
                        "edition": 3,
                        "price": 89.99
                    }
                ]
            },
            {
                "name": "MANNING",
                "books": [
                    {
                        "id": 12,
                        "name": "GraphQL in Action",
                        "edition": 3,
                        "price": 79.99
                    }
                ]
            }
        ]);
    });

    it("recursiveFilter", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("childNodes").filter(table => table.name.length().lt(8))
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.parentNodeId.isNull());
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchOptional();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.PARENT_NODE_ID is null
                    limit ?
                `,
                args: [2],
                purpose: "query"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3, c4) as (
                            select 
                                tb_2_.PARENT_NODE_ID,
                                tb_2_.NAME,
                                tb_2_.ID,
                                0
                            from TREE_NODE tb_2_
                            where 
                                    tb_2_.PARENT_NODE_ID = ?
                                and
                                    length(cast(tb_2_.NAME as text)) < ?
                            union all
                            select 
                                tb_3_.PARENT_NODE_ID,
                                tb_3_.NAME,
                                tb_3_.ID,
                                tb_1_.c4 + 1
                            from TREE_NODE tb_3_
                            inner join tb_1_ on 
                                tb_3_.PARENT_NODE_ID = tb_1_.c3
                            where 
                                length(cast(tb_3_.NAME as text)) < ?
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from tb_1_
                `,
                args: [1, 8, 8],
                purpose: "loadRecursiveTree(TreeNode.childNodes)"
            }
        );
        expect(row).toEqual({
            "name": "Home",
            "childNodes": [
                {
                    "name": "Food",
                    "childNodes": [
                        {
                            "name": "Bread",
                            "childNodes": []
                        },
                        {
                            "name": "Drinks",
                            "childNodes": [
                                {
                                    "name": "Fanta",
                                    "childNodes": []
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("sort", async () => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.sort({path: "price", desc: true})
        ]);
        const row = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            q.where(store.id.eq(2));
            return q.select(
                store.fetch(view)
            );
        }).fetchOptional();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [2, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.STORE_ID,
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.EDITION,
                        tb_1_.PRICE
                    from BOOK tb_1_
                    where 
                        tb_1_.STORE_ID = ?
                    order by 
                        tb_1_.PRICE desc
                `,
                args: ["2"],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(row).toEqual({
            "name": "MANNING",
            "books": [
                {
                    "id": 12,
                    "name": "GraphQL in Action",
                    "edition": 3,
                    "price": 79.99
                },
                {
                    "id": 11,
                    "name": "GraphQL in Action",
                    "edition": 2,
                    "price": 69.99
                },
                {
                    "id": 10,
                    "name": "GraphQL in Action",
                    "edition": 1,
                    "price": 59.99
                }
            ]
        });
    });

    it("recursiveSort", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("childNodes").sort({path: "name", desc: true})
        ])
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.parentNodeId.isNull());
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchOptional();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.PARENT_NODE_ID is null
                    limit ?
                `,
                args: [2],
                purpose: "query"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3, c4) as (
                            select 
                                tb_2_.PARENT_NODE_ID,
                                tb_2_.NAME,
                                tb_2_.ID,
                                0
                            from TREE_NODE tb_2_
                            where 
                                tb_2_.PARENT_NODE_ID = ?
                            union all
                            select 
                                tb_3_.PARENT_NODE_ID,
                                tb_3_.NAME,
                                tb_3_.ID,
                                tb_1_.c4 + 1
                            from TREE_NODE tb_3_
                            inner join tb_1_ on 
                                tb_3_.PARENT_NODE_ID = tb_1_.c3
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from tb_1_
                    order by 
                        tb_1_.c4 asc,
                        tb_1_.c2 desc
                `,
                args: [1],
                purpose: "loadRecursiveTree(TreeNode.childNodes)"
            }
        )
        expect(row).toEqual({
            "name": "Home",
            "childNodes": [
                {
                    "name": "Food",
                    "childNodes": [
                        {
                            "name": "Drinks",
                            "childNodes": [
                                {
                                    "name": "Fanta",
                                    "childNodes": []
                                },
                                {
                                    "name": "Coca Cola",
                                    "childNodes": []
                                }
                            ]
                        },
                        {
                            "name": "Bread",
                            "childNodes": [
                                {
                                    "name": "Ciabatta",
                                    "childNodes": []
                                },
                                {
                                    "name": "Baguette",
                                    "childNodes": []
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Clothing",
                    "childNodes": [
                        {
                            "name": "Woman",
                            "childNodes": [
                                {
                                    "name": "Formal wear",
                                    "childNodes": [
                                        {
                                            "name": "Suit",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Shirt",
                                            "childNodes": []
                                        }
                                    ]
                                },
                                {
                                    "name": "Casual wear",
                                    "childNodes": [
                                        {
                                            "name": "Miniskirt",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Jeans",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Dress",
                                            "childNodes": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "name": "Man",
                            "childNodes": [
                                {
                                    "name": "Formal wear",
                                    "childNodes": [
                                        {
                                            "name": "Suit",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Shirt",
                                            "childNodes": []
                                        }
                                    ]
                                },
                                {
                                    "name": "Casual wear",
                                    "childNodes": [
                                        {
                                            "name": "Jeans",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Jacket",
                                            "childNodes": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("limit", async() => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.limit(4)
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
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4,
                        tb_1_.c5
                    from (
                        select 
                            tb_2_.STORE_ID c1,
                            tb_2_.ID c2,
                            tb_2_.NAME c3,
                            tb_2_.EDITION c4,
                            tb_2_.PRICE c5,
                            row_number() over(partition by tb_2_.STORE_ID order by tb_2_.NAME asc, tb_2_.EDITION desc) c6
                        from BOOK tb_2_
                        where 
                            tb_2_.STORE_ID in(?, ?)
                        order by 
                            tb_2_.NAME asc,
                            tb_2_.EDITION desc
                    ) tb_1_
                    where 
                        tb_1_.c6 <= ?
                    order by 
                        tb_1_.c3 asc,
                        tb_1_.c4 desc
                `,
                args: ["1", "2", 4],
                purpose: "loadAssociation(BookStore.books)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "O'REILLY",
                "books": [
                    {
                        "id": 6,
                        "name": "Effective TypeScript",
                        "edition": 3,
                        "price": 63.99
                    },
                    {
                        "id": 5,
                        "name": "Effective TypeScript",
                        "edition": 2,
                        "price": 53.99
                    },
                    {
                        "id": 4,
                        "name": "Effective TypeScript",
                        "edition": 1,
                        "price": 43.99
                    },
                    {
                        "id": 3,
                        "name": "Learning GraphQL",
                        "edition": 3,
                        "price": 33.99
                    }
                ]
            },
            {
                "name": "MANNING",
                "books": [
                    {
                        "id": 12,
                        "name": "GraphQL in Action",
                        "edition": 3,
                        "price": 79.99
                    },
                    {
                        "id": 11,
                        "name": "GraphQL in Action",
                        "edition": 2,
                        "price": 69.99
                    },
                    {
                        "id": 10,
                        "name": "GraphQL in Action",
                        "edition": 1,
                        "price": 59.99
                    }
                ]
            }
        ]);
    });

    it("limitM2M", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authors.limit(2).with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            return q.select(
                book.fetch(view)
            )
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
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3
                    from (
                        select 
                            tb_3_.book_id c1,
                            tb_2_.FIRST_NAME c2,
                            tb_2_.LAST_NAME c3,
                            row_number() over(partition by tb_3_.book_id order by tb_2_.FIRST_NAME asc, tb_2_.LAST_NAME asc) c4
                        from AUTHOR tb_2_
                        inner join book_author_mapping tb_3_ on 
                            tb_2_.ID = tb_3_.author_id
                        where 
                            tb_3_.book_id in(?, ?, ?, ?)
                        order by 
                            tb_2_.FIRST_NAME asc,
                            tb_2_.LAST_NAME asc
                    ) tb_1_
                    where 
                        tb_1_.c4 <= ?
                    order by 
                        tb_1_.c2 asc,
                        tb_1_.c3 asc
                `,
                args: [6, 12, 3, 9, 2],
                purpose: "loadAssociation(Book.authors)"
            }
        )
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authors": [
                    {
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ]
            },
            {
                "name": "GraphQL in Action",
                "authors": [
                    {
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ]
            },
            {
                "name": "Learning GraphQL",
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
                    }
                ]
            }
        ]);
    });

    it("recursiveLimitFailed", async () => {
        await expect(async () => {
            const view = dto.view(TREE_NODE, c => [
                c.$recursive("childNodes").limit(2)
            ]);
            await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
                q.where(treeNode.parentNodeId.isNull());
                return q.select(
                    treeNode.fetch(view)
                );
            }).fetchOptional();
        }).rejects.toThrow(`For fetching collection elements of "TreeNode.childNodes" with a quantity limit specified via the "$limit" method, the feild must have sorting configuration, whether it's the default order of entity field or the order after DTO field overriding.`);
    });

    it("recursiveLimit", async() => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("childNodes").sort("name").limit(2)
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.parentNodeId.isNull());
            return q.select(
                treeNode.fetch(view)
            );
        }).fetchOptional();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.PARENT_NODE_ID is null
                    limit ?
                `,
                args: [2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from (
                        with
                            recursive tb_2_(c1, c2, c3, c4) as (
                                select 
                                    tb_3_.PARENT_NODE_ID,
                                    tb_3_.ID,
                                    tb_3_.NAME,
                                    0
                                from TREE_NODE tb_3_
                                where 
                                    tb_3_.PARENT_NODE_ID = ?
                                union all
                                select 
                                    tb_4_.PARENT_NODE_ID,
                                    tb_4_.ID,
                                    tb_4_.NAME,
                                    tb_2_.c4 + 1
                                from TREE_NODE tb_4_
                                inner join tb_2_ on 
                                    tb_4_.PARENT_NODE_ID = tb_2_.c2
                            )
                        select 
                            tb_2_.c1 c1,
                            tb_2_.c2 c2,
                            tb_2_.c3 c3,
                            tb_2_.c4 c4,
                            row_number() over(partition by tb_2_.c1 order by tb_2_.c3 asc) c5
                        from tb_2_
                    ) tb_1_
                    where 
                        tb_1_.c5 <= ?
                    order by 
                        tb_1_.c4 asc,
                        tb_1_.c3 asc
                `,
                args: [1, 2],
                purpose: "loadRecursiveTreeKey(TreeNode.childNodes)"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID in(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    9, 2, 6, 3, 18, 10, 7, 11, 19, 8, 4, 5, 15, 22, 12, 20, 14, 21, 17, 24, 16, 23
                ],
                purpose: "loadRecursiveTreeNode(TreeNode.childNodes)"
            }
        );
        expect(row).toEqual({
            "name": "Home",
            "childNodes": [
                {
                    "name": "Clothing",
                    "childNodes": [
                        {
                            "name": "Man",
                            "childNodes": [
                                {
                                    "name": "Casual wear",
                                    "childNodes": [
                                        {
                                            "name": "Jacket",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Jeans",
                                            "childNodes": []
                                        }
                                    ]
                                },
                                {
                                    "name": "Formal wear",
                                    "childNodes": [
                                        {
                                            "name": "Shirt",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Suit",
                                            "childNodes": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "name": "Woman",
                            "childNodes": [
                                {
                                    "name": "Casual wear",
                                    "childNodes": [
                                        {
                                            "name": "Dress",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Jeans",
                                            "childNodes": []
                                        }
                                    ]
                                },
                                {
                                    "name": "Formal wear",
                                    "childNodes": [
                                        {
                                            "name": "Shirt",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Suit",
                                            "childNodes": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Food",
                    "childNodes": [
                        {
                            "name": "Bread",
                            "childNodes": [
                                {
                                    "name": "Baguette",
                                    "childNodes": []
                                },
                                {
                                    "name": "Ciabatta",
                                    "childNodes": []
                                }
                            ]
                        },
                        {
                            "name": "Drinks",
                            "childNodes": [
                                {
                                    "name": "Coca Cola",
                                    "childNodes": []
                                },
                                {
                                    "name": "Fanta",
                                    "childNodes": []
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("recursiveLimitOnM2M", async () => {
        const view = dto.view(LIBRARY, c => [
            c.name,
            c.version,
            c.$recursive("dependencies").limit(2).sort({path: "name", desc: true})
        ]);
        const row = await sqlClient.createQuery(LIBRARY, (q, lib) => {
            q.where(lib.id.eq(41));
            return q.select(
                lib.fetch(view)
            );
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.VERSION,
                        tb_1_.ID
                    from LIBRARY tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [41, 2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from (
                        with
                            recursive tb_2_(c1, c2, c3, c4) as (
                                select 
                                    tb_4_.DEPENDENT_ID,
                                    tb_3_.ID,
                                    tb_3_.NAME,
                                    0
                                from LIBRARY tb_3_
                                inner join LIBRARY_DEPENDENCY_MAPPING tb_4_ on 
                                    tb_3_.ID = tb_4_.DEPENDENCY_ID
                                where 
                                    tb_4_.DEPENDENT_ID = ?
                                union all
                                select 
                                    tb_6_.DEPENDENT_ID,
                                    tb_5_.ID,
                                    tb_5_.NAME,
                                    tb_2_.c4 + 1
                                from LIBRARY tb_5_
                                inner join LIBRARY_DEPENDENCY_MAPPING tb_6_ on 
                                    tb_5_.ID = tb_6_.DEPENDENCY_ID
                                inner join tb_2_ on 
                                    tb_6_.DEPENDENT_ID = tb_2_.c2
                            )
                        select 
                            tb_2_.c1 c1,
                            tb_2_.c2 c2,
                            tb_2_.c3 c3,
                            tb_2_.c4 c4,
                            row_number() over(partition by tb_2_.c1 order by tb_2_.c3 desc) c5
                        from tb_2_
                    ) tb_1_
                    where 
                        tb_1_.c5 <= ?
                    order by 
                        tb_1_.c4 asc,
                        tb_1_.c3 desc
                `,
                args: [41, 2],
                purpose: "loadRecursiveTreeKey(Library.dependencies)"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.VERSION,
                        tb_1_.ID
                    from LIBRARY tb_1_
                    where 
                        tb_1_.ID in(?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [31, 1, 11, 18, 12, 7, 16, 17, 4],
                purpose: "loadRecursiveTreeNode(Library.dependencies)"
            }
        );
        expect(row).toEqual({
            "name": "express",
            "version": "4.18.2",
            "dependencies": [
                {
                    "name": "serve-static",
                    "version": "1.15.0",
                    "dependencies": [
                        {
                            "name": "send",
                            "version": "0.18.0",
                            "dependencies": [
                                {
                                    "name": "parseurl",
                                    "version": "1.3.3",
                                    "dependencies": [
                                        {
                                            "name": "depd",
                                            "version": "2.0.0",
                                            "dependencies": [
                                                {
                                                    "name": "http-errors",
                                                    "version": "2.0.0",
                                                    "dependencies": [
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "lodash",
                    "version": "4.17.21",
                    "dependencies": []
                }
            ]
        });
    });
});