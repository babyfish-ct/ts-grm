import { BOOK, BOOK_STORE, TREE_NODE } from "../model/model";
import { describe, expect, it } from "vitest";
import { dsl, dto } from "@ts-grm/core";
import { newSqlRecord } from "../utils";
import { SIMPLE_BOOK_VIEW, SIMPLE_STORE_VIEW } from "./utils";
import { useSqliteClientWithData } from "../data_utils";

describe("QuerySqlTest", () => {
    
    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("where", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.id.eq(3));
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
                    tb_1_.ID = ?
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":3, "name":"Learning GraphQL", "edition":3}
        ]);
    });

    it("baseQuery", async () => {
        const baseModel = dsl.derivedModel(
            dsl.unionAll(
                dsl.baseQuery(BOOK, (q, book) => {
                    q.where(book.storeId.eq("2"));
                    return q.select({
                        book,
                        rank: dsl.native.num `row_number() over(order by ${book.price} desc)`
                    });
                }),
                dsl.baseQuery(BOOK, (q, book) => {
                    q.where(book.name.ilike("in action", "ENDS_WITH"));
                    return q.select({
                        book,
                        rank: dsl.native.num `row_number() over(order by ${book.price} desc)`
                    });
                })
            )
        );
        const rows = await sqlClient.createQuery(baseModel, (q, base) => {
            q.where(base.rank.between(1, 3));
            q.orderBy(base.book.price.desc());
            return q.select(base.book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from (
                    select 
                        tb_2_.ID c1,
                        tb_2_.NAME c2,
                        tb_2_.EDITION c3,
                        row_number() over(order by tb_2_.PRICE desc) c4,
                        tb_2_.PRICE c5
                    from BOOK tb_2_
                    where 
                        tb_2_.STORE_ID = ?
                    union all
                    select 
                        tb_3_.ID c1,
                        tb_3_.NAME c2,
                        tb_3_.EDITION c3,
                        row_number() over(order by tb_3_.PRICE desc) c4,
                        tb_3_.PRICE c5
                    from BOOK tb_3_
                    where 
                        lower(tb_3_.NAME) like ?
                ) tb_1_
                where 
                    tb_1_.c4 between ? and ?
                order by 
                    tb_1_.c5 desc
            `,
            args: ["2", "%in action", 1, 3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3
            },
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
                "id": 11,
                "name": "GraphQL in Action",
                "edition": 2
            },
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            },
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            }
        ]);
    });

    it("cteBaseQuery", async () => {
        const baseModel = dsl.cteModel(
            dsl.unionAll(
                dsl.baseQuery(BOOK, (q, book) => {
                    q.where(book.storeId.eq("2"));
                    return q.select({
                        book,
                        rank: dsl.native.num `row_number() over(order by ${book.price} desc)`
                    });
                }),
                dsl.baseQuery(BOOK, (q, book) => {
                    q.where(book.name.ilike("in action", "ENDS_WITH"));
                    return q.select({
                        book,
                        rank: dsl.native.num `row_number() over(order by ${book.price} desc)`
                    });
                })
            )
        );
        const rows = await sqlClient.createQuery(baseModel, (q, base) => {
            q.where(base.rank.between(1, 3));
            q.orderBy(base.book.price.desc());
            return q.select(base.book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    tb_1_(c1, c2, c3, c4, c5) as (
                        select 
                            tb_2_.ID,
                            tb_2_.NAME,
                            tb_2_.EDITION,
                            row_number() over(order by tb_2_.PRICE desc),
                            tb_2_.PRICE
                        from BOOK tb_2_
                        where 
                            tb_2_.STORE_ID = ?
                        union all
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            tb_3_.EDITION,
                            row_number() over(order by tb_3_.PRICE desc),
                            tb_3_.PRICE
                        from BOOK tb_3_
                        where 
                            lower(tb_3_.NAME) like ?
                    )
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from tb_1_
                where 
                    tb_1_.c4 between ? and ?
                order by 
                    tb_1_.c5 desc
            `,
            args: ["2", "%in action", 1, 3],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3
            },
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
                "id": 11,
                "name": "GraphQL in Action",
                "edition": 2
            },
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            },
            {
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            }
        ]);
    });

    it("recursiveCteBaseQuery", async () => {
        const VIEW = dto.view(TREE_NODE, c => [c.id, c.name]);
        const baseModel = dsl.cteModel(
            dsl.baseQuery(TREE_NODE, (q, treeNode) => {
                q.where(treeNode.parentNodeId.isNull());
                return q.select({
                    treeNode,
                    depth: dsl.constant(1)
                });
            }).unionAllRecursively(TREE_NODE, {
                join: (prev, treeNode) => treeNode.parentNodeId.eq(prev.treeNode.id),
                query: (q, treeNode) => {
                    return q.select({
                        treeNode,
                        depth: q.prev.depth.plus(dsl.constant(1))
                    });
                }
            })
        );
        const rows = await sqlClient.createQuery(baseModel, (q, base) => {
            q.orderBy(base.depth, base.treeNode.name);
            return q.select(
                base.treeNode.fetch(VIEW),
                base.depth
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    recursive tb_1_(c1, c2, c3) as (
                        select 
                            tb_2_.ID,
                            tb_2_.NAME,
                            1
                        from TREE_NODE tb_2_
                        where 
                            tb_2_.PARENT_NODE_ID is null
                        union all
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            tb_1_.c3 + 1
                        from TREE_NODE tb_3_
                        inner join tb_1_ on 
                            tb_3_.PARENT_NODE_ID = tb_1_.c1
                    )
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from tb_1_
                order by 
                    tb_1_.c3 asc,
                    tb_1_.c2 asc
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([
            [
                {
                    "id": 1,
                    "name": "Home"
                },
                1
            ],
            [
                {
                    "id": 9,
                    "name": "Clothing"
                },
                2
            ],
            [
                {
                    "id": 2,
                    "name": "Food"
                },
                2
            ],
            [
                {
                    "id": 6,
                    "name": "Bread"
                },
                3
            ],
            [
                {
                    "id": 3,
                    "name": "Drinks"
                },
                3
            ],
            [
                {
                    "id": 18,
                    "name": "Man"
                },
                3
            ],
            [
                {
                    "id": 10,
                    "name": "Woman"
                },
                3
            ],
            [
                {
                    "id": 7,
                    "name": "Baguette"
                },
                4
            ],
            [
                {
                    "id": 19,
                    "name": "Casual wear"
                },
                4
            ],
            [
                {
                    "id": 11,
                    "name": "Casual wear"
                },
                4
            ],
            [
                {
                    "id": 8,
                    "name": "Ciabatta"
                },
                4
            ],
            [
                {
                    "id": 4,
                    "name": "Coca Cola"
                },
                4
            ],
            [
                {
                    "id": 5,
                    "name": "Fanta"
                },
                4
            ],
            [
                {
                    "id": 22,
                    "name": "Formal wear"
                },
                4
            ],
            [
                {
                    "id": 15,
                    "name": "Formal wear"
                },
                4
            ],
            [
                {
                    "id": 12,
                    "name": "Dress"
                },
                5
            ],
            [
                {
                    "id": 20,
                    "name": "Jacket"
                },
                5
            ],
            [
                {
                    "id": 21,
                    "name": "Jeans"
                },
                5
            ],
            [
                {
                    "id": 14,
                    "name": "Jeans"
                },
                5
            ],
            [
                {
                    "id": 13,
                    "name": "Miniskirt"
                },
                5
            ],
            [
                {
                    "id": 24,
                    "name": "Shirt"
                },
                5
            ],
            [
                {
                    "id": 17,
                    "name": "Shirt"
                },
                5
            ],
            [
                {
                    "id": 23,
                    "name": "Suit"
                },
                5
            ],
            [
                {
                    "id": 16,
                    "name": "Suit"
                },
                5
            ]
        ]);
    });

    it("derivedTableJoinDerivedTable", async () => {
        const baseStoreModel = dsl.derivedModel(
            dsl.baseQuery(BOOK_STORE, (q, store) => {
                return q.select({
                    store,
                    rank: dsl.native.num `row_number() over(order by ${store.name} desc)`
                })
            })
        );
        const baseBookModel = dsl.derivedModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(order by ${book.price} desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            const baseStore = baseBook.join(
                baseStoreModel, 
                ctx => ctx.source.rank.eq(ctx.target.rank)
            );
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW),
                baseStore.store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3,
                    tb_2_.c1,
                    tb_2_.c2,
                    tb_2_.c3
                from (
                    select 
                        tb_3_.ID c1,
                        tb_3_.NAME c2,
                        tb_3_.EDITION c3,
                        row_number() over(order by tb_3_.PRICE desc) c4
                    from BOOK tb_3_
                ) tb_1_
                inner join (
                    select 
                        tb_4_.ID c1,
                        tb_4_.NAME c2,
                        tb_4_.VERSION c3,
                        row_number() over(order by tb_4_.NAME desc) c4
                    from BOOK_STORE tb_4_
                ) tb_2_ on 
                    tb_1_.c4 = tb_2_.c4
            `,
            args: [],
            purpose: "query"
        });
        expect(rows).toEqual([
            [
                {
                    "id": 9,
                    "name": "YugabyteDB: The Definitive Guide",
                    "edition": 3
                },
                {
                    "id": "1",
                    "name": "O'REILLY",
                    "version": 1
                }
            ],
            [
                {
                    "id": 8,
                    "name": "YugabyteDB: The Definitive Guide",
                    "edition": 2
                },
                {
                    "id": "2",
                    "name": "MANNING",
                    "version": 1
                }
            ]
        ]);
    });

    it("cteTableJoinCteTable", async () => {
        const baseStoreModel = dsl.cteModel(
            dsl.baseQuery(BOOK_STORE, (q, store) => {
                return q.select({
                    store,
                    rank: dsl.native.num `row_number() over(order by ${store.version} desc)`
                })
            })
        );
        const baseBookModel = dsl.cteModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(order by ${book.edition} desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            const baseStore = baseBook.join(
                baseStoreModel, 
                {
                    joinType: "LEFT",
                    filter: ctx => ctx.source.book.name.length().gt(ctx.target.store.name.length())
                }
            );
            q.where(
                baseBook.rank.lte(3),
                baseStore.rank.lte(3)
            );
            return q.selectDistinct(
                baseBook.book.id,
                baseStore.store.id
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    tb_1_(c1, c2, c3) as (
                        select 
                            tb_3_.ID,
                            row_number() over(order by tb_3_.EDITION desc),
                            tb_3_.NAME
                        from BOOK tb_3_
                    ),
                    tb_2_(c1, c2, c3) as (
                        select 
                            tb_4_.ID,
                            row_number() over(order by tb_4_.VERSION desc),
                            tb_4_.NAME
                        from BOOK_STORE tb_4_
                    )
                select distinct 
                    tb_1_.c1,
                    tb_2_.c1
                from tb_1_
                left join tb_2_ on 
                    length(cast(tb_1_.c3 as text)) > length(cast(tb_2_.c3 as text))
                where 
                        tb_1_.c2 <= ?
                    and
                        tb_2_.c2 <= ?
            `,
            args: [3, 3],
            purpose: "query"
        });
        expect(rows).toEqual([
            [6, "1"],
            [6, "2"],
            [12, "1"],
            [12, "2"],
            [3, "1"],
            [3, "2"]
        ]);
    });

    it("cteTableJoinEntityTable", async () => {
        const baseBookModel = dsl.cteModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(order by ${book.edition} desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            const store = baseBook.join(
                BOOK_STORE, 
                ctx => dsl.and(
                    ctx.source.book.storeId.eq(ctx.target.id),
                    ctx.source.rank.eq(1)
                )
            ).$acceptMulti();
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW),
                store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    tb_1_(c1, c2, c3, c4, c5) as (
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            tb_3_.EDITION,
                            tb_3_.STORE_ID,
                            row_number() over(order by tb_3_.EDITION desc)
                        from BOOK tb_3_
                    )
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3,
                    tb_2_.ID,
                    tb_2_.NAME,
                    tb_2_.VERSION
                from tb_1_
                inner join BOOK_STORE tb_2_ on 
                    tb_1_.c4 = tb_2_.ID
                and
                    tb_1_.c5 = ?
            `,
            args: [1],
            purpose: "query"
        });
        expect(rows).toEqual([
            [
                {"id": 3, "name": "Learning GraphQL", "edition":3}, 
                {"id": "1", "name":"O'REILLY", "version":1}
            ]
        ]);
    });

    it("entityJoinCteTable", async () => {
        const baseBookModel = dsl.cteModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(order by ${book.edition} desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(BOOK_STORE, (q, store) => {
            const baseBook = store.join(
                baseBookModel,
                ctx => dsl.and(
                    ctx.source.id.eq(ctx.target.book.storeId),
                    ctx.target.rank.eq(1)
                )
            );
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW),
                store.fetch(SIMPLE_STORE_VIEW)
            )
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    tb_2_(c1, c2, c3, c4, c5) as (
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            tb_3_.EDITION,
                            tb_3_.STORE_ID,
                            row_number() over(order by tb_3_.EDITION desc)
                        from BOOK tb_3_
                    )
                select 
                    tb_2_.c1,
                    tb_2_.c2,
                    tb_2_.c3,
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.VERSION
                from BOOK_STORE tb_1_
                inner join tb_2_ on 
                    tb_1_.ID = tb_2_.c4
                and
                    tb_2_.c5 = ?
            `,
            args: [1],
            purpose: "query"
        });
        expect(rows).toEqual([
            [
                {"id":3, "name":"Learning GraphQL", "edition":3},
                {"id":"1", "name":"O'REILLY", "version":1}
            ]
        ]);
    });

    it("exportedTableAssociateEntityTable", async () => {
        const baseBookModel = dsl.cteModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(order by ${book.edition} desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            q.where(baseBook.rank.eq(1));
            q.where(baseBook.book.store().version.eq(1));
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW),
                baseBook.book.store().fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    tb_1_(c1, c2, c3, c4, c5) as (
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            tb_3_.EDITION,
                            row_number() over(order by tb_3_.EDITION desc),
                            tb_3_.STORE_ID
                        from BOOK tb_3_
                    )
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3,
                    tb_2_.ID,
                    tb_2_.NAME,
                    tb_2_.VERSION
                from tb_1_
                inner join BOOK_STORE tb_2_ on 
                    tb_1_.c5 = tb_2_.ID
                where 
                        tb_1_.c4 = ?
                    and
                        tb_2_.VERSION = ?
            `,
            args: [1, 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            [
                {"id":3, "name":"Learning GraphQL", "edition":3},
                {"id":"1", "name":"O'REILLY", "version":1}
            ]
        ]);
    });

    it("exportedTableJoinEntityTable", async () => {
        const baseBookModel = dsl.cteModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(order by ${book.edition} desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            const store = baseBook.book.join(
                BOOK_STORE,
                ctx => ctx.source.storeId.eq(ctx.target.id)
            ).$acceptMulti();
            q.where(baseBook.rank.eq(1));
            q.where(store.version.eq(1));
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW),
                store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    tb_1_(c1, c2, c3, c4, c5) as (
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            tb_3_.EDITION,
                            row_number() over(order by tb_3_.EDITION desc),
                            tb_3_.STORE_ID
                        from BOOK tb_3_
                    )
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3,
                    tb_2_.ID,
                    tb_2_.NAME,
                    tb_2_.VERSION
                from tb_1_
                inner join BOOK_STORE tb_2_ on 
                    tb_1_.c5 = tb_2_.ID
                where 
                        tb_1_.c4 = ?
                    and
                        tb_2_.VERSION = ?
            `,
            args: [1, 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            [
                {"id":3, "name":"Learning GraphQL", "edition":3},
                {"id":"1", "name":"O'REILLY","version":1}
            ]
        ]);
    });

    it("except", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.store.with(c => [c.name]),
            c.authors.with(c => [c.name])
        ]);
        const rows = await dsl.except(
            sqlClient.createQuery(BOOK, (q, book) => {
                q.where(book.edition.eq(3));
                return q.select(book.fetch(view));
            }),
            sqlClient.createQuery(BOOK, (q, book) => {
                q.where(book.name.ilike("graphql"));
                return q.select(book.fetch(view));
            })
        ).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.STORE_ID,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    except
                    select 
                        tb_2_.NAME,
                        tb_2_.STORE_ID,
                        tb_2_.ID
                    from BOOK tb_2_
                    where 
                        lower(tb_2_.NAME) like ?
                `,
                args: [3, "%graphql%"],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID = ?
                `,
                args: ["1"],
                purpose: "loadAssociation(Book.store)"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "store": {
                    "name": "O'REILLY"
                },
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
                "name": "YugabyteDB: The Definitive Guide",
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
        ]);
    });
});