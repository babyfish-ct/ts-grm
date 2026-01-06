import { NullityType } from "@/schema/prop";

export type I64Expression<T, TNullity extends NullityType> =
    T extends string
        ? TNullity extends "NULLABLE"
            ? NullableNumExpression<string> 
            : NonNullNumExpression<string>
        : TNullity extends "NULLABLE"
            ? NullableNumExpression<number> 
            : NonNullNumExpression<number>;

export type ExpressionType<T, TIsNull extends NullityType> =
    TIsNull extends "NULLABLE"
        ? NullableExpression<T>
        : NonNullExpression<T>;

export type NonNullExpression<T, TSpecial extends "I64" | undefined = undefined> = 
    T extends string
        ? TSpecial extends "I64"
            ? NonNullNumExpression<string>
            : NonNullStrExpression
    : T extends number 
        ? NonNullNumExpression<number>
    : NonNullAnyExpression<T>;

export type NullableExpression<T, TSpecial extends "I64" | undefined = undefined> = 
    T extends string
        ? TSpecial extends "I64"
            ? NullableNumExpression<string>
            : NullableStrExpression
    : T extends number
        ? NullableNumExpression<number>
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

interface NonNullNumExpression<T extends NumberType> extends NonNullCmpExpression<T> {
    
    plus<X extends NumberType>(
        value: X | 
        NonNullNumExpression<X>
    ): NonNullNumExpression<MaxNumberType<T, X>>;

    plus<X extends NumberType>(
        expr: NullableNumExpression<X>
    ): NullableNumExpression<MaxNumberType<T, X>>;
}

interface NullableNumExpression<T extends NumberType> extends NullableCmpExpression<T> {

    plus<X extends NumberType>(
        value: X | NonNullNumExpression<X> | NullableNumExpression<X>
    ): NullableNumExpression<MaxNumberType<T, X>>;
}

type NumberType = number | string;

type MaxNumberType<T1 extends NumberType, T2 extends NumberType> =
    T1 extends string
        ? string
    : T2 extends string
        ? string
    : number;

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