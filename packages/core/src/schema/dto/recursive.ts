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
import { __AssociatedPropContract, __CollectionPropContract, __OneToManyPropContract, __OneToOnePropContract } from "../prop_internal_types";
import { __DtoKind, __DtoMappingContract, __UnrecursiveDtoType } from "./dto_context";
import { EntityTable } from "@/dsl/table";
import { Predicate } from "@/dsl/expression";
import { __PropModelOf, __WithNullity } from "./utils";
import { ModelOrder } from "../order";
import { AnyModel } from "../model";
import { DissociateMode } from "./api";

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
            TKey, 
            TMembers[TKey],
            false
        >
        : __ReferenceRecursiveMapping<
            TModel, 
            __DeclaringModelName<TMembers[TKey]>,
            __SuperDeclaringModelNames<TMembers[TKey]>,
            TDtoKind, 
            TKey,
            TKey,
            TMembers[TKey]
        >;
}

export type __RecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember
> = 
    __ReferenceRecursiveMapping<TModel,  TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>
    | __CollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, any>;

export type __ReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember
> =
    TDtoKind extends "INPUT" | "INPUT_REF"
        ? TMember extends __OneToOnePropContract<any, any, "INVERSE", any, any, any>
            ? __InversedInputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>
            : __InputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>
        : __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>

export interface __ReferenceRecursiveMappingContract<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "REFERENCE";
    readonly __generics?: [TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember];
}

export interface __OutputReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember
> extends __ReferenceRecursiveMappingContract<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember> {

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;

    depth(
        depth: number
    ): __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;
}

export interface __InputReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember
> extends __ReferenceRecursiveMappingContract<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember> {

    as<TAlias extends string>(
        alias: TAlias
    ): __InputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;
}

export interface __InversedInputReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember
> extends __InputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember> {

    as<TAlias extends string>(
        alias: TAlias
    ): __InversedInputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;

    reparentable(
    ): __InversedInputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;

    onDissociate(
        behavior: DissociateMode
    ): __InversedInputReferenceRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember>;
}

export type __CollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    THasDepth extends boolean
> =
    TDtoKind extends "INPUT" | "INPUT_REF"
        ? TMember extends __OneToManyPropContract<any, any, any, any>
            ? __OneToManyInputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>
            : __InputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>
        : __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>; 

export interface __CollectionRecursiveMappingContract<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    THasDepth extends boolean
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "COLLECTION"; 
    readonly __generics: [TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth];
}

export interface __OutputCollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    THasDepth extends boolean
> extends __CollectionRecursiveMappingContract<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth> {

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;

    depth(
        depth: number
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, true>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;

    sort(
        ...orders: ReadonlyArray<ModelOrder<__PropModelOf<TModel, TMember>>>
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;
    
    limit(
        maxRows: number
    ): __OutputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;
}

export interface __InputCollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    THasDepth extends boolean
> extends __CollectionRecursiveMappingContract<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth> {
    
    as<TAlias extends string>(
        alias: TAlias
    ): __InputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;
}

export interface __OneToManyInputCollectionRecursiveMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TSuperDeclarings extends string | undefined,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    THasDepth extends boolean
> extends __InputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth> {

    as<TAlias extends string>(
        alias: TAlias
    ): __OneToManyInputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;

    reparentable(
    ): __OneToManyInputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;

    onDissociate(
        behavior: DissociateMode
    ): __OneToManyInputCollectionRecursiveMapping<TModel, TDeclaring, TSuperDeclarings, TDtoKind, TPropName, TAlias, TMember, THasDepth>;
}

export type __RecursiveKeys<TModel extends AnyModel, TMembers> = 
    keyof {
        [K in keyof TMembers as
            __IsRecursiveProp<TModel, TMembers[K]> extends true
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
    TMappings extends ReadonlyArray<__DtoMappingContract<any>>
> = 
    TPrevData 
    & __WithRecursiveMappings<TPrevData, TMappings, TMappings>;

export type __WithRecursiveMappings<
    TPrevData,
    TMappings extends ReadonlyArray<__DtoMappingContract<any>>,
    TOriginalMappings extends ReadonlyArray<__DtoMappingContract<any>>
> = 
    TMappings extends readonly [infer First, ...infer Rest extends ReadonlyArray<__DtoMappingContract<any>>]
        ? (
            First extends __ReferenceRecursiveMappingContract<
                any, 
                infer Declaring, 
                infer SuperDeclarings, 
                infer DtoKind, 
                any,
                infer Alias,
                any
            >
                ? __WithRecursiveReference<
                    __UnrecursiveDtoType<TOriginalMappings, Declaring | SuperDeclarings>, 
                    DtoKind, 
                    Alias
                > & __WithRecursiveMappings<TPrevData, Rest, TOriginalMappings>
            : First extends __CollectionRecursiveMappingContract<
                any, 
                infer Declaring, 
                infer SuperDeclarings, 
                infer DtoKind,
                any, 
                infer Alias, 
                any,
                infer HasDepth
            >
                ? __WithRecursiveCollection<
                    __UnrecursiveDtoType<TOriginalMappings, Declaring | SuperDeclarings>, 
                    DtoKind, 
                    Alias, 
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
            TDtoKind extends "INPUT" | "INPUT_REF"
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
