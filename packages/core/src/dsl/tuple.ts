import { Expression, Predicate } from "./expression"
import { TupleSubQuery } from "./sub-query";

export function tuple<
    const TExpressions extends AtLeastTwoExpressions<any>
>(
    ...expressions: TExpressions
): ExprTuple<TExpressions> {
    throw new Error();
}

export type ExprTuple<TExpressions extends Expression<any, any>[]> = {

    __type(): { exprTuple: TExpressions | undefined }

    eq(tuple: Matchable<TExpressions>): Predicate;

    ne(tuple: Matchable<TExpressions>): Predicate;

    in(...tuples: Matchable<TExpressions>[]): Predicate;

    in(tuples: Matchable<TExpressions>[]): Predicate;

    inSubQuery(subQuery: TupleSubQuery<TExpressions>): Predicate;

    notIn(...tuples: Matchable<TExpressions>[]): Predicate;

    notIn(tuples: Matchable<TExpressions>[]): Predicate;

    notInSubQuery(subQuery: TupleSubQuery<TExpressions>): Predicate;
}

type AtLeastTwoExpressions<T extends Expression<any, any>> =
    [T, T, ...T[]];

type Matchable<TExpressions> =
    {
        [K in keyof TExpressions]: 
            TExpressions[K] extends Expression<infer T>
            ? NonNullable<T> | Expression<NonNullable<T>>
            : never
    };