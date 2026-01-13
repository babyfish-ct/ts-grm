import { dsl } from "@/dsl";
import { Expression } from "@/dsl/expression";
import { SqlClient } from "@/dsl/sql-client";
import { TupleSubQuery } from "@/dsl/sub-query";
import { tuple } from "@/dsl/tuple";
import { dto } from "@/schema/dto";
import { authorModel, bookModel, treeNodeModel } from "tests/model/model";
import { expectTypeOf, test } from "vitest";

function sqlClient(): SqlClient {
    throw new Error();
}

const simpleBookView = dto.view(bookModel, $ => $
    .id
    .name
);

const simpleAuthorView = dto.view(authorModel, $ => $
    .id
    .name($ => $
        .firstName.$as("fn")
        .lastName.$as("ln")
    )
)

const simpleTreeNodeView = dto.view(treeNodeModel, $ => $
    .id
    .name
    .flat("parentNode", $ => $.id)
);

test("TestRootQueryByOne", async () => {

    const rows = await sqlClient().createQuery(bookModel, (q, book) => {
        q.where(book.storeId.eq("2"));
        q.orderBy(book.price.desc());
        return q.select(book.fetch(simpleBookView));
    }).fetchList();
    
    expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
        id: number;
        name: string;
    }>();
});

test("TestRootQueryByArray", async () => {
    
    const rows = await sqlClient().createQuery(bookModel, authorModel, (q, book, author) => {
        q.where(book.name.eq(author.name().firstName));
        q.orderBy(book.price.desc());
        return q.select(
            book.fetch(simpleBookView), 
            author.fetch(simpleAuthorView)
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

test("TestRootQueryByArray2", async () => {
    
    const rows = await sqlClient().createQuery(bookModel, (q, book) => {
        q.orderBy(book.price.desc());
        return q.select(
            book.fetch(simpleBookView), 
            book.authors("LEFT").$acceptRisk().fetch(simpleAuthorView)
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
    } | null | undefined]>();
});

test("TestRootQueryByMap", async () => {
    const rows = await sqlClient().createQuery(bookModel, (q, book) => {
        q.where(book.name.ilikeIf(undefined));
        return q.select({
            book: book.fetch(simpleBookView),
            globalRank: dsl.native.num("row_number() over(order by ...)"),
            localRank: dsl.native.num("row_number() over(parition by ...)")
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

test("TestExprIn", () => {                
    sqlClient().createQuery(bookModel, (q, book) => {
        q.where(
            dsl.or(
                book.name.in("a", "b"),
                book.name.in(["d", "e"]),
                book.name.in("e", book.store().name),
                book.name.inSubQuery(
                    dsl.subQuery(bookModel, (q, book) => {
                        q.groupBy(book.name);
                        q.orderBy(dsl.count().desc())
                        return q.select(book.name);
                    }).limit(1)
                )
            )
        )
        return q.select(book.fetch(simpleBookView));
    });
});

test("TestTupleIn", () => {
    sqlClient().createQuery(bookModel, (q, book) => {
        q.where(
            dsl.or(
                tuple(book.name, book.edition).in(["a", 1], ["b", 2]),
                tuple(book.name, book.edition).in([["c", 3], ["d", 4]]),
                tuple(book.name, book.edition).in(
                    ["e", 4],
                    [book.store().name, book.store().version]
                ),
                tuple(book.name, book.edition).inSubQuery(
                    dsl.subQuery(bookModel, (q, book) => {
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
        return q.select(book.fetch(simpleBookView));
    });
});

test("TestExists", () => {
    sqlClient().createQuery(bookModel, (q, book) => {
        q.where(
            dsl.notExists(
                dsl.subQuery(bookModel, (q, book2) => {
                    q.where(book.name.eq(book2.name));
                    q.where(book.edition.lt(book2.edition))
                })
            )
        );
        return q.select(book.fetch(simpleBookView));
    })
});

test("TestUnionAll", () => {
    const sq = dsl.unionAll(
        dsl.subQuery(bookModel, (q, book) => {
            q.where(book.storeId.eq("2"));
            return q.select(book.name, book.edition);
        }),
        dsl.subQuery(bookModel, (q, book) => {
            q.where(book.storeId.eq("4"));
            return q.select(book.name, book.edition);
        })
    )
    expectTypeOf<typeof sq>().toEqualTypeOf<
        TupleSubQuery<[
            Expression<string>, 
            Expression<number>
        ]>
    >();
});

test("TestDerivedTable", async () => {
    const baseModel = dsl.derivedModel(
        dsl.baseQuery(bookModel, (q, book) => {
            return q.select({
                book,
                localRank: dsl.native.num(
                    "row_number() over(partition by...)"
                )
            });
        })
    );
    const rows = await sqlClient().createQuery(baseModel, (q, base) => {
        q.where(base.localRank.le(3));
        return q.select(base.book.fetch(simpleBookView));
    }).fetchList();
    expectTypeOf<typeof rows[0]>().toEqualTypeOf<{
        id: number;
        name: string;
    }>();
});

test("TestCteTable", async() => {
    const baseModel = dsl.cteModel(
        dsl.baseQuery(treeNodeModel, (q, treeNode) => {
            q.where(treeNode.parentNodeId.isNull())
            return q.select({
                treeNode,
                depth: dsl.constant(0)
            });
        }).unionAllRecursively(treeNodeModel, (q, treeNode) => {
            q.where(treeNode.parentNodeId.eq(q.prev.treeNode.id));
            return q.select({
                treeNode,
                depth: q.prev.depth.plus(1)
            })
        })
    );
    const rows = await sqlClient().createQuery(baseModel, (q, base) => {
        q.orderBy(base.treeNode.name, base.depth);
        return q.select(
            base.treeNode.fetch(simpleTreeNodeView),
            base.depth
        )
    }).fetchList();
    expectTypeOf<typeof rows[0]>().toEqualTypeOf<[
        { id: number; name: string; parentNodeId: number | null | undefined },
        number
    ]>();
});
