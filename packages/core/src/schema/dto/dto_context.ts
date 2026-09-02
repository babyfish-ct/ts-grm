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

import { __UnionToIntersection } from "@/auxiliary_types";
import { AnyModel } from "../model";
import { __AllScalarsContext, __AllScalarsDtoType, __AllScalarsMapping, __AllScalarsMappingContract } from "./all_scalars";
import { __AssociatedKeysContext, __AssociatedKeysDtoType, __AssociatedKeysMapping, __AssociatedKeysMappingContract } from "./associated_keys";
import { __CollectionDtoType, __CollectionMappingContract } from "./collection";
import { __EmbeddedDtoType, __EmbeddedMapping, __EmbeddedMappingContract } from "./embedded";
import { __FlatContext, __FlatDtoType, __FlatMapping, __FlatMappingContract, __InputReferenceFlatMapping } from "./flat";
import { __FoldContext, __FoldDtoType, __FoldMappingContract } from "./fold";
import { __InputReferenceMapping, __ReferenceDtoType, __ReferenceMapping, __ReferenceMappingContract } from "./reference";
import { __ReferenceKeyContext, __ReferenceKeyDtoType, __ReferenceKeyMapping, __ReferenceKeyMappingContract } from "./reference_key";
import { __ScalarLikeDtoType, __ScalarLikeMapping, __ScalarLikeMappingContract } from "./scalar_like";
import { __DirectContext } from "./direct";
import { __ApplyInstanceOfMappings, __InstanceOfContext, __InstanceOfMapppingContract } from "./instance_of";
import { __ApplyRecursiveMappings, __CollectionRecursiveMappingContract, __InputCollectionRecursiveMapping, __InputReferenceRecursiveMapping, __RecursiveContext, __RecursiveMapping, __ReferenceRecursiveMappingContract } from "./recursive";
import { __CalculatedCollectionDtoType, __CalculatedCollectionMapping, __CalculatedCollectionMappingContract, __CalculatedReferenceDtoType, __CalculatedReferenceMapping, __CalculatedReferenceMappingContract, __ParameterizedContext } from "./calculator";
import { __FormulaContext } from "./formula";
import { __RefContext } from "./ref";

export type __DtoContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers
> = 
    __DirectContext<TModel, TDtoKind, TMembers>
    & __FoldContext<TModel, TDtoKind, TContextKind, TMembers>
    & __FlatContext<TModel, TDtoKind, TMembers>
    & (
        TContextKind extends "EMBEDDABLE"
            ? object
            : __ParameterizedContext<TModel, TDtoKind, TMembers>
    )
    & (
        TContextKind extends "EMBEDDABLE"
            ? object
            : __InstanceOfContext<TModel, TDtoKind>
    )
    & (
        TContextKind extends "EMBEDDABLE"
            ? object
            : __RecursiveContext<TModel, TDtoKind, TMembers>
    )
    & (
        TContextKind extends "EMBEDDABLE"
            ? object
            : __ReferenceKeyContext<TModel, TDtoKind, TMembers>
    )
    & (
        TContextKind extends "EMBEDDABLE"
            ? object
            : __AssociatedKeysContext<TModel, TDtoKind, TMembers>
    )
    & (
        TContextKind extends "DERIVED_ENTITY"
            ? object
            : __AllScalarsContext<TModel, TDtoKind, TMembers>
    )
    & (
        TContextKind extends "EMBEDDABLE"
            ? object
            : __FormulaContext<TModel, TDtoKind, "ENTITY", TMembers>
    )
    & (
        TDtoKind extends "INPUT"
            ? __RefContext<TModel, TMembers>
            : object
    );

export type __ContextKind = "ENTITY" | "EMBEDDABLE" | "DERIVED_ENTITY";

export type __DtoKind = "NULL_VIEW" | "UNDEFINED_VIEW" | "INPUT" | "INPUT_REF";

export interface __DtoBody<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers,
    TMappings extends ReadonlyArray<__DtoMappingContract<TModel>>
> {

    (
        ctx: __DtoContext<TModel, TDtoKind, TContextKind, TMembers>
    ): TMappings;
}

export type __DtoMappingContract<
    TModel extends AnyModel
> = 
    __AllScalarsMappingContract<TModel, any, any, any> 
    | __FoldMappingContract<TModel, any, any, any>
    | __FlatMappingContract<TModel, any, any, any, any, any, any, any>
    | __InstanceOfMapppingContract<TModel, any, any, any, any>
    | __ReferenceRecursiveMappingContract<TModel, any, any, any, any, any, any>
    | __CollectionRecursiveMappingContract<TModel, any, any, any, any, any, any, any>
    | __ScalarLikeMappingContract<TModel, any, any, any, any, any>
    | __EmbeddedMappingContract<TModel, any, any, any, any, any>
    | __ReferenceKeyMappingContract<TModel, any, any, any, any>
    | __AssociatedKeysMappingContract<TModel, any, any, any, any>
    | __ReferenceMappingContract<TModel, any, any, any, any, any, any, any>
    | __CollectionMappingContract<TModel, any, any, any, any, any, any>
    | __CalculatedReferenceMappingContract<TModel, any, any, any, any, any, any>
    | __CalculatedCollectionMappingContract<TModel, any, any, any, any, any>;

export type __DtoType<
    TMappings extends ReadonlyArray<__DtoMappingContract<any>>,
    TAllowedDeclarings extends string | undefined
> = 
    __ApplyRecursiveMappings<
        __UnrecursiveDtoType<TMappings, TAllowedDeclarings>,
        TMappings
    >;

export type __UnrecursiveDtoType<
    TMappings extends ReadonlyArray<__DtoMappingContract<any>>,
    TAllowedDeclarings extends string | undefined
> = 
    __ApplyInstanceOfMappings<
        __UnionToIntersection<{
            [K in keyof TMappings]: __DtoMappingType<TMappings[K], TAllowedDeclarings>
        }[number]>,
        TMappings
    >;
    
export type __DtoMappingType<
    TMapping extends __DtoMappingContract<any>,
    TAllowedDeclarings extends string | undefined
> =
    TMapping["__mappingType"] extends "SCALAR_LIKE"
        ? __ScalarLikeDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "ALL_SCALARS"
        ? __AllScalarsDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "EMBEDDED"
        ? __EmbeddedDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "REFERENCE"
        ? __ReferenceDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "COLLECTION"
        ? __CollectionDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "REFERENCE_KEY"
        ? __ReferenceKeyDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "ASSOCIATED_KEYS"
        ? __AssociatedKeysDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "FOLD"
        ? __FoldDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "FLAT"
        ? __FlatDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "CALCULATED_REFERENCE"
        ? __CalculatedReferenceDtoType<TMapping, TAllowedDeclarings>
    : TMapping["__mappingType"] extends "CALCULATED_COLLECTION"
        ? __CalculatedCollectionDtoType<TMapping, TAllowedDeclarings>
    : never;

export type __AllAssociationMemberUnions<
    TMappings extends ReadonlyArray<__DtoMappingContract<any>>,
    TIngoreRecurisve extends boolean = false
> = {
    [
        K in keyof TMappings
    ]: TIngoreRecurisve extends true
        ? TMappings[K]["__mappingType"] extends "RECURSIVE"
            ? never
            : __AssociationMemberUnions<TMappings[K], TMappings>
        : __AssociationMemberUnions<TMappings[K], never>
}[number];

export type __AssociationMemberUnions<
    TMapping extends __DtoMappingContract<any>,
    TRecursiveMappings extends ReadonlyArray<__DtoMappingContract<any>> | never
> =
    TMapping["__mappingType"] extends "REFERENCE"
        ? TMapping extends __ReferenceMappingContract<any, any, infer DtoKind, infer PropName, any, infer Member, infer TargetMappings, any>
            ? DtoKind extends "INPUT_REF"
                ? never
                : { readonly [K in PropName]: Member } 
                    | __ConcatAssociationMemberUnion<PropName, __AllAssociationMemberUnions<TargetMappings, false>>
            : never
    : TMapping["__mappingType"] extends "COLLECTION"
        ? TMapping extends __CollectionMappingContract<any, any, infer DtoKind, infer PropName, any, infer Member, infer TargetMappings>
            ? DtoKind extends "INPUT_REF"
                ? never 
                : { readonly [K in PropName]: Member } 
                    | __ConcatAssociationMemberUnion<PropName, __AllAssociationMemberUnions<TargetMappings, false>>
            : never
    : TMapping["__mappingType"] extends "FLAT"
        ? TMapping extends __FlatMappingContract<any, any, infer DtoKind, infer PropName, any, infer Member, infer TargetMappings, any>
            ? DtoKind extends "INPUT_REF"
                ? never
                : { readonly [K in PropName]: Member } 
                    | __ConcatAssociationMemberUnion<PropName, __AllAssociationMemberUnions<TargetMappings, false>>
            : never
    : TMapping["__mappingType"] extends "FOLD"
        ? TMapping extends __FoldMappingContract<any, any, any, infer InnerMappings>
            ? __AllAssociationMemberUnions<InnerMappings, false>
            : never
    : TMapping["__mappingType"] extends "INSTANCE_OF"
        ? TMapping extends __InstanceOfMapppingContract<any, any, any, any, infer InnerMappings>
            ? __AllAssociationMemberUnions<InnerMappings, false>
            : never 
    : TMapping["__mappingType"] extends "RECURSIVE"
        ? TMapping extends __InputReferenceRecursiveMapping<any, any, any, any, infer PropName, any, infer Member>
            ? { readonly [K in PropName as `${PropName}*`]: Member } 
                | __ConcatAssociationMemberUnion<`${PropName}*`, __AllAssociationMemberUnions<TRecursiveMappings, true>>
        : TMapping extends __InputCollectionRecursiveMapping<any, any, any, any, infer PropName, any, any, infer Member>
            ? { readonly [K in PropName as `${PropName}*`]: Member } 
                | __ConcatAssociationMemberUnion<`${PropName}*`, __AllAssociationMemberUnions<TRecursiveMappings, true>>
        : never
    : never;

export type __ConcatAssociationMemberUnion<
    TPropName extends string,
    TSubAssociationMembers
> = 
    TSubAssociationMembers extends any
        ? {
            readonly [
                K in keyof TSubAssociationMembers as `${TPropName}.${string & K}`
            ]: TSubAssociationMembers[K];
        }
        : never;