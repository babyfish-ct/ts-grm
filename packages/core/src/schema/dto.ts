import { AllModelMembers, AnyModel, Model, ModelName, OrderedKeys } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityOf, ReferenceProp, ReturnTypeOf, ScalarProp } from "@/schema/prop";
import { Prettify } from "@/utils";

export const dto = {
    view<TModel extends AnyModel, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, AllModelMembers<TModel>, {}, any, any>
        ) => ViewBuilder<TModel, AllModelMembers<TModel>, X, any, any>
    ): View<ModelName<TModel>, Prettify<X>> {
        return new View();
    }
};

export type TypeOf<T> =
    T extends View<any, infer R>
        ? R
        : never;

type ViewBuilder<
    TModel extends AnyModel | never,
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
        : TMembers[K] extends ReferenceProp<infer R, infer Nullity, any, any>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, AllModelMembers<R>, {}, any, any>
                ) => ViewBuilder<R, AllModelMembers<R>, X, any, any>
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
                    builder: ViewBuilder<R, AllModelMembers<R>, {}, any, any>
                ) => ViewBuilder<R, AllModelMembers<R>, X, any, any>
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
& ReferenceKeyMembers<TModel, TMembers, TCurrent>
& Fold<TModel, TMembers, TCurrent>
& Flat<TModel, TMembers, TCurrent>
& As<TModel, TMembers, TCurrent, TLastProp, TLastName>
& InstanceOf<TModel, TMembers, TCurrent>
& ReferenceFetch<TModel, TMembers, TCurrent, TLastProp, TLastName> 
& CollectionOrderBy<TModel, TMembers, TCurrent, TLastProp, TLastName>;

type As<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> =
    TLastName extends ""
        ? object
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
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends ReferenceProp<any, any, any, any>
        ? {
            $fetch(
                fetchType: ReferenceFetchType
            ): ViewBuilder<TModel, TMembers, TCurrent, TLastProp, TLastName> 
        }
        : object;

type CollectionOrderBy<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends CollectionProp<infer TItemModel>
        ? {
            $orderBy: (
                ...orders: OrderedKeys<TItemModel>[]
            ) => ViewBuilder<TModel, TMembers, TCurrent, TLastProp, TLastName> 
        }
        : object;

type Flat<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent
> = 
    FlatKeys<TMembers> extends never
        ? object
        : {
            flat<TName extends FlatKeys<TMembers> & string, X, TPrefix extends string = TName>(
                options: TName | { prop: TName, prefix?: TPrefix },
                fn: (
                    builder: ViewBuilder<
                        FlatTargetModel<TModel, TMembers[TName]>, 
                        FlatTargetMembers<TMembers[TName]>, 
                        {}, 
                        any, 
                        any
                    >
                ) => ViewBuilder<
                    FlatTargetModel<TModel, TMembers[TName]>, 
                    FlatTargetMembers<TMembers[TName]>, 
                    X, 
                    any, 
                    any
                >
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
        TMembers[K] extends ReferenceProp<any, any, any, any> 
            ? K
            : TMembers[K] extends EmbeddedProp<any, any>
                ? K
                : never
}[keyof TMembers];

type FlatTargetModel<TModel extends AnyModel, TProp> =
    TProp extends ReferenceProp<infer TargetModel, any, any, any>
        ? TargetModel
        : TModel;

type FlatTargetMembers<TProp> =
    TProp extends ReferenceProp<infer TargetModel, any, any, any>
        ? AllModelMembers<TargetModel>
        : ReturnTypeOf<TProp>;

type ReferenceKeyMembers<TModel extends AnyModel, TMembers, TCurrent> = {
    [
        K in keyof TMembers
        as TMembers[K] extends ReferenceProp<infer _, any, "OWNING", infer Key> 
            ? Key extends string
                ? `${K & string}${Capitalize<Key>}`
                : never
            : never
    ]: 
        TMembers[K] extends ReferenceProp<
            infer TargetModel, 
            infer Nullity,
            any,
            infer Key
        >
            ? ViewBuilder<
                TModel,
                TMembers, 
                TCurrent & (
                    Nullity extends "NONNULL"
                        ? {[P in K]: ReturnTypeOf<AllModelMembers<TargetModel>[Key & string]>}
                        : {[P in K]?: ReturnTypeOf<AllModelMembers<TargetModel>[Key & string]> | null | undefined}
                    ),
                "",
                K & string
            >
            : never
};

type NullityType<TNullity, T> =
    TNullity extends "NONNULL"
        ? T
        : {[K in keyof T]?: T[K] | null | undefined};

type Fold<
    TModel extends AnyModel, 
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
    TModel extends AnyModel, 
    TMembers, 
    TCurrent
> = {
    instanceOf<TDerivedModel extends AnyModel, X>(
        derivedModel: DerivedModel<TDerivedModel, TModel>,
        fn: (
            builder: ViewBuilder<TDerivedModel, AllModelMembers<TDerivedModel>, {}, any, "">
        ) => ViewBuilder<TDerivedModel, AllModelMembers<TDerivedModel>, X, any, any>
    ): ViewBuilder<
        TModel, 
        TMembers, 
        (
            TCurrent extends { __typename: any }
                ? TCurrent
                : { __typename: ModelName<TModel> } & TCurrent
        ) | (
            { __typename: ModelName<TDerivedModel>} & 
            Omit<TCurrent, "__typename"> & 
            X
        ), 
        any, 
        ""
    >;
};

type DerivedModel<
    TDerivedModel extends AnyModel,
    TSuperModel extends AnyModel
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

type PrefixType<TPrefix extends string, T> = 
    TPrefix extends "" 
        ? T 
        : {[K in keyof T & string as `${TPrefix}${Capitalize<K>}`]: T[K]};