/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { RootQuery, RootQueryProjection } from "./root_query";
import { ExpressionSubQuery, TupleSubQuery } from "./sub_query";
import { BaseQuery } from "./base_query";
import { AtLeastOne } from "./utils";
import { getQueryFactory, MergedQueryKind } from "@/impl/ast/query_factory";
import { StateError } from "@/error/common";


export function union<
    TProjection extends RootQueryProjection<any>
>(
    ...queries: AtLeastOne<RootQuery<TProjection>>
): RootQuery<TProjection>;

export function union<TProjection>(
    ...queries: AtLeastOne<ExpressionSubQuery<TProjection>>
): ExpressionSubQuery<TProjection>;

export function union<TProjection>(
    ...queries: AtLeastOne<TupleSubQuery<TProjection>>
): TupleSubQuery<TProjection>;

export function union<TProjection>(
    ...queries: AtLeastOne<BaseQuery<TProjection>>
): BaseQuery<TProjection>;

export function union(
    ...queries: any[]
): any {
    return merge("UNION", queries);
}


export function unionAll<
    TProjection extends RootQueryProjection<any>
>(
    ...queries: AtLeastOne<RootQuery<TProjection>>
): RootQuery<TProjection>;

export function unionAll<TProjection>(
    ...queries: AtLeastOne<ExpressionSubQuery<TProjection>>
): ExpressionSubQuery<TProjection>;

export function unionAll<TProjection>(
    ...queries: AtLeastOne<TupleSubQuery<TProjection>>
): TupleSubQuery<TProjection>;

export function unionAll<TProjection>(
    ...queries: AtLeastOne<BaseQuery<TProjection>>
): BaseQuery<TProjection>;

export function unionAll(
    ...queries: any[]
): any {
    return merge("UNION_ALL", queries);
}


export function except<
    TProjection extends RootQueryProjection<any>
>(
    ...queries: AtLeastOne<RootQuery<TProjection>>
): RootQuery<TProjection>;

export function except<TProjection>(
    ...queries: AtLeastOne<ExpressionSubQuery<TProjection>>
): ExpressionSubQuery<TProjection>;

export function except<TProjection>(
    ...queries: AtLeastOne<TupleSubQuery<TProjection>>
): TupleSubQuery<TProjection>;

export function except<TProjection>(
    ...queries: AtLeastOne<BaseQuery<TProjection>>
): BaseQuery<TProjection>;

export function except(
    ...queries: any[]
): any {
    return merge("EXCEPT", queries);
}


export function exceptAll<
    TProjection extends RootQueryProjection<any>
>(
    ...queries: AtLeastOne<RootQuery<TProjection>>
): RootQuery<TProjection>;

export function exceptAll<TProjection>(
    ...queries: AtLeastOne<ExpressionSubQuery<TProjection>>
): ExpressionSubQuery<TProjection>;

export function exceptAll<TProjection>(
    ...queries: AtLeastOne<TupleSubQuery<TProjection>>
): TupleSubQuery<TProjection>;

export function exceptAll<TProjection>(
    ...queries: AtLeastOne<BaseQuery<TProjection>>
): BaseQuery<TProjection>;

export function exceptAll(
    ...queries: any[]
): any {
    return merge("EXCEPT_ALL", queries);
}


export function intersect<
    TProjection extends RootQueryProjection<any>
>(
    ...queries: AtLeastOne<RootQuery<TProjection>>
): RootQuery<TProjection>;

export function intersect<TProjection>(
    ...queries: AtLeastOne<ExpressionSubQuery<TProjection>>
): ExpressionSubQuery<TProjection>;

export function intersect<TProjection>(
    ...queries: AtLeastOne<TupleSubQuery<TProjection>>
): TupleSubQuery<TProjection>;

export function intersect<TProjection>(
    ...queries: AtLeastOne<BaseQuery<TProjection>>
): BaseQuery<TProjection>;

export function intersect(
    ...queries: any[]
): any {
    return merge("INTERSECT", queries);
}


export function intersectAll<
    TProjection extends RootQueryProjection<any>
>(
    ...queries: AtLeastOne<RootQuery<TProjection>>
): RootQuery<TProjection>;

export function intersectAll<TProjection>(
    ...queries: AtLeastOne<ExpressionSubQuery<TProjection>>
): ExpressionSubQuery<TProjection>;

export function intersectAll<TProjection>(
    ...queries: AtLeastOne<TupleSubQuery<TProjection>>
): TupleSubQuery<TProjection>;

export function intersectAll<TProjection>(
    ...queries: AtLeastOne<BaseQuery<TProjection>>
): BaseQuery<TProjection>;

export function intersectAll(
    ...queries: any[]
): any {
    return merge("INTERSECT_ALL", queries);
}


function merge(
    kind: MergedQueryKind,
    queries: any[]
): any {
    const query = queries[0];
    if (queries.length === 1) {
        return query;
    }
    const type = query.__type();
    const queryFactory = getQueryFactory();
    if (type.rootQuery) {
        return queryFactory.createMergedRootQuery(kind, queries);
    }
    if (type.expressionSubQuery) {
        return queryFactory.createMergedExpressionSubQuery(kind, queries);
    }
    if (type.tupleSubQuery) {
        return queryFactory.createMergedTupleSubQuery(kind, queries);
    }
    if (type.baseQuery) {
        return queryFactory.createMergedBaseQuery(kind, queries);
    }
    throw new StateError("Illegal arguments");
}