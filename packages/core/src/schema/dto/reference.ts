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
import { __NullityType } from "../prop_internal_types";
import { __DtoBody, __DtoType, __DtoKind} from "./dto_context";
import { __TargetMappings, __TargetMembersOf, __PropModelOf, __WithNullity, __IsAllowed } from "./utils";
import { ReferenceFetchType } from "./api";

export interface __ReferenceMappingContract<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType
> {
    readonly __mappingType: "REFERENCE";
    readonly __generics?: [TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity];
}

export type __ReferenceMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType
> =
    TDtoKind extends "INPUT" | "INPUT_REF"
        ? __InputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>
        : __OutputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>

export interface __OutputReferenceMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType
> extends __ReferenceMappingContract<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity> {

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __OutputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __OutputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, "NULLABLE">;

    fetch(
        fetchType: ReferenceFetchType
    ): __OutputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>;
}

export interface __InputReferenceMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TPropName extends string,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType
> extends __ReferenceMappingContract<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity> {
    
    as<TAlias extends string>(
        alias: TAlias
    ): __InputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __InputReferenceMapping<TModel, TDeclaring, TDtoKind, TPropName, TAlias, TMember, TMappings, TNullity>;
}

export type __ReferenceDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __ReferenceMappingContract<any, infer Declaring, infer DtoKind, any, infer Alias, any, infer Mappings, infer Nullity>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? { 
                [K in Alias]: 
                    __WithNullity<
                        __DtoType<Mappings, undefined>,
                        Nullity,
                        DtoKind
                    >
            }
            : never
        : never;