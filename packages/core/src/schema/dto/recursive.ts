/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { __DeclaringModelName, __Extends, __IsDerivedModelOf, __ModelName, __SuperDeclaringModelNames } from "../model_internal_types";
import { __AssociatedPropContract, __CollectionPropContract } from "../prop_internal_types";
import { __DtoKind, __DtoMapping, __UnrecursiveDtoType } from "./dto_context";
import { EntityTable } from "@/dsl/table";
import { Predicate } from "@/dsl/expression";
import { __PropModelOf, __WithNullity } from "./utils";
import { ModelOrder } from "../order";
import { AnyModel } from "../model";

export interface __RecursiveContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers
> {

    $recursive<
        TKey extends __RecursiveKeys<TModel, TMembers>
    >(
        key: TKey
    ): TMembers[TKey] extends __CollectionPropContract<any, any, any, any, any>
        ? __CollectionRecursiveMapping<
            TModel, 
            __DeclaringModelName<TMembers[TKey]>,
            __SuperDeclaringModelNames<TMembers[TKey]>,
            TDtoKind, 
            TKey, 
            TMembers[TKey],
            false,
            TKey
        >
        : __ReferenceRecursiveMapping<
            TModel, 
            __DeclaringModelName<TMembers[TKey]>,
            __SuperDeclaringModelNames<TMembers[TKey]>,
            TDtoKind, 
            TKey,
            TMembers[TKey],
            TKey
        >;
}

export type __RecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TAssociationName extends string
> = 
    __ReferenceRecursiveMapping<TModel,  TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, TAssociationName>
    | __CollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, any, TAssociationName>;

export type __ReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TAssociationName extends string
> =
    TDtoKind extends "INPUT"
        ? __InputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, TAssociationName>
        : __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, TAssociationName>

export interface __OutputReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TAssociationName extends string
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "REFERENCE";

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TAlias, TMember, TAssociationName>;

    depth(
        depth: number
    ): __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, TAssociationName>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, TAssociationName>;
}

export interface __InputReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TAssociationName extends string
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "REFERENCE";
    readonly __key?: TKey;

    as<TAlias extends string>(
        alias: TAlias
    ): __InputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TAlias, TMember, TAssociationName>;
}

export type __CollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    THasDepth extends boolean,
    TAssociationName extends string
> =
    TDtoKind extends "INPUT"
        ? __InputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, THasDepth, TAssociationName>
        : __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, THasDepth, TAssociationName>; 

export interface __OutputCollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    THasDepth extends boolean,
    TAssociationName extends string
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "COLLECTION";

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TAlias, TMember, THasDepth, TAssociationName>;

    depth(
        depth: number
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, true, TAssociationName>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, THasDepth, TAssociationName>;

    sort(
        ...orders: ReadonlyArray<ModelOrder<__PropModelOf<TModel, TMember>>>
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, THasDepth, TAssociationName>;
    
    limit(
        maxRows: number
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TKey, TMember, THasDepth, TAssociationName>;
}

export interface __InputCollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    THasDepth extends boolean,
    TAssociationName extends string
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "COLLECTION";
    readonly __key?: TKey;

    as<TAlias extends string>(
        alias: TAlias
    ): __InputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TAlias, TMember, THasDepth, TAssociationName>;
}

export type __RecursiveKeys<TModel extends AnyModel, TMembers> = 
    keyof {
        [K in keyof TMembers
            as __IsRecursiveProp<TModel, TMembers[K]> extends true
                ? K & string
                : never
        ]: never
    };

export type __IsRecursiveProp<TModel extends AnyModel, TProp> =
    TProp extends __AssociatedPropContract<infer TargetModel, any, any, any, any, any>
        ? __Extends<TModel, TargetModel> extends true
            ? true
            : false
        : false;

export type __ApplyRecursiveMappings<
    TPrevData,
    TMappings extends ReadonlyArray<__DtoMapping<any>>
> = 
    TPrevData 
    & __WithRecursiveMappings<TPrevData, TMappings, TMappings>;

export type __WithRecursiveMappings<
    TPrevData,
    TMappings extends ReadonlyArray<__DtoMapping<any>>,
    TOriginalMappings extends ReadonlyArray<__DtoMapping<any>>
> = 
    TMappings extends readonly [infer First, ...infer Rest extends ReadonlyArray<__DtoMapping<any>>]
        ? (
            First extends __ReferenceRecursiveMapping<
                any, 
                infer Declaring, 
                infer SuperDeclarings, 
                infer DtoKind, 
                infer Key,
                any,
                any
            >
                ? __WithRecursiveReference<
                    __UnrecursiveDtoType<TOriginalMappings, Declaring | SuperDeclarings>, 
                    DtoKind, 
                    Key
                > & __WithRecursiveMappings<TPrevData, Rest, TOriginalMappings>
            : First extends __CollectionRecursiveMapping<
                any, 
                infer Declaring, 
                infer SuperDeclarings, 
                infer DtoKind, 
                infer Key, 
                any,
                infer HasDepth,
                any
            >
                ? __WithRecursiveCollection<
                    __UnrecursiveDtoType<TOriginalMappings, Declaring | SuperDeclarings>, 
                    DtoKind, 
                    Key, 
                    HasDepth
                > & __WithRecursiveMappings<TPrevData, Rest, TOriginalMappings>
            : __WithRecursiveMappings<TPrevData, Rest, TOriginalMappings>
        )
        : object;

export type __WithRecursiveReference<
    TRecursiveBodyType,
    TDtoKind extends __DtoKind,
    TKey extends string
> =
    {
        [K in TKey]: __WithNullity<
            TRecursiveBodyType & __WithRecursiveReference<TRecursiveBodyType, TDtoKind, K>,
            "NULLABLE",
            TDtoKind
        >
    };

export type __WithRecursiveCollection<
    TRecursiveBodyType,
    TDtoKind extends __DtoKind,
    TKey extends string,
    THasDepth
> =
    {
        [K in TKey]: 
            TDtoKind extends "INPUT"
                ? __WithNullity<
                    Array<
                        TRecursiveBodyType & __WithRecursiveCollection<TRecursiveBodyType, TDtoKind, K, THasDepth>
                    >,
                    "NULLABLE",
                    TDtoKind
                >
            : THasDepth extends true 
                ? __WithNullity<
                    Array<
                        TRecursiveBodyType & __WithRecursiveCollection<TRecursiveBodyType, TDtoKind, K, THasDepth>
                    >,
                    "NULLABLE",
                    TDtoKind
                >
            : Array<
                TRecursiveBodyType & __WithRecursiveCollection<TRecursiveBodyType, TDtoKind, K, THasDepth>
            >;
    };
