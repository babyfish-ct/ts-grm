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
import { __AllModelMembers } from "../model_internal_types";
import { __AssociatedLikePropContract, __EmbeddedPropContract, __NullityType } from "../prop_internal_types";
import { __AllScalarsMapping } from "./all_scalars";
import { __DtoMapping, __DtoKind } from "./dto_context";

export type __PropModelOf<
    TModel extends AnyModel, 
    TMember
> =
    TMember extends __EmbeddedPropContract<any, any, any>
        ? TModel
    : TMember extends __AssociatedLikePropContract<infer TargetModel, any>
        ? TargetModel
    : never;

export type __TargetMembersOf<
    TMember
> =
    TMember extends __EmbeddedPropContract<infer NestedProps, any, any>
        ? NestedProps
    : TMember extends __AssociatedLikePropContract<infer TargetModel, any>
        ? __AllModelMembers<TargetModel>
    : never;

export type __TargetContextKindOf<
    TMember
> =
    TMember extends __EmbeddedPropContract<any, any, any>
        ? "EMBEDDABLE"
    : TMember extends __AssociatedLikePropContract<any, any>
        ? "ENTITY"
    : never;

export type __TargetMappings<
    TModel extends AnyModel, 
    TMember
> = ReadonlyArray<__DtoMapping<__PropModelOf<TModel, TMember>>>;

export type __DefaultTargetMappings<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TMember
> = [ 
    __AllScalarsMapping<__PropModelOf<TModel, TMember>, TDtoKind, __TargetMembersOf<TMember>, never> 
];

export type __WithNullity<T, TNullity extends __NullityType, TDtoKind extends __DtoKind> =
    TNullity extends "NULLABLE"
        ? TDtoKind extends "NULL_VIEW"
            ? T | null
        : TDtoKind extends "UNDEFINED_VIEW"
            ? T | undefined
        : T | null | undefined
    : TNullity extends "INPUT_NONNULL"
        ? TDtoKind extends "NULL_VIEW"
            ? T | null
        : TDtoKind extends "UNDEFINED_VIEW"
            ? T | undefined
        : T
    : T;

export type __SelfMappings<
    TModel extends AnyModel, 
> = ReadonlyArray<__DtoMapping<TModel>>;

export type __IsFetchable<
    TActualDeclaring extends string,
    TDeclaringModelName extends string | undefined,
    TSuperDeclaringModelNames extends string | undefined
> = 
    TDeclaringModelName extends undefined
        ? true
        : TActualDeclaring extends TDeclaringModelName
            ? true
            : TActualDeclaring extends TSuperDeclaringModelNames
                ? true
                : false;