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

import { Expression, ExpressionLike, Predicate } from "./expression"
import { TupleSubQuery } from "./sub_query";
import { AtLeastTwo } from "./utils";
import { ExprTupleImpl } from "@/impl/ast/tuple";

export function tuple<
    const TExpressions extends AtLeastTwo<ExpressionLike>
>(
    ...expressions: TExpressions
): ExprTuple<TExpressions> {
    return new ExprTupleImpl(expressions as any);
}

export interface ExprTuple<TExpressions extends ReadonlyArray<ExpressionLike>> {

    __type(): { exprTuple: TExpressions | true }

    eq(tuple: ExprTupleMatchable<TExpressions>): Predicate;

    ne(tuple: ExprTupleMatchable<TExpressions>): Predicate;

    in(...tuples: ReadonlyArray<ExprTupleMatchable<TExpressions>>): Predicate;

    inSubQuery(
        subQuery: TupleSubQuery<
            NullitylessExpressions<TExpressions>
        >
    ): Predicate;

    notIn(...tuples: ReadonlyArray<ExprTupleMatchable<TExpressions>>): Predicate;

    notInSubQuery(
        subQuery: TupleSubQuery<
            NullitylessExpressions<TExpressions>
        >
    ): Predicate;
}

export type ExprTupleMatchable<TExpressions extends ReadonlyArray<ExpressionLike>> =
    ExprTuple<
        NullitylessExpressions<TExpressions>
    >
    | {
        readonly [K in keyof TExpressions]: 
            TExpressions[K] extends Expression<infer T>
            ? NonNullable<T> | Expression<NonNullable<T>>
            : never
    };

export type NullitylessExpressions<TExpressions> =
    {
        readonly [K in keyof TExpressions]: 
            TExpressions[K] extends Expression<infer T>
                ? Expression<NonNullable<T>> | Expression<T | null>
                : TExpressions[K];
    }