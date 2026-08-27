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
import { __AllScalarsContext, __AllScalarsDtoType, __AllScalarsMapping } from "./all_scalars";
import { __AssociatedKeysContext, __AssociatedKeysDtoType, __AssociatedKeysMapping } from "./associated_keys";
import { __CollectionDtoType, __CollectionMapping } from "./collection";
import { __EmbeddedDtoType, __EmbeddedMapping } from "./embedded";
import { __FlatContext, __FlatDtoType, __FlatMapping } from "./flat";
import { __FoldContext, __FoldDtoType, __FoldMapping } from "./fold";
import { __ReferenceDtoType, __ReferenceMapping } from "./reference";
import { __ReferenceKeyContext, __ReferenceKeyDtoType, __ReferenceKeyMapping } from "./reference_key";
import { __ScalarLikeDtoType, __ScalarLikeMapping } from "./scalar_like";
import { __DirectContext } from "./direct";
import { __ApplyInstanceOfMappings, __InstanceOfContext, __InstanceOfMappping } from "./instance_of";
import { __ApplyRecursiveMappings, __RecursiveContext, __RecursiveMapping } from "./recursive";
import { __CalculatedCollectionDtoType, __CalculatedCollectionMapping, __CalculatedReferenceDtoType, __CalculatedReferenceMapping, __ParameterizedContext } from "./calculator";
import { __FormulaContext } from "./formula";

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
    );

export type __ContextKind = "ENTITY" | "EMBEDDABLE" | "DERIVED_ENTITY";

export type __DtoKind = "NULL_VIEW" | "UNDEFINED_VIEW" | "INPUT";

export interface __DtoBody<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers,
    TMappings extends ReadonlyArray<__DtoMapping<TModel>>
> {

    (
        ctx: __DtoContext<TModel, TDtoKind, TContextKind, TMembers>
    ): TMappings;
}

export type __DtoMapping<
    TModel extends AnyModel
> = 
    __AllScalarsMapping<TModel, any, any, any> 
    | __FoldMapping<TModel, any, any, any>
    | __FlatMapping<TModel, any, any, any, any, any, any>
    | __InstanceOfMappping<TModel, any, any, any, any>
    | __RecursiveMapping<TModel, any, any, any, any, any>
    | __ScalarLikeMapping<TModel, any, any, any, any, any>
    | __EmbeddedMapping<TModel, any, any, any, any, any>
    | __ReferenceKeyMapping<TModel, any, any, any, any>
    | __AssociatedKeysMapping<TModel, any, any, any, any>
    | __ReferenceMapping<TModel, any, any, any, any, any, any>
    | __CollectionMapping<TModel, any, any, any, any, any>
    | __CalculatedReferenceMapping<TModel, any, any, any, any, any, any>
    | __CalculatedCollectionMapping<TModel, any, any, any, any, any>;

export type __DtoType<
    TMappings extends ReadonlyArray<__DtoMapping<any>>,
    TAllowedDeclarings extends string | undefined
> = 
    __ApplyRecursiveMappings<
        __UnrecursiveDtoType<TMappings, TAllowedDeclarings>,
        TMappings
    >;

export type __UnrecursiveDtoType<
    TMappings extends ReadonlyArray<__DtoMapping<any>>,
    TAllowedDeclarings extends string | undefined
> = 
    __ApplyInstanceOfMappings<
        __UnionToIntersection<{
            [K in keyof TMappings]: __DtoMappingType<TMappings[K], TAllowedDeclarings>
        }[number]>,
        TMappings
    >;
    
export type __DtoMappingType<
    TMapping extends __DtoMapping<any>,
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