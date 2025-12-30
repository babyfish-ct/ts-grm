type Letter =
    | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
    | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't'
    | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
    | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
    | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'
    | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type Underline = '_';

type IdentifierChar = Letter | Digit | Underline;
type FirstChar = Letter | Underline;

type IsFirstChar<C> = C extends FirstChar ? true : false;
type IsIdentifierChar<C> = C extends IdentifierChar ? true : false;

type Split<S extends string> =
    S extends `${infer C}${infer Rest}` ? [C, ...Split<Rest>] : [];

type ValidatePlainIdentifier<T extends string> =
    Split<T> extends infer Chars
        ? Chars extends string[]
            ? ValidateChars<Chars, []>
            : false
        : false;

type ValidateChars<Chars extends string[], Index extends any[]> =
    Chars extends [infer First, ...infer Rest]
        ? First extends string
            ? Rest extends string[]
                ? Index['length'] extends 0
                    ? IsFirstChar<First> extends true
                        ? ValidateChars<Rest, [...Index, any]>
                        : false
                    : IsIdentifierChar<First> extends true
                        ? ValidateChars<Rest, [...Index, any]>
                        : false
                : false
            : false
        : true;

type StripBackticks<T extends string> =
    T extends `\`${infer Content}\`` ? Content : T;

type HasProperBackticks<T extends string> =
    T extends `\`${infer Content}\``
        ? Content extends `${string}\`${string}`
            ? false
            : true
        : T extends `${string}\`${string}`
            ? false
            : true;

export type DatabaseIdentifier<T extends string> =
    HasProperBackticks<T> extends true
        ? ValidatePlainIdentifier<StripBackticks<T>> extends true
            ? T
            : never
        : never;