import { AllModelMembers, AnyModel, Extends, IsDerivedModelOf, ModelName, ModelSuperNames, OrderedKeys } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityOf, ReferenceProp, DirectTypeOf, ScalarProp, SimpleDataTypeOf, NullityType, AssociatedProp } from "@/schema/prop";
import { Prettify, UnionToIntersection } from "@/utils";

export const dto = {
    view<TModel extends AnyModel, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, AllModelMembers<TModel>, {}, {}, any, any>
        ) => ViewBuilder<TModel, AllModelMembers<TModel>, X, any, any, any>
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
    TRecursiveKindMap extends RecursiveKindMap,
    TLastProp, 
    TLastName extends string
> = {
    [K in keyof TMembers]:
        TMembers[K] extends ScalarProp<infer R, infer Nullity>
            ? ViewBuilder<
                TModel,
                TMembers, 
                TransformedType<TCurrent, XTypeOfView<K, R, Nullity>, TRecursiveKindMap>,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : TMembers[K] extends ReferenceProp<infer R, infer Nullity, any, any>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, AllModelMembers<R>, {}, {}, any, any>
                ) => ViewBuilder<R, AllModelMembers<R>, X, any, any, any>
            ) => ViewBuilder<
                TModel,
                TMembers,
                TransformedType<TCurrent, XTypeOfView<K, R, Nullity>, TRecursiveKindMap>,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : TMembers[K] extends CollectionProp<infer R>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, AllModelMembers<R>, {}, {}, any, any>
                ) => ViewBuilder<R, AllModelMembers<R>, X, any, any, any>
            ) => ViewBuilder<
                TModel,
                TMembers,
                TransformedType<TCurrent, XTypeOfView<K, X[], "NONNULL">, TRecursiveKindMap>,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
            ? <X>(
                fn: (
                    builder: ViewBuilder<never, R, {}, {}, any, any>
                ) => ViewBuilder<never, R, X, any, any, any>
            ) => ViewBuilder<
                TModel,
                TMembers,
                TransformedType<TCurrent, XTypeOfView<K, X, Nullity>, TRecursiveKindMap>,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : never
}
& AllScalars<TModel, TMembers, TCurrent, TRecursiveKindMap>
& Fold<TModel, TMembers, TCurrent, TRecursiveKindMap>
& Flat<TModel, TMembers, TCurrent, TRecursiveKindMap>
& Recursive<TModel, TMembers, TCurrent, TRecursiveKindMap>
& ReferenceKeyMembers<TModel, TMembers, TCurrent, TRecursiveKindMap>
& As<TModel, TMembers, TCurrent, TRecursiveKindMap, TLastProp, TLastName>
& InstanceOf<TModel, TMembers, TCurrent, TRecursiveKindMap>
& ReferenceFetch<TModel, TMembers, TCurrent, TRecursiveKindMap, TLastProp, TLastName> 
& CollectionOrderBy<TModel, TMembers, TCurrent, TRecursiveKindMap, TLastProp, TLastName>;

type As<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap,
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
                RecursivedType<
                    {[K in keyof TCurrent as K extends TLastName ? TNewName : K]: TCurrent[K]}, 
                    TRecursiveKindMap
                >,
                TRecursiveKindMap,
                TLastProp, 
                TNewName
            >;
        };

type ReferenceFetch<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap,
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends ReferenceProp<any, any, any, any>
        ? {
            $fetch(
                fetchType: ReferenceFetchType
            ): ViewBuilder<
                TModel, 
                TMembers, 
                TCurrent, 
                TRecursiveKindMap, 
                TLastProp, 
                TLastName
            > 
        }
        : object;

type CollectionOrderBy<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap,
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends CollectionProp<infer TItemModel>
        ? {
            $orderBy: (
                ...orders: OrderedKeys<TItemModel>[]
            ) => ViewBuilder<TModel, TMembers, TCurrent, TRecursiveKindMap, TLastProp, TLastName> 
        }
        : object;

type Flat<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
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
                        {},
                        any, 
                        any
                    >
                ) => ViewBuilder<
                    FlatTargetModel<TModel, TMembers[TName]>, 
                    FlatTargetMembers<TMembers[TName]>, 
                    X, 
                    any,
                    any, 
                    any
                >
            ): ViewBuilder<
                TModel,
                TMembers, 
                RecursivedType<
                    TCurrent & MakeTypeByNullity<NullityOf<TMembers[TName]>, PrefixType<TPrefix, X>>,
                    TRecursiveKindMap
                >, 
                TRecursiveKindMap,
                any, 
                ""
            >
        };

type FlatKeys<TMembers> = 
    keyof {
        [K in keyof TMembers]: 
            TMembers[K] extends ReferenceProp<any, any, any, any> 
                ? K
                : TMembers[K] extends EmbeddedProp<any, any>
                    ? K
                    : never
    };

type FlatTargetModel<TModel extends AnyModel, TProp> =
    TProp extends ReferenceProp<infer TargetModel, any, any, any>
        ? TargetModel
        : TModel;

type FlatTargetMembers<TProp> =
    TProp extends ReferenceProp<infer TargetModel, any, any, any>
        ? AllModelMembers<TargetModel>
        : DirectTypeOf<TProp>;

type ReferenceKeyMembers<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap
> = {
    [
        K in keyof TMembers
        as TMembers[K] extends ReferenceProp<infer _, any, "OWNING", infer Key> 
            ? Key extends string
                ? PrefixString<K & string, Key>
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
                TransformedType<
                    TCurrent, 
                    XTypeOfView<
                        PrefixString<K & string, Key & string>,
                        SimpleDataTypeOf<AllModelMembers<TargetModel>[Key & string]>,
                        Nullity
                    >,
                    TRecursiveKindMap
                >,
                TRecursiveKindMap,
                TMembers[K],
                PrefixString<K & string, Key & string>
            >
            : never
};

type AllScalars<
        TModel extends AnyModel, 
        TMembers, 
        TCurrent,
        TRecursiveKindMap extends RecursiveKindMap
    > = {
    allScalars(): ViewBuilder<
        TModel,
        TMembers,
        RecursivedType<
            TCurrent & AllScalarsType<TMembers>, 
            TRecursiveKindMap
        >,
        TRecursiveKindMap,
        undefined,
        any
    >;
};

type AllScalarsType<TMembers> = {
    [K in keyof TMembers 
        as IsPartOfAllScalars<TMembers[K], "NONNULL"> extends true 
            ? K 
            : never
    ]: SimpleDataTypeOf<TMembers[K]>
} & {
    [K in keyof TMembers
        as IsPartOfAllScalars<TMembers[K], "NULLABLE" | "INPUT_NONNULL"> extends true 
            ? K 
            : never
    ]?: SimpleDataTypeOf<TMembers[K]> | null | undefined
}

type IsPartOfAllScalars<TProp, TNullity extends NullityType> =
    TProp extends ScalarProp<any, TNullity>
            ? true
        : TProp extends EmbeddedProp<any, TNullity>
            ? true
        : false;

type MakeTypeByNullity<TNullity, T> =
    TNullity extends "NONNULL"
        ? T
        : {[K in keyof T]?: T[K] | null | undefined};

type Fold<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = {
    fold<TName extends string, X>(
        name: TName,
        fn: (
            builder: ViewBuilder<TModel, TMembers, {}, {}, any, "">
        ) => ViewBuilder<TModel, TMembers, X, any, any, any>
    ): ViewBuilder<
        TModel, 
        TMembers, 
        TransformedType<
            TCurrent, XTypeOfView<TName, X, "NONNULL">, 
            TRecursiveKindMap
        >, 
        TRecursiveKindMap,
        any, 
        ""
    >;
};

type InstanceOf<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = {
    instanceOf<TDerivedModel extends AnyModel, X>(
        derivedModel: DerivedModel<TDerivedModel, TModel>,
        fn: (
            builder: ViewBuilder<TDerivedModel, AllModelMembers<TDerivedModel>, {}, {}, any, "">
        ) => ViewBuilder<TDerivedModel, AllModelMembers<TDerivedModel>, X, any, any, any>
    ): ViewBuilder<
        TModel, 
        TMembers, 
        RecursivedType<
            DerivedFields<TDerivedModel, TModel, X, TCurrent>,
            TRecursiveKindMap
        >, 
        TRecursiveKindMap,
        any, 
        ""
    >;
};

type DerivedModel<
    TDerivedModel extends AnyModel,
    TSuperModel extends AnyModel
> = IsDerivedModelOf<TDerivedModel, TSuperModel> extends true
    ? TDerivedModel :
    never;

type DerivedFields<
    TDerivedModel extends AnyModel,
    TModel extends AnyModel,
    X,
    TCurrent
> = ( 
    [X] extends [{__typename: string}]
        ? X
            & SuperFields<
                TCurrent, 
                ModelSuperNames<TDerivedModel>
            >
        : { __typename: ModelName<TDerivedModel> } 
            & X
            & SuperFields<
                TCurrent, 
                ModelSuperNames<TDerivedModel>
            >
) | (
    [TCurrent] extends [{__typename: string}]
        ? TCurrent
        : { __typename: ModelName<TModel> } & TCurrent
);

type SuperFields<
    TPrevData,
    TTypeNames extends string
> = [TPrevData] extends [{ __typename: string }]
    ? UnionToIntersection<
        ExtractSuperFields<TPrevData, TTypeNames>
    >
    : TPrevData;

type ExtractSuperFields<
    TPrevData,
    TTypeNames extends string,
> = TTypeNames extends any
    ? ExtractByTypeName<TPrevData, TTypeNames> extends infer ST
        ? ST extends { __typename: string }
            ? Omit<ST, "__typename">
            : never
        : never
    : never;

type ExtractByTypeName<TUnion, TTypeNames> = 
    TUnion extends { __typename: TTypeNames } 
        ? TUnion 
        : never;

export type ReferenceFetchType = "LOAD" | "JOIN";

type PrefixString<TPrefix extends string, T extends string> =
    `${TPrefix}${Capitalize<T>}`;

type PrefixType<TPrefix extends string, T> = 
    TPrefix extends "" 
        ? T 
        : {[K in keyof T & string as PrefixString<TPrefix, K>]: T[K]};

type Recursive<
    TModel extends AnyModel, 
    TMembers, 
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap
> =
    RecursiveKeys<TModel, TMembers> extends never
        ? object
        : {
            recursive<
                TPropName extends RecursiveKeys<TModel, TMembers>,
                TAlias extends string = TPropName,
                TDepth extends number = -1
            >(
                options: TPropName | {
                    prop: TPropName,
                    alias?: TAlias,
                    depth?: TDepth
                }
            ): ViewBuilder<
                TModel,
                TMembers,
                RecursivedType<
                    TCurrent,
                    NewRecursiveKindMap<TRecursiveKindMap, TMembers, TPropName, TAlias, TDepth>
                >,
                NewRecursiveKindMap<TRecursiveKindMap, TMembers, TPropName, TAlias, TDepth>,
                undefined,
                ""
            >;
        };

type RecursiveKeys<TModel extends AnyModel, TMembers> = 
    keyof {
        [K in keyof TMembers
            as IsRecursiveProp<TModel, TMembers[K]> extends true
                ? K & string
                : never
        ]: K
    };

type IsRecursiveProp<TModel extends AnyModel, TProp> =
    TProp extends AssociatedProp<infer TargetModel, any, any>
        ? Extends<TModel, TargetModel> extends true
            ? true
            : false
        : false;

type TransformedType<
    TCurrent, 
    TXType,
    TRecursiveKindMap extends RecursiveKindMap
> = RecursivedType<
    TXType extends never
        ? TCurrent
        : TCurrent & TXType,
    TRecursiveKindMap
>;

type NewRecursiveKindMap<
    TRecursiveKindMap extends RecursiveKindMap,
    TMembers,
    TPropName extends keyof TMembers,
    TAlias extends string,
    TDepth extends number
> = TRecursiveKindMap & { 
    [P in TAlias]: TMembers[TPropName] extends CollectionProp<any>
            ? TDepth extends -1
                ? "COLLECTION"
                : "NULLABLE_COLLECTION"
            : "REFERENCE"
    }

type RecursivedType<
    T,
    TRecursiveKindMap extends RecursiveKindMap
> = {} extends TRecursiveKindMap 
    ? T
    : RecursivingType<
        Omit<T, keyof TRecursiveKindMap>, 
        TRecursiveKindMap
    >;

type RecursivingType<
    TCore,
    TRecursiveKindMap extends RecursiveKindMap
> = 
    TCore
    & {
        [K in keyof TRecursiveKindMap
            as TRecursiveKindMap[K] extends "REFERENCE"
                ? K
                : never
        ]?: RecursivingType<TCore, Pick<TRecursiveKindMap, K>> | null | undefined;        
    } 
    & {
        [K in keyof TRecursiveKindMap
            as TRecursiveKindMap[K] extends "COLLECTION"
                ? K
                : never
        ]: RecursivingType<TCore, Pick<TRecursiveKindMap, K>>[];
    } & {
        [K in keyof TRecursiveKindMap
            as TRecursiveKindMap[K] extends "NULLABLE_COLLECTION"
                ? K
                : never
        ]?: RecursivingType<TCore, Pick<TRecursiveKindMap, K>>[] | null | undefined;          
    };

type RecursiveKindMap = { [key:string]: RecursiveKind }

type RecursiveKind = "REFERENCE" | "COLLECTION" | "NULLABLE_COLLECTION";

type XTypeOfView<K, X, TNullity extends NullityType> =
    TNullity extends "NONNULL"
        ? {[P in K & string]: X}
        : {[P in K & string]?: X | null | undefined};

export class View<TName extends string, T> {

    readonly $type: {
        view: [TName, T] | undefined
    } = {
        view: undefined
    };
}