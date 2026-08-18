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

import { __Extends, __IsDerivedModelOf, __ModelName } from "../model_internal_types";
import { __AssociatedPropContract, __CollectionPropContract } from "../prop_internal_types";
import { __DtoKind, __DtoMapping } from "./dto_context";
import { EntityTable } from "@/dsl/table";
import { Predicate } from "@/dsl/expression";
import { __WithNullity } from "./utils";
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
        ? __CollectionRecursiveMapping<TModel, TDtoKind, TKey, false>
        : __ReferenceRecursiveMapping<TModel, TDtoKind, TKey>;
}

export type __RecursiveMapping<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TKey extends string,
> = 
    __ReferenceRecursiveMapping<TModel, TDtoKind, TKey>
    | __CollectionRecursiveMapping<TModel, TDtoKind, TKey, any>;

export interface __ReferenceRecursiveMapping<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TKey extends string,
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "REFERENCE";

    as<TAlias extends string>(
        alias: TAlias
    ): __ReferenceRecursiveMapping<TModel, TDtoKind, TAlias>;

    depth(
        depth: number
    ): __ReferenceRecursiveMapping<TModel, TDtoKind, TKey>;

    filter(
        filter: (table: EntityTable<TModel>) => Predicate | undefined
    ): __ReferenceRecursiveMapping<TModel, TDtoKind, TKey>;
}

export interface __CollectionRecursiveMapping<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TKey extends string,
    THasDepth extends boolean
> {
    readonly __mappingType: "RECURSIVE";
    readonly __recursiveType: "COLLECTION";

    as<TAlias extends string>(
        alias: TAlias
    ): __CollectionRecursiveMapping<TModel, TDtoKind, TAlias, THasDepth>;

    depth(
        depth: number
    ): __CollectionRecursiveMapping<TModel, TDtoKind, TKey, true>;

    filter(
        filter: (table: EntityTable<TModel>) => Predicate | undefined
    ): __CollectionRecursiveMapping<TModel, TDtoKind, TKey, THasDepth>;

    sort(
        ...orders: ReadonlyArray<ModelOrder<TModel>>
    ): __CollectionRecursiveMapping<TModel, TDtoKind, TKey, THasDepth>;
    
    limit(
        maxRows: number
    ): __CollectionRecursiveMapping<TModel, TDtoKind, TKey, THasDepth>;
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

export type ApplyRecursiveMappings<
    TPrevData,
    TMappings extends ReadonlyArray<__DtoMapping<any>>
> = 
    TPrevData 
    & __WithRecursiveMappings<TPrevData, TMappings>;

export type __WithRecursiveMappings<
    TPrevData,
    TMappings extends ReadonlyArray<__DtoMapping<any>>
> = 
    TMappings extends readonly [infer First, ...infer Rest extends ReadonlyArray<__DtoMapping<any>>]
        ? (
            First extends __ReferenceRecursiveMapping<any, infer DtoKind, infer Key>
                ? __WithRecursiveReference<TPrevData, DtoKind, Key>
                    & __WithRecursiveMappings<TPrevData, Rest>
            : First extends __CollectionRecursiveMapping<any, infer DtoKind, infer Key, infer HasDepth>
                ? __WithRecursiveCollection<TPrevData, DtoKind, Key, HasDepth>
                    & __WithRecursiveMappings<TPrevData, Rest>
            : __WithRecursiveMappings<TPrevData, Rest>
        )
        : object;

export type __WithRecursiveReference<
    TPrevData,
    TDtoKind extends __DtoKind,
    TKey extends string
> =
    {
        [K in TKey]: __WithNullity<
            TPrevData & __WithRecursiveReference<TPrevData, TDtoKind, K>,
            "NULLABLE",
            TDtoKind
        >
    };

export type __WithRecursiveCollection<
    TPrevData,
    TDtoKind extends __DtoKind,
    TKey extends string,
    THasDepth
> =
    {
        [K in TKey]: 
            THasDepth extends true 
                ?
                __WithNullity<
                    Array<
                        TPrevData & __WithRecursiveCollection<TPrevData, TDtoKind, K, THasDepth>
                    >,
                    "NULLABLE",
                    TDtoKind
                >
                : Array<
                    TPrevData & __WithRecursiveCollection<TPrevData, TDtoKind, K, THasDepth>
                >
    };
