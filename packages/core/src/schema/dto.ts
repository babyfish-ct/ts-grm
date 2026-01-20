import { AtLeastOne } from "@/dsl/utils";
import { AllModelMembers, AnyModel, Extends, IsDerivedModelOf, ModelName, ModelSuperNames } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityOf, ReferenceProp, DirectTypeOf, ScalarProp, NullityType, AssociatedProp, Prop } from "@/schema/prop";
import { Prettify, UnionToIntersection } from "@/utils";
import { ModelOrder } from "./order";
import { EntityTable } from "@/dsl/table";
import { Predicate } from "@/dsl/expression";
import { createTypedDtoBuilder } from "@/impl/metadata/dto_builder";
import { Entity } from "@/impl/metadata/entity";
import { dtoMapper, DtoMapper } from "@/impl/metadata/dto_mapper";

export const dto = { view: viewCreator() };

function viewCreator(): ViewCreator {

    const view = <TModel extends AnyModel, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, AllModelMembers<TModel>, "NULL", {}, {}, any, any>
        ) => ViewBuilder<TModel, AllModelMembers<TModel>, "NULL", X, any, any, any>
    ): View<TModel, Prettify<X>> => {
        const builder = createTypedDtoBuilder(Entity.of(model));
        fn(builder as any as ViewBuilder<TModel, AllModelMembers<TModel>, "NULL", {}, {}, any, any>);
        return new View(dtoMapper(builder.__unwrap().build()));
    }

    view.nullAsUndefined = <TModel extends AnyModel, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, AllModelMembers<TModel>, "UNDEFINED", {}, {}, any, any>
        ) => ViewBuilder<TModel, AllModelMembers<TModel>, "UNDEFINED", X, any, any, any>
    ): View<TModel, Prettify<X>> => {
        const builder = createTypedDtoBuilder(Entity.of(model));
        fn(builder as any as ViewBuilder<TModel, AllModelMembers<TModel>, "NULL", {}, {}, any, any>);
        return new View(dtoMapper(builder.__unwrap().build()));
    }

    return view as ViewCreator;
}

type ViewCreator = {
    
    <TModel extends AnyModel, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, AllModelMembers<TModel>, "NULL", {}, {}, any, any>
        ) => ViewBuilder<TModel, AllModelMembers<TModel>, "NULL", X, any, any, any>
    ): View<TModel, Prettify<X>>;

    nullAsUndefined: NullAsUndefinedViewCreator;
};

type NullAsUndefinedViewCreator = {

    <TModel extends AnyModel, X>(
        model: TModel,
        fn: (
            builder: ViewBuilder<TModel, AllModelMembers<TModel>, "UNDEFINED", {}, {}, any, any>
        ) => ViewBuilder<TModel, AllModelMembers<TModel>, "UNDEFINED", X, any, any, any>
    ): View<TModel, Prettify<X>>;
}

export type ModelOf<T> =
    T extends View<infer R, any>
        ? R
        : never;

export type TypeOf<T> =
    T extends View<any, infer R>
        ? R
        : never;

export type ViewNullType = "NULL" | "UNDEFINED";

type ViewBuilder<
    TModel extends AnyModel | never,
    TMembers, 
    TViewNullType extends ViewNullType,
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
                TViewNullType,
                TransformedType<
                    TViewNullType,
                    TCurrent, 
                    XTypeOfView<K, R, Nullity, TViewNullType>, 
                    TRecursiveKindMap
                >,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : TMembers[K] extends ReferenceProp<infer R, infer Nullity, any, any>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, AllModelMembers<R>, TViewNullType, {}, {}, any, any>
                ) => ViewBuilder<R, AllModelMembers<R>, TViewNullType, X, any, any, any>
            ) => ViewBuilder<
                TModel,
                TMembers,
                TViewNullType,
                TransformedType<
                    TViewNullType,
                    TCurrent, 
                    XTypeOfView<K, X, Nullity, TViewNullType>, 
                    TRecursiveKindMap
                >,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : TMembers[K] extends CollectionProp<infer R>
            ? <X>(
                fn: (
                    builder: ViewBuilder<R, AllModelMembers<R>, TViewNullType, {}, {}, any, any>
                ) => ViewBuilder<R, AllModelMembers<R>, TViewNullType, X, any, any, any>
            ) => ViewBuilder<
                TModel,
                TMembers,
                TViewNullType,
                TransformedType<
                    TViewNullType,
                    TCurrent, 
                    XTypeOfView<K, X[], "NONNULL", TViewNullType>, 
                    TRecursiveKindMap
                >,
                TRecursiveKindMap,
                TMembers[K],
                K & string
            >
        : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
            ? EmbeddedMethods<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap, K, R, Nullity>
        : never
}
& AllScalars<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& Fold<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& Flat<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& Recursive<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& Remove<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& ReferenceKeyMembers<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& As<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap, TLastProp, TLastName>
& InstanceOf<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
& ReferenceFetch<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap, TLastProp, TLastName> 
& CollectionOrderBy<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap, TLastProp, TLastName>;

type As<
    TModel extends AnyModel, 
    TMembers, 
    TViewNullType extends ViewNullType,
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
                TViewNullType,
                RecursivedType<
                    TViewNullType,
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
    TViewNullType extends ViewNullType,
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
                TViewNullType,
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
    TViewNullType extends ViewNullType,
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap,
    TLastProp, 
    TLastName extends string
> =
    TLastProp extends CollectionProp<infer TItemModel>
        ? {
            $where(
                fn: (table: EntityTable<TItemModel>) => Predicate | null | undefined
            ): ViewBuilder<
                TModel, 
                TMembers, 
                TViewNullType,
                TCurrent, 
                TRecursiveKindMap, 
                TLastProp, 
                TLastName
            >;

            $orderBy(
                ...orders: ReadonlyArray<ModelOrder<TItemModel>>
            ): ViewBuilder<
                TModel, 
                TMembers, 
                TViewNullType,
                TCurrent, 
                TRecursiveKindMap, 
                TLastProp, 
                TLastName
            > 
        }
        : object;

type Flat<
    TModel extends AnyModel, 
    TMembers, 
    TViewNullType extends ViewNullType,
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = FlatReference<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>
    & FlatEmbedded<TModel, TMembers, TViewNullType, TCurrent, TRecursiveKindMap>;

type FlatReference<
    TModel extends AnyModel, 
    TMembers, 
    TViewNullType extends ViewNullType,
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = 
    FlatReferenceKeys<TMembers> extends never
        ? object
        : {
            flat<TName extends FlatReferenceKeys<TMembers> & string, X, TPrefix extends string = TName>(
                options: TName | { 
                    prop: TName, 
                    prefix?: TPrefix,
                    fetchType?: ReferenceFetchType
                },
                fn: (
                    builder: ViewBuilder<
                        FlatTargetModel<TModel, TMembers[TName]>, 
                        FlatTargetMembers<TMembers[TName]>, 
                        TViewNullType,
                        {}, 
                        {},
                        any, 
                        any
                    >
                ) => ViewBuilder<
                    FlatTargetModel<TModel, TMembers[TName]>, 
                    FlatTargetMembers<TMembers[TName]>, 
                    TViewNullType,
                    X, 
                    any,
                    any, 
                    any
                >
            ): ViewBuilder<
                TModel,
                TMembers, 
                TViewNullType,
                RecursivedType<
                    TViewNullType,
                    TCurrent & MakeTypeByNullity<
                        NullityOf<TMembers[TName]>, 
                        TViewNullType, 
                        PrefixType<TPrefix, X>
                    >,
                    TRecursiveKindMap
                >, 
                TRecursiveKindMap,
                any, 
                ""
            >
        };

type FlatEmbedded<
    TModel extends AnyModel, 
    TMembers, 
    TViewNullType extends ViewNullType,
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = 
    FlatEmbeddedKeys<TMembers> extends never
        ? object
        : {
            flat<TName extends FlatEmbeddedKeys<TMembers> & string, X, TPrefix extends string = TName>(
                options: TName | { prop: TName, prefix?: TPrefix },
                fn: (
                    builder: ViewBuilder<
                        FlatTargetModel<TModel, TMembers[TName]>, 
                        FlatTargetMembers<TMembers[TName]>, 
                        TViewNullType,
                        {}, 
                        {},
                        any, 
                        any
                    >
                ) => ViewBuilder<
                    FlatTargetModel<TModel, TMembers[TName]>, 
                    FlatTargetMembers<TMembers[TName]>, 
                    TViewNullType,
                    X, 
                    any,
                    any, 
                    any
                >
            ): ViewBuilder<
                TModel,
                TMembers, 
                TViewNullType,
                RecursivedType<
                    TViewNullType,
                    TCurrent & MakeTypeByNullity<
                        NullityOf<TMembers[TName]>, 
                        TViewNullType, 
                        PrefixType<TPrefix, X>
                    >,
                    TRecursiveKindMap
                >, 
                TRecursiveKindMap,
                any, 
                ""
            >;

            flat<TName extends FlatEmbeddedKeys<TMembers> & string, TPrefix extends string = TName>(
                options: TName | { prop: TName, prefix?: TPrefix }
            ): ViewBuilder<
                TModel,
                TMembers, 
                TViewNullType,
                RecursivedType<
                    TViewNullType,
                    TCurrent & MakeTypeByNullity<
                        NullityOf<TMembers[TName]>, 
                        TViewNullType, 
                        PrefixType<
                            TPrefix, 
                            AllScalarsType<DirectTypeOf<TMembers[TName]>, TViewNullType>
                        >
                    >,
                    TRecursiveKindMap
                >, 
                TRecursiveKindMap,
                any, 
                ""
            >;
        };

type FlatReferenceKeys<TMembers> = 
    keyof {
        [K in keyof TMembers
            as TMembers[K] extends ReferenceProp<any, any, any, any> 
                ? K
                : never
        ]: number
    };

type FlatEmbeddedKeys<TMembers> = 
    keyof {
        [K in keyof TMembers
            as TMembers[K] extends EmbeddedProp<any, any>
                ? K
                : never
        ]: number
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
    TViewNullType extends ViewNullType,
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
                TViewNullType,
                TransformedType<
                    TViewNullType,
                    TCurrent, 
                    XTypeOfView<
                        PrefixString<K & string, Key & string>,
                        SimpleDataTypeOf<AllModelMembers<TargetModel>[Key & string], TViewNullType>,
                        Nullity,
                        TViewNullType
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
        TViewNullType extends ViewNullType,
        TCurrent,
        TRecursiveKindMap extends RecursiveKindMap
    > = {
    allScalars(): ViewBuilder<
        TModel,
        TMembers,
        TViewNullType,
        RecursivedType<
            TViewNullType,
            TCurrent & AllScalarsType<TMembers, TViewNullType>, 
            TRecursiveKindMap
        >,
        TRecursiveKindMap,
        undefined,
        any
    >;
};

type AllScalarsType<TMembers, TViewNullType extends ViewNullType> = {
    [K in keyof TMembers 
        as IsPartOfAllScalars<TMembers[K], "NONNULL"> extends true 
            ? K 
            : never
    ]: SimpleDataTypeOf<TMembers[K], TViewNullType>
} & (
    TViewNullType extends "NULL" ? {
            [K in keyof TMembers
                as IsPartOfAllScalars<TMembers[K], "NULLABLE" | "INPUT_NONNULL"> extends true 
                    ? K 
                    : never
            ]: SimpleDataTypeOf<TMembers[K], TViewNullType> | null
        } : {
            [K in keyof TMembers
                as IsPartOfAllScalars<TMembers[K], "NULLABLE" | "INPUT_NONNULL"> extends true 
                    ? K 
                    : never
            ]?: SimpleDataTypeOf<TMembers[K], TViewNullType> | undefined
        } 
)

type IsPartOfAllScalars<TProp, TNullity extends NullityType> =
    TProp extends ScalarProp<any, TNullity>
            ? true
        : TProp extends EmbeddedProp<any, TNullity>
            ? true
        : false;

type MakeTypeByNullity<
    TNullity, 
    TViewNullType extends ViewNullType,
    T
> =
    TNullity extends "NONNULL"
        ? T
        : TViewNullType extends "NULL"
            ? {[K in keyof T]: T[K] | null}
            : {[K in keyof T]?: T[K] | undefined};

type Fold<
    TModel extends AnyModel, 
    TMembers, 
    TViewNullType extends ViewNullType,
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = {
    fold<TName extends string, X>(
        name: TName,
        fn: (
            builder: ViewBuilder<TModel, TMembers, TViewNullType, {}, {}, any, "">
        ) => ViewBuilder<TModel, TMembers, TViewNullType, X, any, any, any>
    ): ViewBuilder<
        TModel, 
        TMembers, 
        TViewNullType,
        TransformedType<
            TViewNullType,
            TCurrent, XTypeOfView<TName, X, "NONNULL", TViewNullType>, 
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
    TViewNullType extends ViewNullType,
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = {
    instanceOf<TDerivedModel extends AnyModel, X>(
        derivedModel: DerivedModel<TDerivedModel, TModel>,
        fn: (
            builder: ViewBuilder<
                TDerivedModel, 
                AllModelMembers<TDerivedModel>, 
                TViewNullType,
                {}, 
                {}, 
                any, 
                ""
            >
        ) => ViewBuilder<
            TDerivedModel, 
            AllModelMembers<TDerivedModel>, 
            TViewNullType, 
            X, 
            any, 
            any, 
            any
        >
    ): ViewBuilder<
        TModel, 
        TMembers, 
        TViewNullType,
        RecursivedType<
            TViewNullType,
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
    TViewNullType extends ViewNullType,
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
                TViewNullType,
                RecursivedType<
                    TViewNullType,
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
    TViewNullType extends ViewNullType,
    TCurrent, 
    TXType,
    TRecursiveKindMap extends RecursiveKindMap
> = RecursivedType<
    TViewNullType,
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
                : "UNDEFINED_COLLECTION"
            : "REFERENCE"
    }

type RecursivedType<
    TViewNullType extends ViewNullType,
    T,
    TRecursiveKindMap extends RecursiveKindMap
> = {} extends TRecursiveKindMap 
    ? T
    : RecursivingType<
        TViewNullType,
        Omit<T, keyof TRecursiveKindMap>, 
        TRecursiveKindMap
    >;

type RecursivingType<
    TViewNullType extends ViewNullType,
    TCore,
    TRecursiveKindMap extends RecursiveKindMap
> = 
    TCore
    & (
        TViewNullType extends "NULL"
            ? {
                [K in keyof TRecursiveKindMap
                    as TRecursiveKindMap[K] extends "REFERENCE"
                        ? K
                        : never
                ]: RecursivingType<TViewNullType, TCore, Pick<TRecursiveKindMap, K>> | null;        
            } : {
                [K in keyof TRecursiveKindMap
                    as TRecursiveKindMap[K] extends "REFERENCE"
                        ? K
                        : never
                ]?: RecursivingType<TViewNullType, TCore, Pick<TRecursiveKindMap, K>> | undefined;        
            }
    ) 
    & {
        [K in keyof TRecursiveKindMap
            as TRecursiveKindMap[K] extends "COLLECTION"
                ? K
                : never
        ]: RecursivingType<TViewNullType, TCore, Pick<TRecursiveKindMap, K>>[];
    } & {
        [K in keyof TRecursiveKindMap
            as TRecursiveKindMap[K] extends "UNDEFINED_COLLECTION"
                ? K
                : never
        ]?: RecursivingType<TViewNullType, TCore, Pick<TRecursiveKindMap, K>>[] | undefined;          
    };

type RecursiveKindMap = { [key:string]: RecursiveKind }

type RecursiveKind = "REFERENCE" | "COLLECTION" | "UNDEFINED_COLLECTION";

type XTypeOfView<K, X, TNullity extends NullityType, TViewNullType extends ViewNullType> =
    TNullity extends "NONNULL"
        ? {[P in K & string]: X}
        : TViewNullType extends "NULL"
            ? {[P in K & string]: X | null}
            : {[P in K & string]?: X | undefined};

type Remove<
    TModel extends AnyModel,
    TMembers,
    TViewNullType extends ViewNullType,
    TCurrent,
    TRecursiveKindMap extends RecursiveKindMap
> = {
    remove<TNames extends AtLeastOne<keyof TCurrent>>(
        ...names: TNames
    ): ViewBuilder<
        TModel,
        TMembers,
        TViewNullType,
        RecursivedType<
            TViewNullType, 
            Omit<TCurrent, TNames[number]>, 
            TRecursiveKindMap
        >,
        TRecursiveKindMap,
        undefined,
        ""
    >;
};

interface EmbeddedMethods<
    TModel extends AnyModel, 
    TMembers, 
    TViewNullType extends ViewNullType,
    TCurrent, 
    TRecursiveKindMap extends RecursiveKindMap, 
    TK extends keyof TMembers, 
    TR, 
    TNullity extends NullityType
> {
    
    /**
     * Fetch all fields of embedded property
     */
    (): ViewBuilder<
        TModel,
        TMembers,
        TViewNullType,
        TransformedType<
            TViewNullType,
            TCurrent, 
            XTypeOfView<TK, EmbeddedDataType<TR, TViewNullType>, TNullity, TViewNullType>, 
            TRecursiveKindMap
        >,
        TRecursiveKindMap,
        TMembers[TK],
        TK & string
    >;

    /**
     * Fetch some fields of embeded property
     */
    <X>(
        fn: (
            builder: ViewBuilder<never, TR, TViewNullType, {}, {}, any, any>
        ) => ViewBuilder<never, TR, TViewNullType, X, any, any, any>
    ): ViewBuilder<
        TModel,
        TMembers,
        TViewNullType,
        TransformedType<
            TViewNullType,
            TCurrent, 
            XTypeOfView<TK, X, TNullity, TViewNullType>, 
            TRecursiveKindMap
        >,
        TRecursiveKindMap,
        TMembers[TK],
        TK & string
    >;
}

export type SimpleDataTypeOf<TProp, TViewNullType extends ViewNullType> =
    TProp extends ScalarProp<infer R, any>
        ? R
    : TProp extends EmbeddedProp<infer R, any>
        ? EmbeddedDataType<R, TViewNullType>
    : TProp extends ReferenceProp<infer TargetModel, any, "OWNING", infer Key>
        ? {
            [
                K in keyof Key
                    as AllModelMembers<TargetModel>[K & string] extends Prop<any, "NONNULL">
                        ? K 
                        : never
            ]: SimpleDataTypeOf<AllModelMembers<TargetModel>[K], TViewNullType>
        } & (
            TViewNullType extends "NULL" 
                ? {
                    [
                        K in keyof Key
                            as AllModelMembers<TargetModel>[K & string] extends Prop<any, "NONNULL">
                                ? K 
                                : never
                    ]: SimpleDataTypeOf<AllModelMembers<TargetModel>[K], TViewNullType> | null
                } : {
                    [
                        K in keyof Key
                            as AllModelMembers<TargetModel>[K & string] extends Prop<any, "NONNULL">
                                ? K 
                                : never
                    ]?: SimpleDataTypeOf<AllModelMembers<TargetModel>[K], TViewNullType> | undefined
                } 
        )
    : never;

export type EmbeddedDataType<T, TViewNullType extends ViewNullType> =
    {
        [
            K in keyof T
                as T[K] extends Prop<any, "NONNULL">
                    ? K 
                    : never
        ]: SimpleDataTypeOf<T[K], TViewNullType>
    } & (
        TViewNullType extends "NULL"
            ? {
                [
                    K in keyof T
                        as T[K] extends Prop<any, "NULLABLE" | "INPUT_NONNULL">
                            ? K 
                            : never
                ]: SimpleDataTypeOf<T[K], TViewNullType> | null
            } : {
                [
                    K in keyof T
                        as T[K] extends Prop<any, "NULLABLE" | "INPUT_NONNULL">
                            ? K 
                            : never
                ]?: SimpleDataTypeOf<T[K], TViewNullType> | undefined
            }
    );

export class View<TModel extends AnyModel, T> {

    readonly $type: {
        view: [TModel, T] | undefined
    } = {
        view: undefined
    };

    constructor(readonly mapper: DtoMapper) {}
}
