import { AnyModel } from "@/schema/model";
import { Expression, ExpressionLike, Predicate } from "./expression";
import { EntityTable } from "./table";
import { AtLeastOne, AtLeastTwo, ExpressionOrder } from "./utils";

export function subQuery<
    const TModels extends AtLeastOne<AnyModel>,
    TProjection extends SubQueryProjection<any, any> | void
>(
    ...args: [
        ...models: TModels,
        fn: (
            q: MutableSubQuery,
            ...tables: {
                [K in keyof TModels]: EntityTable<TModels[K]>
            } extends infer T ? T extends any[] ? T : never : never
        ) => TProjection
    ]
): TProjection extends SubQueryProjection<infer T, infer Kind>
    ? Kind extends "EXPRESSION"
        ? ExpressionSubQuery<T>
        : TupleSubQuery<T>
    : TProjection extends void
        ? ExpressionSubQuery<Expression<number>>
    : never {
    throw new Error();
}

export function all<TExpression extends ExpressionLike>(
    subQuery: ExpressionSubQuery<TExpression>
): TExpression {
    throw new Error();
}

export function any<TExpression extends ExpressionLike>(
    subQuery: ExpressionSubQuery<TExpression>
): TExpression {
    throw new Error();
}

export function exists(
    subQuery: SubQueryLike
): Predicate {
    throw new Error();
}

export function notExists(
    subQuery: SubQueryLike
): Predicate {
    throw new Error();
}
        
export interface MutableSubQuery {

    __type(): { mutableSubQuery: true };
    
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

export type SubQueryLike = {

    __type(): { subQueryLike: true; }
}

export type ExpressionSubQuery<T> = {

    __type(): { 
        subQueryLike: true;
        expressionSubQuery: T | undefined; 
    };

    limit(limit: number): ExpressionSubQuery<T>;
    offset(offset: number): ExpressionSubQuery<T>;

    asValue(): T;
} & T;

export type TupleSubQuery<TProjection> = {

    __type(): { 
        subQueryLike: true;
        tupleSubQuery: TProjection | undefined; 
    };

    limit(limit: number): TupleSubQuery<TProjection>;
    offset(offset: number): TupleSubQuery<TProjection>;
}

export type SubQueryProjection<T, TKind = "EXPRSSION" | "TUPLE"> = {

    __type(): { subQueryProjection: [T, TKind] | undefined; }
};

type SubQuerySelectArrArgs = AtLeastTwo<ExpressionLike>;


