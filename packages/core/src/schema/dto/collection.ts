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

import { EntityTable } from "@/dsl/table";
import { Predicate } from "@/dsl/expression";
import { AnyModel } from "../model";
import { __DtoBody, __DtoType, __DtoKind } from "./dto_context";
import { ModelOrder } from "../order";
import { __TargetMappings, __TargetMembersOf, __PropModelOf, __IsAllowed } from "./utils";

export type __CollectionMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> = 
    TDtoKind extends "INPUT" | "INPUT_REF"
        ? __InputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>
        : __OutputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>

export interface __CollectionMappingContract<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> {
    readonly __mappingType: "COLLECTION";
    readonly __generics?: [TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings];
}

export interface __OutputCollectionMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> extends __CollectionMappingContract<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings> {

    readonly __mappingType: "COLLECTION";
    
    as<TAlias extends string>(
        alias: TAlias
    ): __OutputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __OutputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;

    sort(
        ...orders: ReadonlyArray<ModelOrder<__PropModelOf<TModel, TMember>>>
    ): __OutputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;

    limit(
        maxRows: number
    ): __OutputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;
}

export interface __InputCollectionMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> extends __CollectionMappingContract<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings> {
    
    as<TAlias extends string>(
        alias: TAlias
    ): __InputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __InputCollectionMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings>;
}

export type __CollectionDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __CollectionMappingContract<any, infer Declaring, any, any, infer Alias, any, infer Mappings>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? {
                [K in Alias]: Array<__DtoType<Mappings, undefined>>
            }
            : never
        : never