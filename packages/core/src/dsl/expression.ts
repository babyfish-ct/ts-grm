import { NullityType } from "@/schema/prop";

export type Expression<
    T, 
    TAsNumber extends (T extends string ? true | false : false) = false
> = 
    NonNull<T> extends string
        ? TAsNumber extends true
            ? NumExpression<T & Nullable<string>>
            : StrExpression<T & Nullable<string>>
    : NonNull<T> extends number
        ? NumExpression<T & Nullable<number>>
    : AnyExpression<T>;

export type Predicate = AnyExpression<boolean>;

type NonNull<T> = Exclude<T, null | undefined>;

type Nullable<T> = T | null | undefined;

type IsNull<T> = 
    null extends T
        ? true
    : undefined extends T
        ? true
    : false;

type AnyExpression<T> = {
    
    __type(): { expression: T | undefined };

    eq(
        value: NonNull<T> | AnyExpression<T>
    ): Predicate;
    
    ne(
        value: NonNull<T> | AnyExpression<T>
    ): Predicate;
    
    eqIf(
        value: Nullable<T>
    ): Nullable<Predicate>;
    
    neIf(
        value: Nullable<T>
    ): Nullable<Predicate>;
} & (
    IsNull<T> extends true
        ? { 
            isNull(): Predicate;

            coalesce<TArgs extends CoalesceArgs<T>>(
                ...exprs: TArgs
            ): Expression<CoalesceDataType<T, TArgs>>;
        }
        : object
);

type CoalesceArgs<T> =
    [
        ...AnyExpression<Nullable<T>>[],
        ...([] | [NonNull<T>] | [AnyExpression<NonNull<T>>])
    ];

type CoalesceDataType<T, TArgs extends any[]> =
    TArgs extends [...any[], infer TLast]
        ? TLast extends Expression<infer R>
            ? (
                IsNull<R> extends true
                    ? T | R
                    : NonNull<T>
            )
            : (
                IsNull<TLast> extends true
                    ? T | TLast
                    : NonNull<T>
            )
        : T;

type CmpExpression<T> = AnyExpression<T> & {
    
    __type(): { 
        expression: T | undefined;
        cmpExpression: T | undefined;
    }
    
    lt(
        value: NonNull<T> | CmpExpression<T>
    ): Predicate;
    
    le(
        value: NonNull<T> | CmpExpression<T>
    ): Predicate;
    
    gt(
        value: NonNull<T> | CmpExpression<T>
    ): Predicate;
    
    ge(
        value: NonNull<T> | CmpExpression<T>
    ): Predicate;
    
    ltIf(
        value: Nullable<T>
    ): Nullable<Predicate>;
    
    leIf(
        value: Nullable<T>
    ): Nullable<Predicate>;
    
    gtIf(
        value: Nullable<T>
    ): Nullable<Predicate>;
    
    geIf(
        value: Nullable<T>
    ): Nullable<Predicate>;
}

type MergeNumType<
    T1 extends Nullable<string | number>, 
    T2 extends Nullable<string | number>
> =
    string extends T1 | T2
        ? Exclude<T1 | T2, number> 
        : T1 | T2;

type NumExpression<T extends Nullable<string | number>> = CmpExpression<T> & {

    __type(): { 
        expression: T | undefined;
        cmpExpression: T | undefined;
        numExpression: T | undefined;
    }

    unaryMinus(): NumExpression<T>;

    plus<X extends Nullable<string | number>>(
        value: NonNull<X> | NumExpression<X>
    ): NumExpression<MergeNumType<T, X>>;

    minus<X extends Nullable<string | number>>(
        value: NonNull<X> | NumExpression<X>
    ): NumExpression<MergeNumType<T, X>>;

    times<X extends Nullable<string | number>>(
        value: NonNull<X> | NumExpression<X>
    ): NumExpression<MergeNumType<T, X>>;

    div<X extends Nullable<string | number>>(
        value: NonNull<X> | NumExpression<X>
    ): NumExpression<MergeNumType<T, X>>;

    rem<X extends Nullable<string | number>>(
        value: NonNull<X> | NumExpression<X>
    ): NumExpression<MergeNumType<T, X>>;
}

export type LikeMode = "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "EXACT";

type StrExpression<T extends Nullable<string>> = CmpExpression<T> & {

    __type(): { 
        expression: T | undefined;
        cmpExpression: T | undefined;
        numExpression: T | undefined;
        strExpresion: T | undefined;
    }

    like(
        value: string | StrExpression<string>, 
        mode?: LikeMode
    ): Nullable<Predicate>;

    ilike(
        value: string | StrExpression<string>, 
        mode?: LikeMode
    ): Nullable<Predicate>;

    likeIf(
        value: Nullable<string>, 
        mode?: LikeMode
    ): Nullable<Predicate>;

    ilikeIf(
        value: Nullable<string>, 
        mode?: LikeMode
    ): Nullable<Predicate>;

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

    concat<X extends Nullable<string>>(
        ...values: ReadonlyArray<string | StrExpression<X>>
    ): StrExpression<T | X>;
}

export type MakeType<T, TNullity extends NullityType> =
    TNullity extends "NONNULL"
        ? T
        : T | null | undefined;

export function and<P extends Nullable<Predicate>>(
    ...predicates: P[]
): P {
    throw new Error();
}

export function or<P extends Nullable<Predicate>>(
    ...predicates: P[]
): P {
    throw new Error();
}

export function not<P extends Nullable<Predicate>>(
    ...predicates: P[]
): P {
    throw new Error();
}