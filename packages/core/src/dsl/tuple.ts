import { Expression, ExpressionLike, Predicate } from "./expression"
import { TupleSubQuery } from "./sub-query";
import { AtLeastTwo } from "./utils";

export function tuple<
    const TExpressions extends AtLeastTwo<ExpressionLike>
>(
    ...expressions: TExpressions
): ExprTuple<TExpressions> {
    throw new Error();
}

export type ExprTuple<TExpressions extends ExpressionLike[]> = {

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

type Matchable<TExpressions> =
    {
        [K in keyof TExpressions]: 
            TExpressions[K] extends Expression<infer T>
            ? NonNullable<T> | Expression<NonNullable<T>>
            : never
    };