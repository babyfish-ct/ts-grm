import { dsl } from "@/dsl";
import { NumExpression, StrExpression } from "@/dsl/expression";
import { SqlClient } from "@/dsl/sql_client";
import { TupleSubQuery } from "../../src/dsl/sub_query";
import { tuple } from "../../src/dsl/tuple";
import { AUTHOR, BOOK, BOOK_STORE, TREE_NODE } from "../model/model";
import { expectTypeOf, describe, it } from "vitest";
import { dto } from "@/index";

describe("QueryTest", () => {
    
    function sqlClient(): SqlClient {
        throw new Error("Not implemented");
    }

    const SIMPLE_BOOK_VIEW = dto.view(BOOK, c => [
        c.id,
        c.name
    ]);

    const SIMPLE_AUTHOR_VIEW = dto.view(AUTHOR, c => [
        c.id,
        c.name.with(c => [
            c.firstName.as("fn"),
            c.lastName.as("ln")
        ])
    ]);

    const SIMPLE_TREE_NODE_VIEW = dto.view(TREE_NODE, c => [
        c.id,
        c.name,
        c.parentNodeId
    ]);

    it("TestRootQueryByOne", async () => {

        const rows = await sqlClient().createQuery(BOOK, (q, book) => {
            q.where(book.storeId.eq("2"));
            q.orderBy(book.price.desc());
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        
        expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
            id: number;
            name: string;
        }>();
    });

    it("TestNullExpr", async() => {

        const rows = await sqlClient().createQuery(BOOK, (q, book) => {
            q.where(book.storeId.eq("2"));
            q.orderBy(book.price.desc());
            return q.select(book.storeId);
        }).fetchList();

        expectTypeOf<typeof rows[0]>().toEqualTypeOf<string | null>();
    });

    it("TestUndefinedExpr", async() => {

        const rows = await sqlClient().createQuery(BOOK, (q, book) => {
            q.where(book.storeId.eq("2"));
            q.orderBy(book.price.desc());
            return q.select(book.storeId);
        }).fetchList({nullAsUndefined: true});

        expectTypeOf<typeof rows[0]>().toEqualTypeOf<string | undefined>();
    });

    it("TestRootQueryByArray", async () => {
        
        const rows = await sqlClient().createQuery(BOOK, AUTHOR, (q, book, author) => {
            q.where(book.name.eq(author.name().firstName));
            q.orderBy(book.price.desc());
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW), 
                author.fetch(SIMPLE_AUTHOR_VIEW)
            );
        }).fetchList();

        expectTypeOf<typeof rows[0]>().toEqualTypeOf<[{
            id: number;
            name: string;
        }, {
            id: number;
            name: {
                fn: string;
                ln: string;
            };
        }]>();
    });

    it("TestRootQueryByArray2", async () => {
        
        const rows = await sqlClient().createQuery(BOOK, (q, book) => {
            q.orderBy(book.price.desc());
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW), 
                book.authors("LEFT").$acceptMulti().fetch(SIMPLE_AUTHOR_VIEW)
            );
        }).fetchList();

        expectTypeOf<typeof rows[0]>().toEqualTypeOf<[{
            id: number;
            name: string;
        }, {
            id: number;
            name: {
                fn: string;
                ln: string;
            };
        } | null]>();
    });

    it("TestRootQueryByArray2WithNullAsUndefined", async () => {
        
        const rows = await sqlClient().createQuery(BOOK, (q, book) => {
            q.orderBy(book.price.desc());
            return q.select(
                book.fetch(SIMPLE_BOOK_VIEW), 
                book.authors("LEFT").$acceptMulti().fetch(SIMPLE_AUTHOR_VIEW)
            );
        }).fetchList({nullAsUndefined: true});

        expectTypeOf<typeof rows[0]>().toEqualTypeOf<[{
            id: number;
            name: string;
        }, {
            id: number;
            name: {
                fn: string;
                ln: string;
            };
        } | undefined]>();
    });

    it("TestRootQueryByMap", async () => {
        const rows = await sqlClient().createQuery(BOOK, (q, book) => {
            q.where(book.name.ilikeIf(undefined));
            return q.select({
                book: book.fetch(SIMPLE_BOOK_VIEW),
                globalRank: dsl.native.num `row_number() over(order by ${book.price})`,
                localRank: dsl.native.num `row_number() over(parition by ${
                    book.storeId
                } order by ${
                    book.price
                } desc)`
            });
        }).fetchList();

        expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
            readonly book: {
                id: number;
                name: string;
            };
            readonly globalRank: number;
            readonly localRank: number;
        }>();
    });

    it("TestExprIn", () => {                
        sqlClient().createQuery(BOOK, (q, book) => {
            q.where(
                dsl.or(
                    book.name.in("a", "b"),
                    book.name.in(...["d", "e"]),
                    book.name.in("e", book.store().name),
                    book.name.inSubQuery(
                        dsl.subQuery(BOOK, (q, book) => {
                            q.groupBy(book.name);
                            q.orderBy(dsl.count().desc())
                            return q.select(book.name);
                        }).limit(1)
                    )
                )
            )
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        });
    });

    it("TestTupleIn", () => {
        sqlClient().createQuery(BOOK, (q, book) => {
            q.where(
                dsl.or(
                    tuple(book.name, book.edition).in(["a", 1], ["b", 2]),
                    tuple(book.name, book.edition).in(["c", 3], ["d", 4]),
                    tuple(book.name, book.edition).in(
                        ["e", 4],
                        [book.store().name, book.store().version]
                    ),
                    tuple(book.name, book.edition).inSubQuery(
                        dsl.subQuery(BOOK, (q, book) => {
                            q.groupBy(book.name, book.edition);
                            q.orderBy(dsl.count().desc());
                            return q.select(
                                book.name,
                                book.edition
                            );
                        }).limit(1)
                    )
                )
            )
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        });
    });

    it("TestExists", () => {
        sqlClient().createQuery(BOOK, (q, book) => {
            q.where(
                dsl.notExists(
                    dsl.subQuery(BOOK, (q, book2) => {
                        q.where(book.name.eq(book2.name));
                        q.where(book.edition.lt(book2.edition))
                    })
                )
            );
            return q.select(book.fetch(SIMPLE_BOOK_VIEW));
        })
    });

    it("TestUnionAll", () => {
        const sq = dsl.unionAll(
            dsl.subQuery(BOOK, (q, book) => {
                q.where(book.storeId.eq("2"));
                return q.select(book.name, book.edition);
            }),
            dsl.subQuery(BOOK, (q, book) => {
                q.where(book.storeId.eq("4"));
                return q.select(book.name, book.edition);
            })
        )
        expectTypeOf<typeof sq>().toEqualTypeOf<
            TupleSubQuery<readonly [
                StrExpression<string>, 
                NumExpression<number>
            ]>
        >();
    });

    it("TestDerivedTable", async () => {
        const baseModel = dsl.derivedModel(
            dsl.baseQuery(BOOK, (q, book) => {
                return q.select({
                    book,
                    localRank: dsl.native.num `row_number() over(partition by ${
                        book.storeId
                    } order by ${
                        book.price
                    } desc)`
                });
            })
        );
        const rows = await sqlClient().createQuery(baseModel, (q, base) => {
            q.where(base.localRank.lte(3));
            return q.select(base.book.fetch(SIMPLE_BOOK_VIEW));
        }).fetchList();
        expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
            id: number;
            name: string;
        }>();
    });

    it("TestCteTable", async() => {
        const baseModel = dsl.cteModel(
            dsl.baseQuery(TREE_NODE, (q, treeNode) => {
                q.where(treeNode.parentNodeId.isNull())
                return q.select({
                    treeNode,
                    depth: dsl.constant(0)
                });
            }).unionAllRecursively(TREE_NODE, {
                join: (prev, treeNode) => treeNode.parentNodeId.eq(prev.treeNode.id),
                query: (q, treeNode) => {
                    return q.select({
                        treeNode,
                        depth: q.prev.depth.plus(1)
                    })
                }
            })
        );
        const rows = await sqlClient().createQuery(baseModel, (q, base) => {
            q.orderBy(base.treeNode.name, base.depth);
            return q.select(
                base.treeNode.fetch(SIMPLE_TREE_NODE_VIEW),
                base.depth
            )
        }).fetchList();
        expectTypeOf<typeof rows[0]>().toEqualTypeOf<[
            { id: number; name: string; parentNodeId: number | null },
            number
        ]>();
    });

    it("TestCteLeftJoin", async () => {
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
        const rows = await sqlClient().createQuery(baseBookModel, (q, baseBook) => {
            const baseStore = baseBook.join(
                baseStoreModel, 
                {
                    joinType: "LEFT",
                    filter: ctx => ctx.source.book.name.eq(ctx.target.store.name)
                }
            ).$acceptMulti();
            q.where(
                baseBook.rank.lte(3),
                baseStore.rank.lte(3)
            );
            return q.select(
                baseBook.book.id,
                baseStore.store.id
            );
        }).fetchList();
        expectTypeOf<typeof rows[0]>().toEqualTypeOf<[
            number, string | null
        ]>();
    });

    it("TestAssociationModel", async () => {
        const rows = await sqlClient().createQuery(
            dsl.associationModel(BOOK, "authors"), 
            (q, association) => {
                q.where(association.sourceId.in(1, 2, 3));
                q.where(association.targetId.in(1, 2, 3));
                return q.select(
                    association.source().fetch(SIMPLE_BOOK_VIEW),
                    association.target().fetch(SIMPLE_AUTHOR_VIEW)
                );
            }
        ).fetchList();
        expectTypeOf<typeof rows[0]>().toEqualTypeOf<[
            {
                id: number;
                name: string;
            }, {
                id: number;
                name: {
                    fn: string;
                    ln: string;
                };
            }]
        >();
    });
});