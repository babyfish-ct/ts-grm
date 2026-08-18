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
import { __AllModelMembers, __RequiredModelKey } from "../model_internal_types";
import { __CollectionPropContract, __EmbeddedPropContract } from "../prop_internal_types";
import { __AllScalarsMapping, __MemberType } from "./all_scalars";
import { __DtoBody, __DtoKind, __DtoMapping, __DtoType } from "./dto_context";
import { __TargetKeyMembersOf, __TargetKeyPropOf } from "./reference_key";
import { __PropModelOf, __TargetMappings } from "./utils";

export interface __AssociatedKeysContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers
> {
    $associatedKeys<
        TKey extends __CollectionKeys<TMembers>,
        TAlias extends string
    >(
        key: TKey, 
        alias: TAlias
    ): __TargetKeyPropOf<TModel, TMembers[TKey]> extends __EmbeddedPropContract<any, any, any>
        ? __EmbeddedAssociatedKeysMapping<
            TModel, 
            TDtoKind,
            TAlias, 
            TMembers[TKey],
            [__AllScalarsMapping<TModel, TDtoKind, __TargetKeyMembersOf<TModel, TMembers[TKey]>, never>]
        >
        : __ScalarAssociatedKeysMapping<
            TModel, 
            TDtoKind,
            TAlias, 
            TMembers[TKey]
        >;
}

export type __CollectionKeys<TMembers> = 
    keyof {
        [
            K in keyof TMembers as 
                TMembers[K] extends __CollectionPropContract<any, any, any, any, any>
                    ? K
                    : never
        ]: never
    };

export type __AssociatedKeysMapping<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TMember
> =
    __ScalarAssociatedKeysMapping<TModel, TDtoKind, TKey, TMember>
    | __EmbeddedAssociatedKeysMapping<TModel, TDtoKind, TKey, TMember, any>;

export interface __ScalarAssociatedKeysMapping<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TMember
> {
    readonly __mappingType: "ASSOCIATED_KEYS";
    readonly __keyType: "SCALAR";
    readonly __model?: TModel;
    readonly __dtoKind?: TDtoKind;
    readonly __key?: TKey;
    readonly __member?: TMember;
}

export interface __EmbeddedAssociatedKeysMapping<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TMember,
    TMappings extends ReadonlyArray<__DtoMapping<any>>
> {
    readonly __mappingType: "ASSOCIATED_KEYS";
    readonly __keyType: "EMBEDDED";
    readonly __model?: TModel;
    readonly __dtoKind?: TDtoKind;
    readonly __key?: TKey;
    readonly __member?: TMember;
    readonly __mappings?: TMappings;

    with<
        const TMappings extends __TargetMappings<TModel, TMember>
    >(
        body: __DtoBody<
            __PropModelOf<TModel, TMember>, 
            TDtoKind, 
            "EMBEDDABLE", 
            __TargetKeyMembersOf<TModel, TMember>,
            TMappings
        >
    ): __EmbeddedAssociatedKeysMapping<TModel, TDtoKind, TKey, TMember, TMappings>;
}

export type __AssociatedKeysDtoType<TMapping> = 
    TMapping extends __ScalarAssociatedKeysMapping<any, infer DtoKind, infer Key, infer Member>
        ? {
            [K in Key]: Member extends __CollectionPropContract<infer TargetModel, any, any, any, infer TargetKey>
                ? ReadonlyArray<
                    __MemberType<
                        __AllModelMembers<TargetModel>[__RequiredModelKey<TargetModel, TargetKey>], 
                        DtoKind
                    >
                >
                : never
        }
    : TMapping extends __EmbeddedAssociatedKeysMapping<any, any, infer Key, any, infer Mappings>
        ? {
            [K in Key]: ReadonlyArray<__DtoType<Mappings>>
        }
    : never;
