import { EmbeddedProp } from "./schema/prop";

export type Prettify<T> = 
    T extends Array<infer U>
        ? Prettify<U>[]
    : T extends object
        ? { 
            [K in keyof T]: Prettify<T[K]> 
        }
    : T;

export type FilterNever<T> = 
    T extends object
        ? {
            [K in keyof T as T[K] extends never ? never : K]: T[K]
        }
        : never;

export type FlattenMembers<
    TMembers extends object, 
    TExcludeEmbedded extends boolean = false
> = 
    TExcludeEmbedded extends true
        ? UnionToIntersection<DeepMembers<TMembers, TExcludeEmbedded, "">>
        : { [K in keyof TMembers]: TMembers[K] } 
            & UnionToIntersection<DeepMembers<TMembers, TExcludeEmbedded, "">>;

type DeepMembers<
    TMembers extends object, 
    TExcludeEmbedded extends boolean, 
    TPrefix extends string
> = 
    {
        [K in keyof TMembers]: 
            K extends string
                ? TMembers[K] extends EmbeddedProp<infer E, any> 
                    ? TExcludeEmbedded extends true
                        ? DeepMembers<E, TExcludeEmbedded, `${TPrefix}${K}.`>
                        : DeepMembers<E, TExcludeEmbedded, `${TPrefix}${K}.`> 
                            & { [Key in `${TPrefix}${K}`]: TMembers[K] }
                    : { [Key in `${TPrefix}${K}`]: TMembers[K] }
                : never
    }[keyof TMembers];

export type UnionToIntersection<U> = 
    (U extends any ? (k: U) => void : never) extends (k: infer I) => void 
        ? I 
        : never;

export type CompilationError<T extends string> =
    `\u274C ts-grm: ${T}`;