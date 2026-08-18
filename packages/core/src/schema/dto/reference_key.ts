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
import { __TargetKeyOf } from "../prop_internal_types";
import { __EmbeddedPropContract, __ReferencePropContract } from "../prop_internal_types";
import { __AllScalarsMapping, __MemberType } from "./all_scalars";
import { __DtoBody, __DtoKind, __DtoMapping, __DtoType } from "./dto_context";
import { __TargetMappings, __PropModelOf, __WithNullity } from "./utils";

export type __ReferenceKeyContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers
> = {
    [
        K in keyof TMembers as 
            __ReferenceKeyName<K, TMembers[K]>
    ]: __TargetKeyPropOf<TModel, TMembers[K]> extends __EmbeddedPropContract<any, any, any>
        ? __EmbeddedReferenceKeyMapping<
            TModel, 
            TDtoKind, 
            __ReferenceKeyName<K, TMembers[K]>, 
            TMembers[K],
            [__AllScalarsMapping<TModel, TDtoKind, __TargetKeyMembersOf<TModel, TMembers[K]>, never>]
        >
        : __ScalarReferenceKeyMapping<
            TModel, 
            TDtoKind, 
            __ReferenceKeyName<K, TMembers[K]>, 
            TMembers[K]
        >
}

export type __ReferenceKeyName<TKey, TMember> =
    TMember extends __ReferencePropContract<infer TargetModel, any, any, any, any, infer TargetKey>
        ? `${TKey & string}${Capitalize<__RequiredModelKey<TargetModel, TargetKey>>}`
        : never;

export type __ReferenceKeyMapping<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TMember
> =
    __ScalarReferenceKeyMapping<TModel, TDtoKind, TKey, TMember>
    | __EmbeddedReferenceKeyMapping<TModel, TDtoKind, TKey, TMember, any>;

export interface __ScalarReferenceKeyMapping<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TMember
> {

    readonly __mappingType: "REFERENCE_KEY";

    readonly __keyType: "SCALAR";
    
    readonly __key?: TKey;
    
    as<TAlias extends string>(
        alias: TAlias
    ): __ScalarReferenceKeyMapping<TModel, TDtoKind, TAlias, TMember>;
}

export interface __EmbeddedReferenceKeyMapping<
    TModel extends AnyModel, 
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TMember,
    TMappings extends ReadonlyArray<__DtoMapping<any>>
> {

    readonly __mappingType: "REFERENCE_KEY";

    readonly __keyType: "EMBEDDED";
    
    readonly __key?: TKey;
    
    as<TAlias extends string>(
        alias: TAlias
    ): __EmbeddedReferenceKeyMapping<TModel, TDtoKind, TAlias, TMember, TMappings>;

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
    ): __EmbeddedReferenceKeyMapping<TModel, TDtoKind, TKey, TMember, TMappings>;
}

export type __TargetKeyPropOf<
    TModel extends AnyModel,
    TMember
> =
    __AllModelMembers<
        __PropModelOf<TModel, TMember>
    >[__RequiredModelKey<__PropModelOf<TModel, TMember>, __TargetKeyOf<TMember>>];

export type __TargetKeyMembersOf<
    TModel extends AnyModel,
    TMember
> =
    __TargetKeyPropOf<TModel, TMember> extends __EmbeddedPropContract<infer Props, any, any>
        ? Props
        : never;

export type __ReferenceKeyDtoType<TMapping> =
    TMapping extends __ScalarReferenceKeyMapping<any, infer DtoKind, infer Key, infer Member>
        ? {
            [K in Key]: Member extends __ReferencePropContract<infer TargetModel, infer Nullity, any, any, any, infer TargetKey>
                ? __WithNullity<
                    __MemberType<
                        __AllModelMembers<TargetModel>[__RequiredModelKey<TargetModel, TargetKey>], 
                        DtoKind
                    >,
                    Nullity,
                    DtoKind
                >
                : never
        }
    : TMapping extends __EmbeddedReferenceKeyMapping<any, infer DtoKind, infer Key, infer Member, infer Mappings>
        ? {
            [K in Key]: Member extends __ReferencePropContract<any, infer Nullity, any, any, any, any>
                ? __WithNullity<
                    __DtoType<Mappings>,
                    Nullity,
                    DtoKind
                >
                : never
        }
        : never;

