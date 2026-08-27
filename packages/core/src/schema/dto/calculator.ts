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

import { AnyModel } from "../model";
import { __DeclaringModelName } from "../model_internal_types";
import { 
    __NullityType, 
    __ParameterizedCalculatedCollectionPropContract, 
    __ParameterizedCalculatedReferencePropContract, 
    __ParameterizedCalculatedValuePropContract 
} from "../prop_internal_types";
import { __DtoBody, __DtoKind, __DtoType } from "./dto_context";
import { __ScalarLikeMapping } from "./scalar_like";
import { __DefaultTargetMappings, __TargetMappings, __TargetMembersOf, __PropModelOf, __WithNullity, __IsAllowed } from "./utils";

export type __ParameterizedContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers
> = 
    TDtoKind extends "INPUT"
        ? object
        : __ParameterizedContextImpl<
            TModel,
            TDtoKind,
            TMembers,
            __ParameterMap<TMembers>
        >;

export interface __ParameterizedContextImpl<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers,
    TParameterMap
> {
    $parameterized<
        TKey extends keyof TParameterMap
    >(
        key: TKey,
        parameter: TParameterMap[TKey]
    ): TMembers[TKey & keyof TMembers] extends __ParameterizedCalculatedValuePropContract<any, infer Value, infer Nullity>
        ? __ScalarLikeMapping<
            TModel, 
            __DeclaringModelName<TMembers[TKey & keyof TMembers]>,
            TDtoKind, 
            TKey & string, 
            Value, 
            Nullity
        >
    : TMembers[TKey & keyof TMembers] extends __ParameterizedCalculatedReferencePropContract<any, any, infer Nullity>
        ? __CalculatedReferenceMapping<
            TModel, 
            __DeclaringModelName<TMembers[TKey & keyof TMembers]>,
            TDtoKind,
            TKey & string,
            TMembers[TKey & keyof TMembers],
            __DefaultTargetMappings<TModel, TDtoKind, TMembers[TKey & keyof TMembers]>,
            Nullity
        >
    : TMembers[TKey & keyof TMembers] extends __ParameterizedCalculatedCollectionPropContract<any, any>
        ? __CalculatedCollectionMapping<
            TModel, 
            __DeclaringModelName<TMembers[TKey & keyof TMembers]>,
            TDtoKind,
            TKey & string,
            TMembers[TKey & keyof TMembers],
            __DefaultTargetMappings<TModel, TDtoKind, TMembers[TKey & keyof TMembers]>
        >
    : never;
}

export type __ParameterMap<TMembers> = {
    [
        K in keyof TMembers as 
            TMembers[K] extends __ParameterizedCalculatedValuePropContract<any, any, any>
                ? K
            : TMembers[K] extends __ParameterizedCalculatedReferencePropContract<any, any, any>
                ? K
            : TMembers[K] extends __ParameterizedCalculatedCollectionPropContract<any, any>
                ? K
            : never
    ]: TMembers[K] extends __ParameterizedCalculatedValuePropContract<infer Parameter, any, any>
            ? Parameter
        : TMembers[K] extends __ParameterizedCalculatedReferencePropContract<infer Parameter, any, any>
            ? Parameter
        : TMembers[K] extends __ParameterizedCalculatedCollectionPropContract<infer Parameter, any>
            ? Parameter
        : never
};

export interface __CalculatedReferenceMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>,
    TNullity extends __NullityType
> {

    readonly __mappingType: "CALCULATED_REFERENCE";
    
    as<TAlias extends string>(
        alias: TAlias
    ): __CalculatedReferenceMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings, TNullity>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __CalculatedReferenceMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings, TNullity>;
}

export interface __CalculatedCollectionMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> {

    readonly __mappingType: "CALCULATED_COLLECTION";
    
    as<TAlias extends string>(
        alias: TAlias
    ): __CalculatedCollectionMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __CalculatedCollectionMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>;
}

export type __CalculatedReferenceDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __CalculatedReferenceMapping<any, infer Declaring, infer DtoKind, infer Key, any, infer Mappings, infer Nullity>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? {
                [K in Key]: __WithNullity<
                    __DtoType<Mappings, undefined>,
                    Nullity,
                    DtoKind
                >
            }
            : never
        : never;

export type __CalculatedCollectionDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __CalculatedCollectionMapping<any, infer Declaring, any, infer Key, any, infer Mappings>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? {
                [K in Key]: ReadonlyArray<__DtoType<Mappings, undefined>>
            }
            : never
        : never;