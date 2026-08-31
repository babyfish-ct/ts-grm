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

import { Predicate } from "@/dsl/expression";
import { EntityTable } from "@/dsl/table";
import { AnyModel } from "../model";
import { __EmbeddedPropContract, __NullityOf, __NullityType, __ReferencePropContract } from "../prop_internal_types";
import { __DtoBody, __DtoType, __DtoKind } from "./dto_context";
import { __DefaultTargetMappings, __TargetMappings, __TargetMembersOf, __PropModelOf, __WithNullity, __IsAllowed } from "./utils";
import { ReferenceFetchType } from "./api";
import { __DeclaringModelName } from "../model_internal_types";

export interface __FlatContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers
> {
    $flat<
        TKey extends __FlatableKeys<TMembers>
    >(
        key: TKey
    ): TMembers[TKey] extends __ReferencePropContract<any, any, any, any, any, any>
        ? __ReferenceFlatMapping<
            TModel,
            __DeclaringModelName<TMembers[TKey]>,
            TDtoKind,
            TKey & string,
            TMembers[TKey],
            __DefaultTargetMappings<TModel, TDtoKind, TMembers[TKey]>,
            __NullityOf<TMembers[TKey]>,
            TKey & string
        >
        : __EmbeddedFlatMapping<
            TModel,
            __DeclaringModelName<TMembers[TKey]>,
            TDtoKind,
            TKey & string,
            TMembers[TKey],
            __DefaultTargetMappings<TModel, TDtoKind, TMembers[TKey]>,
            __NullityOf<TMembers[TKey]>,
            TKey & string
        >;
}

export type __FlatableKeys<TMembers> = 
    keyof {
        [
            K in keyof TMembers as
                TMembers[K] extends __ReferencePropContract<any, any, any, any, any, any>
                    ? K
                : TMembers[K] extends __EmbeddedPropContract<any, any, any>
                    ? K
                : never
        ]: never
    }

export type __FlatMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType,
    TPropName extends string,
> = 
    __EmbeddedFlatMapping<
        TModel,
        TDeclaring,
        TDtoKind,
        TKey,
        TMember,
        TMappings,
        TNullity,
        TPropName
    > 
    | __ReferenceFlatMapping<
        TModel,
        TDeclaring,
        TDtoKind,
        TKey,
        TMember,
        TMappings,
        TNullity,
        TPropName
    >


export interface __EmbeddedFlatMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType,
    TEmbeddedName extends string,
> {
    readonly __mappingType: 'FLAT';

    readonly __flatType: 'EMBEDDED';
    
    prefix<TPrefix extends string>(
        alias: TPrefix
    ): __EmbeddedFlatMapping<TModel, TDeclaring, TDtoKind, TPrefix, TMember, TMappings, TNullity, TEmbeddedName>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "EMBEDDABLE", __TargetMembersOf<TMember>, TMappings>
    ): __EmbeddedFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity, TEmbeddedName>;
}

export type __ReferenceFlatMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType,
    TAssociationName extends string
> = 
    TDtoKind extends "INPUT"
        ? __InputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity, TAssociationName>
        : __OutputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity, TAssociationName>;

export interface __OutputReferenceFlatMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType,
    TAssociationName extends string
> {
    readonly __mappingType: 'FLAT';

    readonly __flatType: 'REFERENCE';

    prefix<TPrefix extends string>(
        alias: TPrefix
    ): __OutputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TPrefix, TMember, TMappings, TNullity, TAssociationName>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __OutputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity, TAssociationName>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, "NULLABLE", TAssociationName>;

    fetch(
        fetchType: ReferenceFetchType
    ): __OutputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity, TAssociationName>;
}

export interface __InputReferenceFlatMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType,
    TAssociationName extends string
> {
    readonly __mappingType: 'FLAT';

    readonly __flatType: 'REFERENCE';

    prefix<TPrefix extends string>(
        alias: TPrefix
    ): __InputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TPrefix, TMember, TMappings, TNullity, TAssociationName>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __InputReferenceFlatMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity, TAssociationName>;
}

export type __FlatDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __FlatMapping<any, infer Declaring, infer DtoKind, infer Key, any, infer Mappings, infer Nullity, any>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? __Flat<
                __DtoType<Mappings, undefined>,
                Key,
                Nullity,
                DtoKind
            >
            : never
        : never;

export type __Flat<
    T, 
    TPrefix extends string, 
    TNullity extends __NullityType, 
    TDtoKind extends __DtoKind
> = 
    TPrefix extends ""
        ? {
            [K in keyof T]: __WithNullity<T[K], TNullity, TDtoKind>
        }
        : {
            [
                K in keyof T as
                    `${TPrefix}${Capitalize<K & string>}`
            ]: __WithNullity<T[K], TNullity, TDtoKind>
        };
