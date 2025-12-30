import { Model, ModelMembers, ModelName, OrderedKeys } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityOf, ReferenceProp, ReturnTypeOf, ScalarProp } from "@/schema/prop";
import { Prettify } from "@/utils";

export const dto = {
    view<TModel extends Model<any, any>, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<ModelMembers<TModel>, {}, any, any>
        ) => ViewBuilder<ModelMembers<TModel>, X, any, any>
    ): View<ModelName<TModel>, Prettify<X>> {
        return new View();
    }
};

export type TypeOf<T> =
    T extends View<any, infer R>
        ? R
        : never;

type ViewBuilder<TMembers, TCurrent, TLastProp, TLastName extends string> = {
    [K in keyof TMembers as K extends keyof TCurrent ? never : K]:
        TMembers[K] extends ScalarProp<infer R, infer Nullity>
            ? ViewBuilder<
                TMembers, 
                TCurrent & (
                    Nullity extends "NONNULL"
                        ? {[P in K]: R} 
                        : {[P in K]?: R | null | undefined}
                    ),
                    TMembers[K],
                    K & string
                >
        : TMembers[K] extends ReferenceProp<infer R, infer Nullity>
            ? <X>(
                fn: (
                    builder: ViewBuilder<ModelMembers<R>, {}, any, any>
                ) => ViewBuilder<ModelMembers<R>, X, any, any>
            ) => ViewBuilder<
                TMembers,
                TCurrent & (
                    Nullity extends "NONNULL"
                        ? {[P in K]: X}
                        : {[P in K]?: X | null | undefined}
                ),
                TMembers[K],
                K & string
            >
        : TMembers[K] extends CollectionProp<infer R>
            ? <X>(
                fn: (
                    builder: ViewBuilder<ModelMembers<R>, {}, any, any>
                ) => ViewBuilder<ModelMembers<R>, X, any, any>
            ) => ViewBuilder<
                TMembers,
                TCurrent & {[P in K]: X[]},
                TMembers[K],
                K & string
            >
        : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, {}, any, any>
                ) => ViewBuilder<R, X, any, any>
            ) => ViewBuilder<
                TMembers,
                TCurrent & (
                    Nullity extends "NONNULL"
                        ? {[P in K]: X}
                        : {[P in K]?: X | null | undefined}
                ),
                TMembers[K],
                K & string
            >
        : never
}
& Fold<TMembers, TCurrent>
& Flat<TMembers, TCurrent>
& As<TMembers, TCurrent, TLastProp, TLastName>
& ReferenceFetch<TMembers, TCurrent, TLastProp, TLastName> 
& CollectionOrderBy<TMembers, TCurrent, TLastProp, TLastName>;

type As<TMembers, TCurrent, TLastProp, TLastName extends string> =
    TLastName extends ""
        ? Record<string, never>
        : {
            $as<TNewName extends string>(
                name: TNewName
            ) : ViewBuilder<
                TMembers, 
                {[K in keyof TCurrent as K extends TLastName ? TNewName : K]: TCurrent[K]}, 
                TLastProp, 
                TNewName
            >;
        };

type ReferenceFetch<TMembers, TCurrent, TLastProp, TLastName extends string> =
    TLastProp extends ReferenceProp<any, any>
        ? {
            $fetch(
                fetchType: ReferenceFetchType
            ): ViewBuilder<TMembers, TCurrent, TLastProp, TLastName> 
        }
        : Record<string, never>;

type CollectionOrderBy<TMembers, TCurrent, TLastProp, TLastName extends string> =
    TLastProp extends CollectionProp<infer R>
        ? {
            $orderBy: (
                ...orders: OrderedKeys<R>[]
            ) => ViewBuilder<TMembers, TCurrent, TLastProp, TLastName> 
        }
        : Record<string, never>;

type Flat<TMembers, TCurrent> = 
    FlatKeys<TMembers> extends never
        ? Record<string, never>
        : {
            flat<TName extends FlatKeys<TMembers>, X, TPrefix extends string = "">(
                prop: TName,
                fn: (
                    builder: ViewBuilder<ReturnTypeOf<TMembers[TName]>, {}, any, any>
                ) => ViewBuilder<ReturnTypeOf<TMembers[TName]>, X, any, any>,
                options?: { prefix: TPrefix }
            ): ViewBuilder<
                TMembers, 
                TCurrent & NullityType<NullityOf<TMembers[TName]>, PrefixType<TPrefix, X>>, 
                any, 
                ""
            >
        };

type FlatKeys<TMembers> = {
    [K in keyof TMembers]: 
        TMembers[K] extends ReferenceProp<any, any> 
            ? K
            : TMembers[K] extends EmbeddedProp<any, any>
                ? K
                : never
}[keyof TMembers];

type NullityType<TNullity, T> =
    TNullity extends "NONNULL"
        ? T
        : {[K in keyof T]?: T[K] | null | undefined};

type PrefixType<TPrefix extends string, T> = 
    TPrefix extends "" 
        ? T 
        : {[K in keyof T & string as `${TPrefix}${Capitalize<K>}`]: T[K]};

type Fold<TMembers, TCurrent> = {
    fold<TName extends string, X>(
        name: TName,
        fn: (
            builder: ViewBuilder<TMembers, {}, any, "">
        ) => ViewBuilder<TMembers, X, any, "">
    ): ViewBuilder<TMembers, TCurrent & {[P in TName]: X}, any, "">;
};

export class View<TName extends string, T> {

    readonly $type: {
        view: [TName, T] | undefined
    } = {
        view: undefined
    };
}

export type ReferenceFetchType = "LOAD" | "JOIN";

