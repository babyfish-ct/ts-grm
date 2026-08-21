import { dto } from "@ts-grm/core";
import { describe, it, expect } from "vitest";
import { LIBRARY, TREE_NODE } from "../model/model";
import { useSqliteClientWithData } from "../data_utils";
import { newSqlRecord } from "../utils";

describe("RecursiveTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("up", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("parentNode")
        ]);
        const rows = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.id.in(5, 8));
            return q.select(treeNode.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.PARENT_NODE_ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: [5, 8],
                purpose: "query"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3, c4) as (
                            select 
                                tb_2_.ID,
                                tb_2_.NAME,
                                tb_2_.PARENT_NODE_ID,
                                0
                            from TREE_NODE tb_2_
                            where 
                                tb_2_.ID in(?, ?)
                            union all
                            select 
                                tb_3_.ID,
                                tb_3_.NAME,
                                tb_3_.PARENT_NODE_ID,
                                tb_1_.c4 + 1
                            from TREE_NODE tb_3_
                            inner join tb_1_ on 
                                tb_3_.ID = tb_1_.c3
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from tb_1_
                `,
                args: [3, 6],
                purpose: "loadRecursiveTree(TreeNode.parentNode)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Fanta",
                "parentNode": {
                    "name": "Drinks",
                    "parentNode": {
                        "name": "Food",
                        "parentNode": {
                            "name": "Home",
                            "parentNode": null
                        }
                    }
                }
            },
            {
                "name": "Ciabatta",
                "parentNode": {
                    "name": "Bread",
                    "parentNode": {
                        "name": "Food",
                        "parentNode": {
                            "name": "Home",
                            "parentNode": null
                        }
                    }
                }
            }
        ]);
    });

    it("down", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("childNodes").sort("id")
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.id.eq(1));
            return q.select(treeNode.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [1, 2],
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
                        tb_1_.c3 asc
                `,
                args: [1],
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
                        },
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
                                    "name": "Casual wear",
                                    "childNodes": [
                                        {
                                            "name": "Dress",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Miniskirt",
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
                                            "name": "Suit",
                                            "childNodes": []
                                        },
                                        {
                                            "name": "Shirt",
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
                                    "name": "Casual wear",
                                    "childNodes": [
                                        {
                                            "name": "Jacket",
                                            "childNodes": [

                                            ]
                                        },
                                        {
                                            "name": "Jeans",
                                            "childNodes": [

                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "Formal wear",
                                    "childNodes": [
                                        {
                                            "name": "Suit",
                                            "childNodes": [

                                            ]
                                        },
                                        {
                                            "name": "Shirt",
                                            "childNodes": [

                                            ]
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

    it("upAndDown", async () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("parentNode"),
            c.$recursive("childNodes")
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.id.eq(10));
            return q.select(treeNode.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.PARENT_NODE_ID,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [10, 2],
                purpose: "query"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3, c4) as (
                            select 
                                tb_2_.ID,
                                tb_2_.NAME,
                                tb_2_.PARENT_NODE_ID,
                                0
                            from TREE_NODE tb_2_
                            where 
                                tb_2_.ID = ?
                            union all
                            select 
                                tb_3_.ID,
                                tb_3_.NAME,
                                tb_3_.PARENT_NODE_ID,
                                tb_1_.c4 + 1
                            from TREE_NODE tb_3_
                            inner join tb_1_ on 
                                tb_3_.ID = tb_1_.c3
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3,
                        tb_1_.c4
                    from tb_1_
                `,
                args: [9],
                purpose: "loadRecursiveTree(TreeNode.parentNode)"
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
                `,
                args: [10],
                purpose: "loadRecursiveTree(TreeNode.childNodes)"
            },
        )
        expect(row).toEqual({
            "name": "Woman",
            "parentNode": {
                "name": "Clothing",
                "parentNode": {
                    "name": "Home",
                    "parentNode": null
                }
            },
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
                        },
                        {
                            "name": "Miniskirt",
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
        });
    });

    it("withDepth", async() => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("childNodes").as("childList").depth(2).sort("name")
        ]);
        const row = await sqlClient.createQuery(TREE_NODE, (q, treeNode) => {
            q.where(treeNode.id.eq(1));
            return q.select(treeNode.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.ID = ?
                    limit ?
                `,
                args: [1, 2],
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
                    where 
                        tb_1_.c4 < ?
                    order by 
                        tb_1_.c4 asc,
                        tb_1_.c2 asc
                `,
                args: [1, 2],
                purpose: "loadRecursiveTree(TreeNode.childNodes)"
            }
        );
        expect(row).toEqual({
            "name": "Home",
            "childNodes": null,
            "childList": [
                {
                    "name": "Clothing",
                    "childList": [
                        {
                            "name": "Man",
                            "childList": null
                        },
                        {
                            "name": "Woman",
                            "childList": null
                        }
                    ]
                },
                {
                    "name": "Food",
                    "childList": [
                        {
                            "name": "Bread",
                            "childList": null
                        },
                        {
                            "name": "Drinks",
                            "childList": null
                        }
                    ]
                }
            ]
        });
    });

    it("dependencies", async () => {
        const view = dto.view(LIBRARY, c => [
            c.name,
            c.version,
            c.$recursive("dependencies")
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
                    with
                        recursive tb_1_(c1, c2, c3) as (
                            select 
                                tb_3_.DEPENDENT_ID,
                                tb_2_.ID,
                                0
                            from LIBRARY tb_2_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_3_ on 
                                tb_2_.ID = tb_3_.DEPENDENCY_ID
                            where 
                                tb_3_.DEPENDENT_ID = ?
                            union all
                            select 
                                tb_5_.DEPENDENT_ID,
                                tb_4_.ID,
                                tb_1_.c3 + 1
                            from LIBRARY tb_4_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_5_ on 
                                tb_4_.ID = tb_5_.DEPENDENCY_ID
                            inner join tb_1_ on 
                                tb_5_.DEPENDENT_ID = tb_1_.c2
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3
                    from tb_1_
                `,
                args: [41],
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
                        tb_1_.ID in(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [1,  2, 31, 32, 11, 18, 12, 13, 14, 15,  7, 16, 17,  3, 4,  5,  6],
                purpose: "loadRecursiveTreeNode(Library.dependencies)"
            }
        );
        expect(row).toEqual({
            "name": "express",
            "version": "4.18.2",
            "dependencies": [
                {
                    "name": "lodash",
                    "version": "4.17.21",
                    "dependencies": []
                },
                {
                    "name": "async",
                    "version": "3.2.5",
                    "dependencies": []
                },
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "encodeurl",
                                    "version": "1.0.2",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "fresh",
                                    "version": "0.5.2",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "etag",
                                    "version": "1.8.1",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
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
                    "name": "finalhandler",
                    "version": "1.2.0",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "encodeurl",
                                    "version": "1.0.2",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "fresh",
                                    "version": "0.5.2",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "etag",
                                    "version": "1.8.1",
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
                                                            "name": "statuses",
                                                            "version": "2.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "toidentifier",
                                                            "version": "1.0.1",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "setprototypeof",
                                                            "version": "1.2.0",
                                                            "dependencies": []
                                                        },
                                                        {
                                                            "name": "inherits",
                                                            "version": "2.0.4",
                                                            "dependencies": []
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
                            "name": "on-finished",
                            "version": "2.4.1",
                            "dependencies": [
                                {
                                    "name": "ee-first",
                                    "version": "1.1.1",
                                    "dependencies": []
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("dependents", async () => {
        const view = dto.view(LIBRARY, c => [
            c.name,
            c.version,
            c.$recursive("dependents")
        ]);
        const row = await sqlClient.createQuery(LIBRARY, (q, lib) => {
            q.where(lib.id.eq(3));
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
                args: [3, 2],
                purpose: "query"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3) as (
                            select 
                                tb_3_.DEPENDENCY_ID,
                                tb_2_.ID,
                                0
                            from LIBRARY tb_2_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_3_ on 
                                tb_2_.ID = tb_3_.DEPENDENT_ID
                            where 
                                tb_3_.DEPENDENCY_ID = ?
                            union all
                            select 
                                tb_5_.DEPENDENCY_ID,
                                tb_4_.ID,
                                tb_1_.c3 + 1
                            from LIBRARY tb_4_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_5_ on 
                                tb_4_.ID = tb_5_.DEPENDENT_ID
                            inner join tb_1_ on 
                                tb_5_.DEPENDENCY_ID = tb_1_.c2
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3
                    from tb_1_
                `,
                args: [3],
                purpose: "loadRecursiveTreeKey(Library.dependents)"
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
                        tb_1_.ID in(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [17, 16, 12, 13, 14, 15, 11, 31, 32, 41],
                purpose: "loadRecursiveTreeNode(Library.dependents)"
            }
        );
        expect(row).toEqual({
            "name": "statuses",
            "version": "2.0.1",
            "dependents": [
                {
                    "name": "http-errors",
                    "version": "2.0.0",
                    "dependents": [
                        {
                            "name": "depd",
                            "version": "2.0.0",
                            "dependents": [
                                {
                                    "name": "parseurl",
                                    "version": "1.3.3",
                                    "dependents": [
                                        {
                                            "name": "send",
                                            "version": "0.18.0",
                                            "dependents": [
                                                {
                                                    "name": "serve-static",
                                                    "version": "1.15.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                },
                                                {
                                                    "name": "finalhandler",
                                                    "version": "1.2.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "encodeurl",
                                    "version": "1.0.2",
                                    "dependents": [
                                        {
                                            "name": "send",
                                            "version": "0.18.0",
                                            "dependents": [
                                                {
                                                    "name": "serve-static",
                                                    "version": "1.15.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                },
                                                {
                                                    "name": "finalhandler",
                                                    "version": "1.2.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "fresh",
                                    "version": "0.5.2",
                                    "dependents": [
                                        {
                                            "name": "send",
                                            "version": "0.18.0",
                                            "dependents": [
                                                {
                                                    "name": "serve-static",
                                                    "version": "1.15.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                },
                                                {
                                                    "name": "finalhandler",
                                                    "version": "1.2.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "name": "etag",
                                    "version": "1.8.1",
                                    "dependents": [
                                        {
                                            "name": "send",
                                            "version": "0.18.0",
                                            "dependents": [
                                                {
                                                    "name": "serve-static",
                                                    "version": "1.15.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
                                                        }
                                                    ]
                                                },
                                                {
                                                    "name": "finalhandler",
                                                    "version": "1.2.0",
                                                    "dependents": [
                                                        {
                                                            "name": "express",
                                                            "version": "4.18.2",
                                                            "dependents": []
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
                }
            ]
        });
    });

    it("dependenciesAndDependents", async() => {
        const view = dto.view(LIBRARY, c => [
            c.name,
            c.version,
            c.$recursive("dependencies"),
            c.$recursive("dependents")
        ]);
        const row = await sqlClient.createQuery(LIBRARY, (q, lib) => {
            q.where(lib.id.eq(12));
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
                args: [12, 2],
                purpose: "query"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3) as (
                            select 
                                tb_3_.DEPENDENT_ID,
                                tb_2_.ID,
                                0
                            from LIBRARY tb_2_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_3_ on 
                                tb_2_.ID = tb_3_.DEPENDENCY_ID
                            where 
                                tb_3_.DEPENDENT_ID = ?
                            union all
                            select 
                                tb_5_.DEPENDENT_ID,
                                tb_4_.ID,
                                tb_1_.c3 + 1
                            from LIBRARY tb_4_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_5_ on 
                                tb_4_.ID = tb_5_.DEPENDENCY_ID
                            inner join tb_1_ on 
                                tb_5_.DEPENDENT_ID = tb_1_.c2
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3
                    from tb_1_
                `,
                args: [12],
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
                        tb_1_.ID in(?, ?, ?, ?, ?, ?)
                `,
                args: [16, 17, 3, 4, 5, 6],
                purpose: "loadRecursiveTreeNode(Library.dependencies)"
            },
            {
                sql: `
                    with
                        recursive tb_1_(c1, c2, c3) as (
                            select 
                                tb_3_.DEPENDENCY_ID,
                                tb_2_.ID,
                                0
                            from LIBRARY tb_2_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_3_ on 
                                tb_2_.ID = tb_3_.DEPENDENT_ID
                            where 
                                tb_3_.DEPENDENCY_ID = ?
                            union all
                            select 
                                tb_5_.DEPENDENCY_ID,
                                tb_4_.ID,
                                tb_1_.c3 + 1
                            from LIBRARY tb_4_
                            inner join LIBRARY_DEPENDENCY_MAPPING tb_5_ on 
                                tb_4_.ID = tb_5_.DEPENDENT_ID
                            inner join tb_1_ on 
                                tb_5_.DEPENDENCY_ID = tb_1_.c2
                        )
                    select 
                        tb_1_.c1,
                        tb_1_.c2,
                        tb_1_.c3
                    from tb_1_
                `,
                args: [12],
                purpose: "loadRecursiveTreeKey(Library.dependents)"
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
                        tb_1_.ID in(?, ?, ?, ?)
                `,
                args: [11, 31, 32, 41],
                purpose: "loadRecursiveTreeNode(Library.dependents)"
            }
        );
        expect(row).toEqual({
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
                                    "name": "statuses",
                                    "version": "2.0.1",
                                    "dependencies": []
                                },
                                {
                                    "name": "toidentifier",
                                    "version": "1.0.1",
                                    "dependencies": []
                                },
                                {
                                    "name": "setprototypeof",
                                    "version": "1.2.0",
                                    "dependencies": []
                                },
                                {
                                    "name": "inherits",
                                    "version": "2.0.4",
                                    "dependencies": []
                                }
                            ]
                        }
                    ]
                }
            ],
            "dependents": [
                {
                    "name": "send",
                    "version": "0.18.0",
                    "dependents": [
                        {
                            "name": "serve-static",
                            "version": "1.15.0",
                            "dependents": [
                                {
                                    "name": "express",
                                    "version": "4.18.2",
                                    "dependents": []
                                }
                            ]
                        },
                        {
                            "name": "finalhandler",
                            "version": "1.2.0",
                            "dependents": [
                                {
                                    "name": "express",
                                    "version": "4.18.2",
                                    "dependents": []
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });
});