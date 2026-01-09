import { RootQuery } from "./root-query";
import { ExpressionSubQuery, TupleSubQuery } from "./sub-query";
import { BaseQuery } from "./base-query";
import { AtLeastOne } from "./utils";

export function unionAll<
    TQuery extends RootQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function unionAll<
    TQuery extends ExpressionSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function unionAll<
    TQuery extends TupleSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function unionAll<
    TQuery extends BaseQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function unionAll(
    ...queries: any[]
): any {
    throw new Error();
}

export function union<
    TQuery extends RootQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function union<
    TQuery extends ExpressionSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function union<
    TQuery extends TupleSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function union<
    TQuery extends BaseQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function union(
    ...queries: any[]
): any {
    throw new Error();
}

export function minus<
    TQuery extends RootQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function minus<
    TQuery extends ExpressionSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function minus<
    TQuery extends TupleSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function minus<
    TQuery extends BaseQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function minus(
    ...queries: any[]
): any {
    throw new Error();
}

export function intersect<
    TQuery extends RootQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function intersect<
    TQuery extends ExpressionSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function intersect<
    TQuery extends TupleSubQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function intersect<
    TQuery extends BaseQuery<any>,
>(
    ...queries: AtLeastOne<TQuery>
): TQuery;

export function intersect(
    ...queries: any[]
): any {
    throw new Error();
}

