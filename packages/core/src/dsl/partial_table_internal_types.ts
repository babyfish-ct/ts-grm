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

import { AnyModel, Model } from "@/schema/model";
import { __CollectionPropContract, __EmbeddedPropContract, __NullityType, __ReferencePropContract, __ScalarPropContract } from "@/schema/prop_internal_types";
import { __JoinPolicyType, __MakeExpression, __MakeType, __ReferenceJoinAction } from "./table_internal_types";
import { __CombinedNullity } from "@/schema/prop_internal_behavior";
import { __AllModelMembers, __RequiredModelKey } from "@/schema/model_internal_types";
import { NumExpression, StrExpression } from "./expression";
import { __MutatedMembers, __ReferenceKeyName } from "@/index_internal";

export type __PartialDslMembers<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends __NullityType,
    TKeys extends keyof __MutatedMembers<TModel>
> = 
    {
        [K in keyof TMembers as
            TMembers[K] extends __ScalarPropContract<any, any, any, any>
                ? K extends TKeys 
                    ? K 
                    : never
            : TMembers[K] extends __EmbeddedPropContract<any, any, any> 
                ? [__SubKeys<TKeys & string, K & string>] extends [never]
                    ? never
                    : K
            : never
        ]: TMembers[K] extends __ScalarPropContract<any, any, any, any>
            ? __MakeExpression<TNullity, TMembers[K]>
        : TMembers[K] extends __EmbeddedPropContract<infer R, infer Nullity, any>
            ? () => __PartialDslMembers<
                TModel, 
                R, 
                __CombinedNullity<TNullity, Nullity>, 
                __SubKeys<TKeys & string, K & string>
            >
        : never
    } & __PartialDiscriminatorMembers<TModel, TNullity, TKeys & string>
    & __PartialDslReferenceKeyMembers<TNullity, TMembers, TKeys & string>;

export type __PartialDiscriminatorMembers<
    TModel, 
    TNullity extends __NullityType,
    TKeys extends string
> =
    "__discriminator" extends TKeys
        ? TModel extends Model<any, any, any, any, any, infer Modifier>
            ? (
                Modifier extends "OPEN" | "ABSTRACT"
                    ? { readonly __discriminator: StrExpression<__MakeType<string, TNullity>>; }
                : Modifier extends "OPEN_BY_NUM" | "ABSTRACT_BY_NUM"
                    ? { readonly __discriminator: NumExpression<__MakeType<number, TNullity>>; }
                : {}
            )
            : {}
        : {};

export type __PartialDslReferenceKeyMembers<
    TNullity extends __NullityType,
    TMembers,
    TKeys extends string
> = {
    [
        K in keyof TMembers & string as
            TMembers[K] extends __ReferencePropContract<infer TargetModel, any, "COLUMNS", never, any, infer Key extends string>
                ? __PartialReferenceKeyName<K, TargetModel, __RequiredModelKey<TargetModel, Key>, TKeys>
                : never
    ]: TMembers[K] extends __ReferencePropContract<infer TargetModel, infer Nullity, "COLUMNS", never, any, infer Key>
        ? __PartialReferenceKeyExpr<K, __CombinedNullity<TNullity, Nullity>, TargetModel, __RequiredModelKey<TargetModel, Key>, TKeys>
        : never
};

export type __PartialReferenceKeyName<
    TAssociationKey extends string,
    TTargetModel extends AnyModel,
    TTargetKey extends string,
    TKeys extends string
> =
    __AllModelMembers<TTargetModel>[TTargetKey] extends __EmbeddedPropContract<any, any, any>
        ? [__SubKeys<TKeys, `${TAssociationKey}${Capitalize<TTargetKey>}`>] extends [never]
            ? never
            : `${TAssociationKey}${Capitalize<TTargetKey>}`
        : `${TAssociationKey}${Capitalize<TTargetKey>}` extends TKeys
            ? `${TAssociationKey}${Capitalize<TTargetKey>}`
            : never;

export type __PartialReferenceKeyExpr<
    TAssociationKey extends string,
    TAssociationNullity extends __NullityType,
    TTargetModel extends AnyModel,
    TTargetKey extends string,
    TKeys extends string
> =
    __AllModelMembers<TTargetModel>[TTargetKey] extends __EmbeddedPropContract<infer R, infer Nullity, any>
        ? () => __PartialDslMembers<
                TTargetModel, 
                R, 
                __CombinedNullity<TAssociationNullity, Nullity>, 
                __SubKeys<TKeys, `${TAssociationKey}${Capitalize<TTargetKey>}`>
            >
        : __MakeExpression<
            TAssociationNullity,
            __AllModelMembers<TTargetModel>[TTargetKey]
        >;

export type __SubKeys<TKeys extends string, P extends string> =
    TKeys extends `${P}.${infer Rest}` ? Rest : never;