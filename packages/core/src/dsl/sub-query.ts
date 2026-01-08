import { Expression, ExpressionLike, Predicate } from "./expression";

export interface MutableSubQuery {

    __type(): { rootQueryBuilder: undefined };
    
    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    orderBy(
        ...orders: ReadonlyArray<ExpressionLike | ExpressionOrder>
    ): this;

    groupBy(
        ...expressions: ReadonlyArray<ExpressionLike>
    ): this;

    having(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    select<
        const TExpressions extends SubQuerySelectArrArgs,
    >(
        ...expressions: TExpressions
    ): SubQueryProjection<TExpressions, "TUPLE">;

    select<TExpression extends ExpressionLike>(
        expression: TExpression
    ): SubQueryProjection<TExpression, "EXPRESSION">;
}

export type ExpressionSubQuery<T> = {

    __type(): { expressionSubQuery: T | undefined; };

    limit(limit: number): ExpressionSubQuery<T>;
    offset(offset: number): ExpressionSubQuery<T>;
} & T;

export type TupleSubQuery<T> = {

    __type(): { tupleSubQuery: T | undefined; };

    limit(limit: number): TupleSubQuery<T>;
    offset(offset: number): TupleSubQuery<T>;
}

export type SubQueryProjection<T, TKind = "EXPRSSION" | "TUPLE"> = {

    __type(): { subQueryProjection: [T, TKind] | undefined; }
};

type SubQuerySelectArrArgs = AtLeastTwo<ExpressionLike>;

type AtLeastTwo<T> = [T, T, ...T[]];

