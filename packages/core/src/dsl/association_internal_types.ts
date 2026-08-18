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

import { __AllModelMembers, __RequiredModelKey } from "@/schema/model_internal_types";
import { __EntityTableMembers, __JoinPolicyType, __MakeExpression } from "./table_internal_types";
import { __AssociatedPropContract, __EmbeddedPropContract, __NullityType, __ReferencePropContract } from "@/schema/prop_internal_types";
import { __CombinedNullity } from "@/schema/prop_internal_behavior";
import { AssociationModel } from "./association";
import { AnyModel } from "@/schema/model";
import { FilterType } from "./table";

export type __AssociationKeys<TModel extends AnyModel> =
    __AssociationKeysImpl<__AllModelMembers<TModel>>;

type __AssociationKeysImpl<TModelMembers> =
    TModelMembers extends object 
        ? { 
            [K in keyof TModelMembers]: 
                TModelMembers[K] extends __AssociatedPropContract<any, any, any, true, any, any>
                    ? K
                    : never
        }[keyof TModelMembers] :
        never;

export type __MakeAssociationModel<
    TModel extends AnyModel,
    TAssociationKey extends __AssociationKeys<TModel>
> = 
    __AllModelMembers<TModel>[TAssociationKey] extends __AssociatedPropContract<
        infer TargetModel, 
        any, 
        any, 
        true,
        infer SourceKey, 
        infer TargetKey
    >
        ? AssociationModel<
            TModel,
            __RequiredModelKey<TModel, SourceKey>,
            TargetModel,
            __RequiredModelKey<TargetModel, TargetKey>,
            __AllModelMembers<TModel>[TAssociationKey] extends __ReferencePropContract<any, any, any, any, any, any>
                ? "ARBITRARY"
                : "REFERENCE"
        >
        : never;

export type __MakeAssociationTableMembers<
    TModel extends AnyModel,
    TAssociationKey extends __AssociationKeys<TModel>,
    TNullity extends __NullityType
> = 
    __AllModelMembers<TModel>[TAssociationKey] extends __AssociatedPropContract<
        infer TargetModel, 
        any, 
        any, 
        true,
        infer SourceKey, 
        infer TargetKey
    >
        ? __AssociationTableMembers<
            TModel,
            __RequiredModelKey<TModel, SourceKey>,
            TargetModel,
            __RequiredModelKey<TargetModel, TargetKey>,
            TNullity,
            __AllModelMembers<TModel>[TAssociationKey] extends __ReferencePropContract<any, any, any, any, any, any>
                ? "ARBITRARY"
                : "REFERENCE"
        >
        : never;
      
export type __AssociationTableMembers<
    TSourceModel extends AnyModel,
    TSourceKey extends keyof __AllModelMembers<TSourceModel> & string,
    TTargetModel extends AnyModel,
    TTargetKey extends keyof __AllModelMembers<TTargetModel> & string,
    TNullity extends __NullityType,
    TJoinPolicy extends __JoinPolicyType
> = {

    __type(): {
        readonly tableLike: true;
    };

    source(
        filter?: FilterType<
            AssociationModel<TSourceModel, TSourceKey, TTargetModel, TSourceKey, TJoinPolicy>, 
            TSourceModel
        >
    ): __EntityTableMembers<
        TSourceModel, 
        __AllModelMembers<TSourceModel>,
        TNullity,
        TJoinPolicy
    >;

    target(
        filter?: FilterType<
            AssociationModel<TSourceModel, TSourceKey, TTargetModel, TSourceKey, TJoinPolicy>, 
            TTargetModel
        >
    ): __EntityTableMembers<
        TTargetModel,
        __AllModelMembers<TTargetModel>,
        TNullity,
        TJoinPolicy
    >;
} & {
    readonly [K in `source${Capitalize<TSourceKey>}`]: 
        __AssociationKeyType<__AllModelMembers<TSourceModel>, TSourceKey, TNullity>;
} & {
    readonly [K in `target${Capitalize<TTargetKey>}`]: 
        __AssociationKeyType<__AllModelMembers<TTargetModel>, TTargetKey, TNullity>;
};

export type __AssociationKeyType<
    TMembers,
    TKey extends keyof TMembers, 
    TNullity extends __NullityType
> = 
    TMembers[TKey] extends __EmbeddedPropContract<infer Props, infer Nullity, any>
        ? () => {
            readonly [K in keyof Props]: __AssociationKeyType<
                Props,
                K & keyof Props,
                __CombinedNullity<TNullity, Nullity>
            >
        }
        : __MakeExpression<TNullity, TMembers[TKey]>;
