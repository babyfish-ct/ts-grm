import { InheritedModelMembers, Model, ModelName, OrderedKeys } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityOf, ReferenceProp, ReturnTypeOf, ScalarProp } from "@/schema/prop";
import { Prettify } from "@/utils";

export const dto = {
    view<TModel extends Model<any, any, any, any, any>, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, InheritedModelMembers<TModel>, {}, any, any>
        ) => ViewBuilder<TModel, InheritedModelMembers<TModel>, X, any, any>
    ): View<ModelName<TModel>, Prettify<X>> {
        return new View();
    }
};

export type TypeOf<T> =
    T extends View<any, infer R>
        ? R
        : never;

type ViewBuilder<
    TModel extends Model<any, any, any, any, any> | never,
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> = {
    [K in keyof TMembers as K extends keyof TCurrent ? never : K]:
        TMembers[K] extends ScalarProp<infer R, infer Nullity>
            ? ViewBuilder<
                TModel,
                TMembers, 
                TCurrent & (
                    Nullity extends "NONNULL"
                        ? {[P in K]: R} 
                        : {[P in K]?: R | null | undefined}
                    ),
                    TMembers[K],
                    K & string
                >
        : TMembers[K] extends ReferenceProp<infer R, infer Nullity, any>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, InheritedModelMembers<R>, {}, any, any>
                ) => ViewBuilder<R, InheritedModelMembers<R>, X, any, any>
            ) => ViewBuilder<
                TModel,
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
                    builder: ViewBuilder<R, InheritedModelMembers<R>, {}, any, any>
                ) => ViewBuilder<R, InheritedModelMembers<R>, X, any, any>
            ) => ViewBuilder<
                TModel,
                TMembers,
                TCurrent & {[P in K]: X[]},
                TMembers[K],
                K & string
            >
        : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
            ? <X>(
                fn: (
                    builder: ViewBuilder<never, R, {}, any, any>
                ) => ViewBuilder<never, R, X, any, any>
            ) => ViewBuilder<
                TModel,
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
& Fold<TModel, TMembers, TCurrent>
& Flat<TModel, TMembers, TCurrent>
& As<TModel, TMembers, TCurrent, TLastProp, TLastName>
& InstanceOf<TModel, TMembers, TCurrent>
& ReferenceFetch<TModel, TMembers, TCurrent, TLastProp, TLastName> 
& CollectionOrderBy<TModel, TMembers, TCurrent, TLastProp, TLastName>;

type As<
    TModel extends Model<any, any, any, any, any>, 
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> =
    TLastName extends ""
        ? Record<string, never>
        : {
            $as<TNewName extends string>(
                name: TNewName
            ) : ViewBuilder<
                TModel,
                TMembers, 
                {[K in keyof TCurrent as K extends TLastName ? TNewName : K]: TCurrent[K]}, 
                TLastProp, 
                TNewName
            >;
        };

type ReferenceFetch<
    TModel extends Model<any, any, any, any, any>, 
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends ReferenceProp<any, any, any>
        ? {
            $fetch(
                fetchType: ReferenceFetchType
            ): ViewBuilder<TModel, TMembers, TCurrent, TLastProp, TLastName> 
        }
        : Record<string, never>;

type CollectionOrderBy<
    TModel extends Model<any, any, any, any, any>, 
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends CollectionProp<infer R>
        ? {
            $orderBy: (
                ...orders: OrderedKeys<R>[]
            ) => ViewBuilder<TModel, TMembers, TCurrent, TLastProp, TLastName> 
        }
        : Record<string, never>;

type Flat<
    TModel extends Model<any, any, any, any, any>, 
    TMembers, 
    TCurrent
> = 
    FlatKeys<TMembers> extends never
        ? Record<string, never>
        : {
            flat<TName extends FlatKeys<TMembers>, X, TPrefix extends string = "">(
                prop: TName,
                fn: (
                    builder: ViewBuilder<TModel, ReturnTypeOf<TMembers[TName]>, {}, any, any>
                ) => ViewBuilder<TModel, ReturnTypeOf<TMembers[TName]>, X, any, any>,
                options?: { prefix: TPrefix }
            ): ViewBuilder<
                TModel,
                TMembers, 
                TCurrent & NullityType<NullityOf<TMembers[TName]>, PrefixType<TPrefix, X>>, 
                any, 
                ""
            >
        };

type FlatKeys<TMembers> = {
    [K in keyof TMembers]: 
        TMembers[K] extends ReferenceProp<any, any, any> 
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

type Fold<
    TModel extends Model<any, any, any, any, any>, 
    TMembers, 
    TCurrent
> = {
    fold<TName extends string, X>(
        name: TName,
        fn: (
            builder: ViewBuilder<TModel, TMembers, {}, any, "">
        ) => ViewBuilder<TModel, TMembers, X, any, any>
    ): ViewBuilder<TModel, TMembers, TCurrent & {[P in TName]: X}, any, "">;
};

type InstanceOf<
    TModel extends Model<any, any, any, any, any>, 
    TMembers, 
    TCurrent
> = {
    instanceOf<TDerivedModel extends Model<any, any, any, any, any>, X>(
        derivedModel: DerivedModel<TDerivedModel, TModel>,
        fn: (
            builder: ViewBuilder<TDerivedModel, InheritedModelMembers<TDerivedModel>, {}, any, "">
        ) => ViewBuilder<TDerivedModel, InheritedModelMembers<TDerivedModel>, X, any, any>
    ): ViewBuilder<
        TModel, 
        TMembers, 
        TCurrent | ({ __typename: ModelName<TDerivedModel>} & TCurrent & X), 
        any, 
        ""
    >;
};

type DerivedModel<
    TDerivedModel extends Model<any, any, any, any, any>,
    TSuperModel extends Model<any, any, any, any, any>
> = TDerivedModel extends Model<any, any, any, any, infer SuperNames>
        ? SuperNames extends never
            ? never
            : ModelName<TSuperModel> extends SuperNames
                ? TDerivedModel
                : never
            : never;

export class View<TName extends string, T> {

    readonly $type: {
        view: [TName, T] | undefined
    } = {
        view: undefined
    };
}

export type ReferenceFetchType = "LOAD" | "JOIN";

