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

import { __CombinedNullity } from "@/schema/prop_internal_behavior";
import { __CompilationError } from "@/auxiliary_types"
import { AtLeastOne, IsNull } from "./utils";
import { AbstractStrExpr, ConcatExpr } from "@/impl/ast/str_expr";
import { ArgumentError } from "@/error/common";
import { getInternalFactory } from "@/impl/ast/internal_factory";
import { CompoundPred } from "@/impl/ast/pred";
import { ConstantExpr } from "@/impl/ast/constant";
import { __I64PropContract, __NullityType, __ScalarPropContract } from "@/schema/prop_internal_types";
import { 
    __ExpressionItf, 
    __CmpExpressionItf, 
    __NumExpressionItf, 
    __StrExpressionItf, 
    __DateExpressionItf, 
    __EnumSetExpressionItf, 
    __NullableMethodsItf, 
    __CmpNullableMethodsItf, 
    __NumNullableMethodsItf, 
    __StrNullableMethodsItf, 
    __DateNullableMethodsItf, 
    __EnumSetNullableMethodsItf
} from "./expression_internal_types";

export type Expression<T> = 
    __ExpressionItf<T> & (
        IsNull<T> extends true
            ? __NullableMethodsItf<T>
            : object
    );

export type CmpExpression<T> = 
    __CmpExpressionItf<T> & (
        IsNull<T> extends true
            ? __CmpNullableMethodsItf<T>
            : object
    );

export type StrExpression<T extends Nullish<string>> = 
    __StrExpressionItf<T> & (
        IsNull<T> extends true
            ? __StrNullableMethodsItf<T>
            : object
    );

export type NumExpression<T extends Nullish<string | number>> = 
    __NumExpressionItf<T> & (
        IsNull<T> extends true
            ? __NumNullableMethodsItf<T>
            : object
    );

export type DateExpression<T extends Nullish<Date>> = 
    __DateExpressionItf<T> & (
        IsNull<T> extends true
            ? __DateNullableMethodsItf<T>
            : object
    );

export type EnumSetExpression<T extends Nullish<string>> = 
    __EnumSetExpressionItf<T> & (
        IsNull<T> extends true
            ? __EnumSetNullableMethodsItf<T>
            : object
    );

export type ExprContract<T> = 
    Expression<NonNullable<T>> | Expression<T | null>

export type CmpExprContract<T> = 
    [T] extends [NonNullable<T>]  
        ? CmpExpression<T> | CmpExpression<T | null>
        : never;

export type StrExprContract = 
    StrExpression<string> | StrExpression<string | null>;

export type NumExprContract<T extends string | number> = 
    NumExpression<T> | NumExpression<T | null>;

export type DateExprContract = 
    DateExpression<Date> | DateExpression<Date | null>;

export type EnumSetExprContract = 
    EnumSetExpression<string> | EnumSetExpression<string | null>;

export type Predicate = Expression<boolean>;

export type Nullish<T> = T | null | undefined;

export type CoalesceArgs<T> =
    [
        ...ReadonlyArray<
            Expression<NonNullable<T> | null>
            | Expression<NonNullable<T> | undefined>
            | Expression<NonNullable<T> | null | undefined>
        >,
        ...([] | [NonNullable<T>] | [Expression<NonNullable<T>>])
    ];

export type CoalesceDataType<T, TArgs extends any[]> =
    TArgs extends [...any[], infer TLast]
        ? TLast extends Expression<infer R>
            ? (
                IsNull<R> extends true
                    ? NonNullable<T> | NonNullable<R> | null
                    : NonNullable<T>
            )
            : (
                IsNull<TLast> extends true
                    ? T | TLast
                    : NonNullable<T>
            )
        : T;

export type LikeMode = "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "EXACT";

export type TimeUnit = 
    "NANOSECONDS" 
    | "MICROSECONDS"
    | "MILLISECONDS"
    | "SECONDS"
    | "MINUTES"
    | "HOURS"
    | "DAYS"
    | "WEEKS"
    | "MONTHS"
    | "QUARTERS"
    | "YEARS"
    | "DECADES"
    | "CENTURIES";

export function and(
    ...predicates: ReadonlyArray<Nullish<Predicate>>
): Predicate | undefined {
    return CompoundPred.of("AND", predicates) as Predicate | undefined;
}

export function or(
    ...predicates: ReadonlyArray<Nullish<Predicate>>
): Predicate | undefined {
    return CompoundPred.of("OR", predicates) as Predicate | undefined;
}

export function not(
    ...predicates: ReadonlyArray<Nullish<Predicate>>
): Predicate | undefined {
    return CompoundPred.of("AND", predicates)?.negative() as Predicate | undefined;
}

export type ExpressionLike = {
    __type(): {
        readonly expressionLike: true;
    }
};

export function constant(
    value: number
): NumExpression<number> {
    return new ConstantExpr(value) as any;
}

export function concat(
    ...values: AtLeastOne<string | StrExpression<string>>
): StrExpression<string> {
    const arr = values.map(value => {
        if (value == null) {
            throw new ArgumentError("concat does not accept null/undefined value");
        }
        if (typeof value === "string") {
            return getInternalFactory().createLiteral(value);
        }
        return (value as any) as AbstractStrExpr;
    });
    throw new ConcatExpr(arr);
}

export type SubqueryError = 
    __CompilationError<`Cannot directly use subqueries in 'IN' expressions.
Either use the 'inSubQuery()' function for collection operations;
or use 'asValue()' to convert the subquery into a single value before using it.`>;

export type HasSubqueryInArray<Arr extends any[]> = 
    Arr extends [infer First, ...infer Rest]
        ? First extends { __type(): { expressionSubQuery: any }; }
            ? true 
            : HasSubqueryInArray<Rest>
        : false;
