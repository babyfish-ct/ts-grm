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

import { OrderNullsType } from "@/schema/order";
import { AtLeastOne, ExpressionOrder, IsNull } from "./utils";
import { 
    CmpExpression, 
    CoalesceArgs, 
    CoalesceDataType, 
    DateExpression, 
    EnumSetExpression, 
    Expression, 
    HasSubqueryInArray, 
    LikeMode, 
    Nullish,
    NumExpression, 
    Predicate, 
    StrExpression, 
    SubqueryError, 
    TimeUnit 
} from "./expression";
import { ExpressionSubQuery } from "./sub_query";

export interface __ExpressionItf<T> {
    
    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly __t?: T;
    };

    asc(nulls?: OrderNullsType): ExpressionOrder;

    desc(nulls?: OrderNullsType): ExpressionOrder;

    eq(
        value: __RHSType<T>
    ): Predicate;
    
    ne(
        value: __RHSType<T>
    ): Predicate;

    in<Values extends __RHSType<T>[]>(
        ...values: HasSubqueryInArray<Values> extends true 
            ? [SubqueryError]
            : Values
    ): Predicate;

    inSubQuery(
        subQuery: ExpressionSubQuery<Expression<NonNullable<T>>>
    ): Predicate;

    notIn<Values extends __RHSType<T>[]>(
        ...values: HasSubqueryInArray<Values> extends true 
            ? [SubqueryError]
            : Values
    ): Predicate;

    notInSubQuery(
        subQuery: ExpressionSubQuery<Expression<NonNullable<T>>>
    ): Predicate;
    
    eqIf(
        value: Nullish<T>
    ): Predicate | undefined;
    
    neIf(
        value: Nullish<T>
    ): Predicate | undefined;

    inIf(
        values: NonNullable<T>[] | null | undefined
    ): Predicate | undefined;

    notInIf(
        values: NonNullable<T>[] | null | undefined
    ): Predicate | undefined;
}

export interface __CmpExpressionItf<T> extends __ExpressionItf<T> {
    
    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly cmpExpression: true;
        readonly __t?: T;
    };
    
    lt(
        value: __RHSType<T>
    ): Predicate;
    
    lte(
        value: __RHSType<T>
    ): Predicate;
    
    gt(
        value: __RHSType<T>
    ): Predicate;
    
    gte(
        value: __RHSType<T>
    ): Predicate;

    between(
        min: __RHSType<T>,
        max: __RHSType<T>
    ): Predicate;
    
    ltIf(
        value: Nullish<T>
    ): Predicate | undefined;
    
    lteIf(
        value: Nullish<T>
    ): Predicate | undefined;
    
    gtIf(
        value: Nullish<T>
    ): Predicate | undefined;
    
    gteIf(
        value: Nullish<T>
    ): Predicate | undefined;

    betweenIf(
        min: Nullish<T>,
        max: Nullish<T>
    ): Predicate | undefined;
}

export interface __StrExpressionItf<T extends Nullish<string>> extends __CmpExpressionItf<T> {

    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly cmpExpression: true;
        readonly strExpression: true;
        readonly __t?: T;
    };

    like(
        value: string, 
        mode?: LikeMode
    ): Predicate | undefined;

    ilike(
        value: string, 
        mode?: LikeMode
    ): Predicate | undefined;

    likeIf(
        value: Nullish<string>, 
        mode?: LikeMode
    ): Predicate | undefined;

    ilikeIf(
        value: Nullish<string>, 
        mode?: LikeMode
    ): Predicate | undefined;

    notLike(
        value: string, 
        mode?: LikeMode
    ): Predicate | undefined;

    notIlike(
        value: string, 
        mode?: LikeMode
    ): Predicate | undefined;

    notLikeIf(
        value: Nullish<string>, 
        mode?: LikeMode
    ): Predicate | undefined;

    notIlikeIf(
        value: Nullish<string>, 
        mode?: LikeMode
    ): Predicate | undefined;

    lower(): StrExpression<T>;

    upper(): StrExpression<T>;

    trim(): StrExpression<T>;

    ltrim(): StrExpression<T>;

    length(): NumExpression<number>;

    reverse(): StrExpression<T>;

    replace(oldStr: string, newStr: string): StrExpression<T>;

    lpad(
        length: number | NumExpression<number>, 
        pad?: string
    ): StrExpression<T>;

    rpad(
        length: number | NumExpression<number>, 
        pad?: string
    ): StrExpression<T>;

    left(
        length: number | NumExpression<number>
    ): StrExpression<T>;

    right(
        length: number | NumExpression<number>
    ): StrExpression<T>;

    position(
        substr: string, 
        start?: number | NumExpression<number>
    ): StrExpression<T>;

    substring(
        start: number | NumExpression<number>,
        length?: number | NumExpression<number>
    ): StrExpression<T>;
}

export interface __NumExpressionItf<T extends Nullish<string | number>> extends __CmpExpressionItf<T> {

    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly cmpExpression: true;
        readonly numExpression: true;
        readonly __t?: T;
    };

    unaryMinus(): NumExpression<T>;

    plus<X extends Nullish<string | number>>(
        value: NonNullable<X> | NumExpression<X>
    ): NumExpression<__MergeNumType<T, X>>;

    minus<X extends Nullish<string | number>>(
        value: NonNullable<X> | NumExpression<X>
    ): NumExpression<__MergeNumType<T, X>>;

    times<X extends Nullish<string | number>>(
        value: NonNullable<X> | NumExpression<X>
    ): NumExpression<__MergeNumType<T, X>>;

    div<X extends Nullish<string | number>>(
        value: NonNullable<X> | NumExpression<X>
    ): NumExpression<__MergeNumType<T, X>>;

    rem<X extends Nullish<string | number>>(
        value: NonNullable<X> | NumExpression<X>
    ): NumExpression<__MergeNumType<T, X>>;

    eq(
        value: __RHSType<T> | __RHSType<number>
    ): Predicate;

    ne(
        value: __RHSType<T> | __RHSType<number>
    ): Predicate;

    in<Values extends __RHSType<T>[]>(
        ...values: HasSubqueryInArray<Values> extends true 
            ? [SubqueryError]
            : Values
    ): Predicate;

    in<Values extends Array<__RHSType<T> | __RHSType<number>>>(
        ...values: HasSubqueryInArray<Values> extends true 
            ? [SubqueryError]
            : Values
    ): Predicate;

    in<Values extends __RHSType<T>[]>(
        ...values: HasSubqueryInArray<Values> extends true 
            ? [SubqueryError]
            : Values
    ): Predicate;

    in<Values extends Array<__RHSType<T> | __RHSType<number>>>(
        ...values: HasSubqueryInArray<Values> extends true 
            ? [SubqueryError]
            : Values
    ): Predicate;

    lt(
        value: __RHSType<T> | __RHSType<number>
    ): Predicate;
    
    lte(
        value: __RHSType<T> | __RHSType<number>
    ): Predicate;
    
    gt(
        value: __RHSType<T> | __RHSType<number>
    ): Predicate;
    
    gte(
        value: __RHSType<T> | __RHSType<number>
    ): Predicate;

    between(
        min: __RHSType<T> | __RHSType<number>,
        max: __RHSType<T> | __RHSType<number>
    ): Predicate;
}

export interface __EnumSetExpressionItf<T extends Nullish<string>> extends __ExpressionItf<T> {

    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly cmpExpression: true;
        readonly enumSetExpression: true;
        readonly __t?: T;
    };
    
    containsAny(...values: AtLeastOne<T>): Predicate;

    notContainsAny(...values: AtLeastOne<T>): Predicate;

    containsAll(...values: AtLeastOne<T>): Predicate;

    notContainsAll(...values: AtLeastOne<T>): Predicate;
}

export interface __DateExpressionItf<T extends Nullish<Date>> extends __CmpExpressionItf<T> {

    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly cmpExpression: true;
        readonly dateExpression: true;
        readonly __t?: T;
    };
    
    plus(
        value: number | Expression<number>, 
        timeUnit: TimeUnit
    ): DateExpression<T>;

    minus(
        value: number | Expression<number>, 
        timeUnit: TimeUnit
    ): DateExpression<T>;

    diff(
        value: Date | DateExpression<any>, 
        timeUnit: TimeUnit
    ): NumExpression<number>;
}

export type __RHSType<T> =
    NonNullable<T> 
    | __ExpressionItf<NonNullable<T>> 
    | __ExpressionItf<NonNullable<T> | null>;

export type __MergeNumType<X, Y> =
    NonNullable<X> extends string
        ? __MergeNumNullity<string, X, Y>
    : NonNullable<Y> extends string
        ? __MergeNumNullity<string, X, Y>
    : __MergeNumNullity<number, X, Y>;

export type __MergeNumNullity<T, X, Y> =
    IsNull<X> extends true
        ? T | null
    : IsNull<Y> extends true
        ? T | null
    : T;

export interface __NullableMethodsItf<T> {

    isNull(): Predicate;

    isNotNull(): Predicate;

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): Expression<CoalesceDataType<T, TArgs>>;

    asNonNull(): Expression<NonNullable<T>>;
}

export interface __CmpNullableMethodsItf<T> extends __NullableMethodsItf<T> {

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): CmpExpression<CoalesceDataType<T, TArgs>>;
}

export interface __StrNullableMethodsItf<T extends Nullish<string>> extends __CmpNullableMethodsItf<T> {

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): StrExpression<CoalesceDataType<T, TArgs>>;
}

export interface __DateNullableMethodsItf<T extends Nullish<Date>> extends __CmpNullableMethodsItf<T> {

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): DateExpression<CoalesceDataType<T, TArgs>>;
}

export interface __StrNullableMethodsItf<T extends Nullish<string>> extends __CmpNullableMethodsItf<T> {

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): StrExpression<CoalesceDataType<T, TArgs>>;
}

export interface __NumNullableMethodsItf<T extends Nullish<string | number>> extends __CmpNullableMethodsItf<T> {

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): NumExpression<CoalesceDataType<T, TArgs>>;
}

export interface __EnumSetNullableMethodsItf<T extends Nullish<string>> extends __NullableMethodsItf<T> {

    coalesce<const TArgs extends CoalesceArgs<T>>(
        ...exprs: TArgs
    ): EnumSetExpression<CoalesceDataType<T, TArgs>>;
}
