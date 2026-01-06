import { NullityType } from "@/schema/prop";

export type MakeType<T, TNullity extends NullityType> =
    TNullity extends "NONNULL"
        ? T
        : T | null | undefined;

export type Expression<
    T, 
    TAsNumber extends (T extends string ? true | false : false) = false
> = 
    NonNull<T> extends string
        ? TAsNumber extends true
            ? NumExpression<T & Null<string>>
            : StrExpression<T & Null<string>>
    : NonNull<T> extends number
        ? NumExpression<T & Null<number>>
    : AnyExpression<T>; 

export type Predicate = AnyExpression<boolean>;

type NonNull<T> = Exclude<T, null | undefined>;

type Null<T> = T | null | undefined;

type AnyExpression<T> = {
    
    __type(): { expression: T | undefined };

    eq(
        value: NonNull<T> | AnyExpression<Null<T>>
    ): Predicate;
    
    ne(
        value: NonNull<T> | AnyExpression<Null<T>>
    ): Predicate;
    
    eqIf(
        value: Null<T>
    ): Null<Predicate>;
    
    neIf(
        value: Null<T>
    ): Null<Predicate>;
} & (
    T extends null | undefined
        ? { isNull(): Predicate }
        : Record<string, never>
);

type CmpExpression<T> = AnyExpression<T> & {
    
    __type(): { 
        expression: T | undefined;
        cmpExpression: T | undefined;
    }
    
    lt(
        value: NonNull<T> | CmpExpression<Null<T>>
    ): Predicate;
    
    le(
        value: NonNull<T> | CmpExpression<Null<T>>
    ): Predicate;
    
    gt(
        value: NonNull<T> | CmpExpression<Null<T>>
    ): Predicate;
    
    ge(
        value: NonNull<T> | CmpExpression<Null<T>>
    ): Predicate;
    
    ltIf(
        value: Null<T>
    ): Null<Predicate>;
    
    leIf(
        value: Null<T>
    ): Null<Predicate>;
    
    gtIf(
        value: Null<T>
    ): Null<Predicate>;
    
    geIf(
        value: Null<T>
    ): Null<Predicate>;
}

type MergeNumType<
    T1 extends Null<string | number>, 
    T2 extends Null<string | number>
> =
    T1 | T2 extends string
        ? Exclude<T1 | T2, number> 
        : T1 | T2;

type NumExpression<T extends Null<string | number>> = CmpExpression<T> & {

    __type(): { 
        expression: T | undefined;
        cmpExpression: T | undefined;
        numExpression: T | undefined;
    }

    plus<X extends Null<string | number>>(
        value: NonNull<X> | NumExpression<Null<X>>
    ): NumExpression<MergeNumType<T, X>>;

    minus<X extends Null<string | number>>(
        value: NonNull<X> | NumExpression<Null<X>>
    ): NumExpression<MergeNumType<T, X>>;

    times<X extends Null<string | number>>(
        value: NonNull<X> | NumExpression<Null<X>>
    ): NumExpression<MergeNumType<T, X>>;

    div<X extends Null<string | number>>(
        value: NonNull<X> | NumExpression<Null<X>>
    ): NumExpression<MergeNumType<T, X>>;

    rem<X extends Null<string | number>>(
        value: NonNull<X> | NumExpression<Null<X>>
    ): NumExpression<MergeNumType<T, X>>;
}

export type LikeMode = "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "EXACT";

type StrExpression<T extends Null<string>> = CmpExpression<T> & {

    __type(): { 
        expression: T | undefined;
        cmpExpression: T | undefined;
        numExpression: T | undefined;
        strExpresion: T | undefined;
    }

    like(
        value: NonNull<string> | StrExpression<Null<string>>, 
        mode?: LikeMode
    ): Null<Predicate>;

    ilike(
        value: NonNull<string> | StrExpression<Null<string>>, 
        mode?: LikeMode
    ): Null<Predicate>;

    likeIf(
        value: Null<string>, 
        mode?: LikeMode
    ): Null<Predicate>;

    ilikeIf(
        value: Null<string>, 
        mode?: LikeMode
    ): Null<Predicate>;
}
