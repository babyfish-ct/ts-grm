import { NullityType } from "@/schema/prop";

export type ExpressionType<T, TIsNull extends NullityType> =
    TIsNull extends "NULLABLE"
        ? NullableExpression<T>
        : NonNullExpression<T>;

export type NonNullExpression<T> = 
    T extends string
        ? NonNullStrExpression
    : T extends number 
        ? NonNullNumExpression
    : NonNullAnyExpression<T>;

export type NullableExpression<T> = 
    T extends string
        ? NullableStrExpression
    : T extends number
        ? NullableNumExpression
    : NullableAnyExpression<T>;

export type Predicate = NonNullExpression<boolean>;

interface AbstractAnyExpression<T> {
    eq(value: T | AbstractAnyExpression<T>): Predicate;
    ne(value: T | AbstractAnyExpression<T>): Predicate;
    eqIf(value: T | AbstractAnyExpression<T> | null | undefined): Predicate | null | undefined;
    neIf(value: T | AbstractAnyExpression<T> | null | undefined): Predicate | null | undefined;
};

interface NonNullAnyExpression<T> extends AbstractAnyExpression<T> {}

interface NullableAnyExpression<T> extends AbstractAnyExpression<T> {}

interface AbstractCmpExpression<T> extends AbstractAnyExpression<T> {
    lt(value: T | AbstractCmpExpression<T>): Predicate;
    le(value: T | AbstractCmpExpression<T>): Predicate;
    gt(value: T | AbstractCmpExpression<T>): Predicate;
    ge(value: T | AbstractCmpExpression<T>): Predicate;
    ltIf(value: T | AbstractCmpExpression<T> | null | undefined): Predicate | null | undefined;
    leIf(value: T | AbstractCmpExpression<T> | null | undefined): Predicate | null | undefined;
    gtIf(value: T | AbstractCmpExpression<T> | null | undefined): Predicate | null | undefined;
    geIf(value: T | AbstractCmpExpression<T> | null | undefined): Predicate | null | undefined;
}

interface NonNullCmpExpression<T> extends AbstractCmpExpression<T>, NonNullAnyExpression<T> {}

interface NullableCmpExpression<T> extends AbstractCmpExpression<T>, NullableAnyExpression<T> {}

interface NonNullNumExpression extends NonNullCmpExpression<number> {
    plus(value: number | NonNullNumExpression): NonNullNumExpression;
    plus(expr: NullableNumExpression): NullableNumExpression;
}

interface NullableNumExpression extends NullableCmpExpression<number> {
    plus(value: number | NonNullNumExpression | NullableNumExpression): NullableNumExpression;
}

interface AbstractStrExpression extends AbstractCmpExpression<string> {
    like(
        value: string | AbstractStrExpression, 
        mode?: LikeMode
    ): Predicate;
    ilike(
        value: string | AbstractStrExpression, 
        mode?: LikeMode
    ): Predicate;
    likeIf(
        value: string | AbstractStrExpression | null | undefined, 
        mode?: LikeMode
    ): Predicate | null | undefined;
    ilikeIf(
        value: string | AbstractStrExpression | null | undefined, 
        mode?: LikeMode
    ): Predicate | null | undefined;
}

interface NonNullStrExpression extends AbstractStrExpression {
    upper(): NonNullStrExpression;
    lower(): NonNullStrExpression;
}

interface NullableStrExpression extends AbstractStrExpression {
    upper(): NullableStrExpression;
    lower(): NullableStrExpression;
}

export type LikeMode = "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "EXACT";