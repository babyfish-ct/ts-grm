import { dsl } from "@ts-grm/core";
import { AUTHOR, BOOK, BOOK_STORE, ELECTRONIC_BOOK, ORGANIZATION, PAPER_BOOK, PHYSICAL_BOOK_STORE, TREE_NODE } from "../model/model";
import { describe, expect, it } from "vitest";
import { SIMPLE_BOOK_VIEW, SIMPLE_PAPER_BOOK_VIEW, SIMPLE_PHYSICAL_BOOK_STORE_VIEW, SIMPLE_STORE_VIEW, SIMPLE_TREE_NODE_VIEW } from "./utils";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";

describe("InheritanceBaseQuerySqlTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("isFunctionOfMultipleTables", async () => {
        const baseBookModel = dsl.derivedModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(partition by ${
                        book.storeId
                    } order by ${
                        book.price
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            q.where(
                dsl.or(
                    baseBook.rank.eq(1),
                    baseBook.book.is(ELECTRONIC_BOOK)
                )
            );
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW)
            );
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
                        row_number() over(partition by tb_2_.STORE_ID order by tb_2_.PRICE desc) c4,
                        tb_2_.TYPE c5
                    from BOOK tb_2_
                ) tb_1_
                where 
                        tb_1_.c4 = ?
                    or
                        tb_1_.c5 in('ElectronicBook', 'PdfElectronicBook')
            `,
            args: [1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            },
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
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            }
        ]);
    });

    it("asFunctionOfMultipleTables", async () => {
        const baseBookModel = dsl.derivedModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(partition by ${
                        book.storeId
                    } order by ${
                        book.price
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            q.where(
                dsl.or(
                    baseBook.rank.eq(1),
                    baseBook.book.as(ELECTRONIC_BOOK).address.like("https:", "STARTS_WITH")
                )
            );
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from (
                    select 
                        tb_3_.ID c1,
                        tb_3_.NAME c2,
                        tb_3_.EDITION c3,
                        row_number() over(partition by tb_3_.STORE_ID order by tb_3_.PRICE desc) c4,
                        tb_3_.TYPE c5
                    from BOOK tb_3_
                ) tb_1_
                left join ELECTRONIC_BOOK tb_2_ on 
                    tb_1_.c5 in('ElectronicBook', 'PdfElectronicBook')
                and
                    tb_1_.c1 = tb_2_.EB_ID
                where 
                        tb_1_.c4 = ?
                    or
                        tb_2_.ADDRESS like ?
            `,
            args: [1, "https:%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            },
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
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            }
        ]);
    });

    it("superPropsOfMultipleTables", async () => {
        const basePaperBookModel = dsl.derivedModel(
            dsl.baseQuery(PAPER_BOOK, (q, paperBook) => {
                return q.select({
                    paperBook,
                    rank: dsl.native.num `row_number() over(partition by ${
                        paperBook.storeId
                    } order by ${
                        paperBook.price
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(basePaperBookModel, (q, basePaperBook) => {
            q.where(basePaperBook.rank.eq(1));
            return q.select(
                basePaperBook.paperBook.fetch(SIMPLE_PAPER_BOOK_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
            select 
                tb_1_.c1,
                tb_2_.NAME,
                tb_2_.EDITION,
                tb_2_.PRICE,
                tb_1_.c2,
                tb_1_.c3
            from (
                select 
                    tb_3_.PB_ID c1,
                    tb_3_.WIDTH c2,
                    tb_3_.HEIGHT c3,
                    row_number() over(partition by tb_4_.STORE_ID order by tb_4_.PRICE desc) c4
                from PAPER_BOOK tb_3_
                inner join BOOK tb_4_ on 
                    tb_3_.PB_ID = tb_4_.ID
            ) tb_1_
            inner join BOOK tb_2_ on 
                tb_1_.c1 = tb_2_.ID
            where 
                tb_1_.c4 = ?
            `,
            args: [1],
            purpose: "query"
        });
        expect(rows).toEqual([
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

    it("derivedPropsOfMultipleTables", async () => {
        const baseBookModel = dsl.derivedModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    rank: dsl.native.num `row_number() over(partition by ${
                        book.storeId
                    } order by ${
                        book.price
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            q.where(
                dsl.or(
                    baseBook.rank.eq(1),
                    baseBook.book.as(ELECTRONIC_BOOK).address.like("https:", "STARTS_WITH"),
                    baseBook.book.as(ELECTRONIC_BOOK).edition.lt(3),
                    baseBook.book.as(ELECTRONIC_BOOK).edition.gt(10)
                )
            );
            return q.select(baseBook.book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from (
                    select 
                        tb_4_.ID c1,
                        tb_4_.NAME c2,
                        tb_4_.EDITION c3,
                        row_number() over(partition by tb_4_.STORE_ID order by tb_4_.PRICE desc) c4,
                        tb_4_.TYPE c5
                    from BOOK tb_4_
                ) tb_1_
                left join ELECTRONIC_BOOK tb_2_ on 
                    tb_1_.c5 in('ElectronicBook', 'PdfElectronicBook')
                and
                    tb_1_.c1 = tb_2_.EB_ID
                left join BOOK tb_3_ on 
                    tb_2_.EB_ID = tb_3_.ID
                where 
                        tb_1_.c4 = ?
                    or
                        tb_2_.ADDRESS like ?
                    or
                        tb_3_.EDITION < ?
                    or
                        tb_3_.EDITION > ?
            `,
            args: [1, "https:%", 3, 10],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            },
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
                "id": 10,
                "name": "GraphQL in Action",
                "edition": 1
            }
        ]);
    });

    it("asFunctionOfExportJoinedTableOfMutableTables", async () => {
        const baseBookModel = dsl.derivedModel(
            dsl.baseQuery(AUTHOR, (q, author) => {
                q.where(author.name().firstName.eq("Alex"));
                return q.select({
                    book: author.books().$acceptMulti(),
                    rank: dsl.native.num `row_number() over(partition by ${
                        author.books().$acceptMulti().storeId
                    } order by ${
                        author.books().$acceptMulti().price
                    } desc)`
                })
            })
        );
        const rows = await sqlClient.createQuery(baseBookModel, (q, baseBook) => {
            q.where(
                dsl.or(
                    baseBook.rank.eq(1),
                    baseBook.book.as(ELECTRONIC_BOOK).address.like("https:", "STARTS_WITH")
                )
            );
            return q.select(
                baseBook.book.fetch(SIMPLE_BOOK_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from (
                    select 
                        tb_5_.ID c1,
                        tb_5_.NAME c2,
                        tb_5_.EDITION c3,
                        row_number() over(partition by tb_5_.STORE_ID order by tb_5_.PRICE desc) c4,
                        tb_5_.TYPE c5
                    from AUTHOR tb_3_
                    inner join book_author_mapping tb_4_ on 
                        tb_3_.ID = tb_4_.author_id
                    inner join BOOK tb_5_ on 
                        tb_4_.book_id = tb_5_.ID
                    where 
                        tb_3_.FIRST_NAME = ?
                ) tb_1_
                left join ELECTRONIC_BOOK tb_2_ on 
                    tb_1_.c5 in('ElectronicBook', 'PdfElectronicBook')
                and
                    tb_1_.c1 = tb_2_.EB_ID
                where 
                        tb_1_.c4 = ?
                    or
                        tb_2_.ADDRESS like ?
            `,
            args: ["Alex", 1, "https:%"],
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
            }
        ]);
    });

    it("isFunctionOfSingleTable", async () => {
        const baseStoreModel = dsl.derivedModel(
            dsl.baseQuery(BOOK_STORE, (q, store) => {
                return q.select({
                    store,
                    rank: dsl.native.num `row_number() over(partition by ${
                        store.name
                    } order by ${
                        store.version
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseStoreModel, (q, baseStore) => {
            q.where(
                dsl.or(
                    baseStore.store.is(PHYSICAL_BOOK_STORE),
                    baseStore.rank.eq(1)
                ),
            );
            return q.select(
                baseStore.store.fetch(SIMPLE_STORE_VIEW)
            );
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
                        tb_2_.VERSION c3,
                        tb_2_.TYPE c4,
                        row_number() over(partition by tb_2_.NAME order by tb_2_.VERSION desc) c5
                    from BOOK_STORE tb_2_
                ) tb_1_
                where 
                        tb_1_.c4 = 'PhysicalBookStore'
                    or
                        tb_1_.c5 = ?
            `,
            args: [1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":"2", "name":"MANNING", "version":1},
            {"id":"1", "name":"O'REILLY", "version":1}
        ]);
    });

    it("asFunctionOfSingleTable", async () => {
        const baseStoreModel = dsl.derivedModel(
            dsl.baseQuery(BOOK_STORE, (q, store) => {
                return q.select({
                    store,
                    rank: dsl.native.num `row_number() over(partition by ${
                        store.name
                    } order by ${
                        store.version
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseStoreModel, (q, baseStore) => {
            q.where(
                dsl.or(
                    baseStore.store.as(PHYSICAL_BOOK_STORE).city.eq("ChengDu"),
                    baseStore.rank.eq(1)
                ),
            );
            return q.select(
                baseStore.store.fetch(SIMPLE_STORE_VIEW)
            );
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
                        tb_2_.VERSION c3,
                        tb_2_.CITY c4,
                        row_number() over(partition by tb_2_.NAME order by tb_2_.VERSION desc) c5
                    from BOOK_STORE tb_2_
                ) tb_1_
                where 
                        tb_1_.c4 = ?
                    or
                        tb_1_.c5 = ?
            `,
            args: ["ChengDu", 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":"2", "name":"MANNING", "version":1},
            {"id":"1", "name":"O'REILLY", "version":1}
        ]);
    });

    it("superPropsOfSingleTable", async () => {
        const basePhysicalStoreModel = dsl.derivedModel(
            dsl.baseQuery(PHYSICAL_BOOK_STORE, (q, store) => {
                return q.select({
                    store,
                    rank: dsl.native.num `row_number() over(partition by ${
                        store.name
                    } order by ${
                        store.version
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(basePhysicalStoreModel, (q, basePhysicalStore) => {
            q.where(
                dsl.or(
                    basePhysicalStore.store.name.like("room"),
                    basePhysicalStore.rank.eq(1)
                ),
            );
            return q.select(
                basePhysicalStore.store.fetch(SIMPLE_PHYSICAL_BOOK_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3,
                    tb_1_.c4,
                    tb_1_.c5,
                    tb_1_.c6
                from (
                    select 
                        tb_2_.ID c1,
                        tb_2_.NAME c2,
                        tb_2_.VERSION c3,
                        tb_2_.CITY c4,
                        tb_2_.STREET c5,
                        tb_2_.TAGS c6,
                        row_number() over(partition by tb_2_.NAME order by tb_2_.VERSION desc) c7
                    from BOOK_STORE tb_2_
                    where 
                        tb_2_.TYPE = 'PhysicalBookStore'
                ) tb_1_
                where 
                        tb_1_.c2 like ?
                    or
                        tb_1_.c7 = ?
            `,
            args: ["%room%", 1],
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

    it("superPropOfDowncastTypeOfSingleTable", async () => {
        const baseStoreModel = dsl.derivedModel(
            dsl.baseQuery(BOOK_STORE, (q, store) => {
                return q.select({
                    store,
                    rank: dsl.native.num `row_number() over(partition by ${
                        store.name
                    } order by ${
                        store.version
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseStoreModel, (q, baseStore) => {
            q.where(
                dsl.or(
                    baseStore.store.as(PHYSICAL_BOOK_STORE).city.eq("ChengDu"),
                    baseStore.store.as(PHYSICAL_BOOK_STORE).version.lt(3),
                    baseStore.store.as(PHYSICAL_BOOK_STORE).version.gt(10),
                    baseStore.rank.eq(1)
                ),
            );
            return q.select(
                baseStore.store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from (
                    select 
                        tb_3_.ID c1,
                        tb_3_.NAME c2,
                        tb_3_.VERSION c3,
                        tb_3_.CITY c4,
                        row_number() over(partition by tb_3_.NAME order by tb_3_.VERSION desc) c5
                    from BOOK_STORE tb_3_
                ) tb_1_
                left join BOOK_STORE tb_2_ on 
                    tb_1_.c1 = tb_2_.ID
                where 
                        tb_1_.c4 = ?
                    or
                        tb_2_.VERSION < ?
                    or
                        tb_2_.VERSION > ?
                    or
                        tb_1_.c5 = ?
            `,
            args: ["ChengDu", 3, 10, 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":"2", "name":"MANNING", "version":1},
            {"id":"1", "name":"O'REILLY", "version":1}
        ]);
    });

    it("asFunctionOfExportJoinedTableOfMutableTables", async () => {
        const baseStoreModel = dsl.derivedModel(
            dsl.baseQuery(BOOK, (q, book) => {
                q.where(
                    dsl.or(
                        book.name.ilike("graphql"),
                        book.as(ELECTRONIC_BOOK).address.like("https:", "STARTS_WITH")
                    )
                );
                return q.select({
                    store: book.store(),
                    rank: dsl.native.num `row_number() over(partition by ${
                        book.store().name
                    } order by ${
                        book.store().version
                    } desc)`
                });
            })
        );
        const rows = await sqlClient.createQuery(baseStoreModel, (q, baseStore) => {
            q.where(
                dsl.or(
                    baseStore.store.as(PHYSICAL_BOOK_STORE).city.eq("ChengDu"),
                    baseStore.rank.eq(1)
                ),
            );
            return q.select(
                baseStore.store.fetch(SIMPLE_STORE_VIEW)
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from (
                    select 
                        tb_3_.ID c1,
                        tb_3_.NAME c2,
                        tb_3_.VERSION c3,
                        tb_3_.CITY c4,
                        row_number() over(partition by tb_3_.NAME order by tb_3_.VERSION desc) c5
                    from BOOK tb_2_
                    inner join BOOK_STORE tb_3_ on 
                        tb_2_.STORE_ID = tb_3_.ID
                    left join ELECTRONIC_BOOK tb_4_ on 
                        tb_2_.TYPE in('ElectronicBook', 'PdfElectronicBook')
                    and
                        tb_2_.ID = tb_4_.EB_ID
                    where 
                            lower(tb_2_.NAME) like ?
                        or
                            tb_4_.ADDRESS like ?
                ) tb_1_
                where 
                        tb_1_.c4 = ?
                    or
                        tb_1_.c5 = ?
            `,
            args: ["%graphql%", "https:%", "ChengDu", 1],
            purpose: "query"
        });
        expect(rows).toEqual([
            {"id":"2", "name":"MANNING", "version":1},
            {"id":"1", "name":"O'REILLY", "version":1}
        ]);
    });

    it("recursiveCteOfMultipleTables", async () => {
        const baseTreeNodeModel = dsl.cteModel(
            dsl.baseQuery(TREE_NODE, (q, treeNode) => {
                q.where(treeNode.as(ORGANIZATION).location.eq("ChengDu"));
                return q.select({
                    _: treeNode,
                    depth: dsl.constant(1)
                })
            }).unionAllRecursively(TREE_NODE, {
                join: (prev, treeNode) => {
                    return treeNode.parentNodeId.eq(prev._.id);
                },
                query: (q, treeNode) => {
                    q.where(treeNode.as(ORGANIZATION).location.eq("ChengDu"));
                    return q.select({
                        _: treeNode,
                        depth: q.prev.depth.plus(dsl.constant(1))
                    });
                }
            })
        );
        const rows = await sqlClient.createQuery(baseTreeNodeModel, (q, baseTreeNode) => {
            q.where(
                baseTreeNode.depth.lte(10),
                dsl.or(
                    baseTreeNode._.name.like("org"),
                    baseTreeNode._.as(ORGANIZATION).kind.eq("A")
                )
            );
            return q.select(
                baseTreeNode._.fetch(SIMPLE_TREE_NODE_VIEW),
                baseTreeNode.depth
            );
        }).fetchList();
        sqlRecord.assert({
            sql: `
                with
                    recursive tb_1_(c1, c2, c3, c4) as (
                        select 
                            tb_3_.ID,
                            tb_3_.NAME,
                            1,
                            tb_3_.TYPE
                        from TREE_NODE tb_3_
                        left join ORGANIZATION tb_4_ on 
                            tb_3_.TYPE = 'Organization'
                        and
                            tb_3_.ID = tb_4_.ID
                        where 
                            tb_4_.LOCATION = ?
                        union all
                        select 
                            tb_5_.ID,
                            tb_5_.NAME,
                            tb_1_.c3 + 1,
                            tb_5_.TYPE
                        from TREE_NODE tb_5_
                        left join ORGANIZATION tb_6_ on 
                            tb_5_.TYPE = 'Organization'
                        and
                            tb_5_.ID = tb_6_.ID
                        inner join tb_1_ on 
                            tb_5_.PARENT_NODE_ID = tb_1_.c1
                        where 
                            tb_6_.LOCATION = ?
                    )
                select 
                    tb_1_.c1,
                    tb_1_.c2,
                    tb_1_.c3
                from tb_1_
                left join ORGANIZATION tb_2_ on 
                    tb_1_.c4 = 'Organization'
                and
                    tb_1_.c1 = tb_2_.ID
                where 
                        tb_1_.c3 <= ?
                    and
                        (
                            tb_1_.c2 like ?
                        or
                            tb_2_.KIND = ?
                        )
            `,
            args: ["ChengDu", "ChengDu", 10, "%org%", "A"],
            purpose: "query"
        });
        expect(rows).toEqual([]);
    });
});