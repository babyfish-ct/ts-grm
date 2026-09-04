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

import { __AllModelMembers, __DerivedModel, __RequiredModelKey } from "@/schema/model_internal_types";
import { DateExpression, Expression, NumExpression, Predicate, StrExpression, EnumSetExpression, CmpExpression } from "./expression";
import { View } from "@/schema/dto/api";
import { FetchedView } from "./root_query";
import { BaseQuerySelectMapArgs, BaseModel, BaseQueryMapOf } from "./base_query";
import { 
    __EmbeddedPropContract, 
    __I64PropContract, 
    __ScalarPropContract, 
    __AssociatedPropContract,
    __EnumSetPropContract,
    __CollectionPropContract, 
    __NullityType, 
    __ReferencePropContract 
} from "@/schema/prop_internal_types";
import { __CombinedNullity } from "@/schema/prop_internal_behavior";
import { BaseTable, EntityTable, FilterType, JoinType } from "./table";
import { __AssociationKeys, __MakeAssociationModel, __MakeAssociationTableMembers } from "./association_internal_types";
import { AnyAssociationModel } from "./association";
import { AnyModel } from "@/schema/model";
import { __CollectionKeys } from "@/index_internal";
import { Criteria } from "./criteria";

export type __TableLike = {

    __type(): { 
        readonly tableLike: true; 
    };
};

export type __EntityTableLike = {

    __type(): {
        readonly tableLike: true;
        readonly entityTableLike: true;
    };
};

export type __ModelLike = AnyModel | BaseModel<any> | AnyAssociationModel;

export type __JoinPolicyType = "NONE" | "REFERENCE" | "ARBITRARY";

export type __EntityTableMembers<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends __NullityType, 
    TJoinPolicy extends __JoinPolicyType
> = __PrettifyDsl<
    __DslMembers<TModel, TMembers, TNullity, TJoinPolicy>
    & __WeakJoinAction<TModel, TJoinPolicy> 
    & __StaticEntityTableMembers<TModel, TMembers, TNullity, TJoinPolicy>
>;

export type __DslMembers<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends __NullityType, 
    TJoinPolicy extends __JoinPolicyType
> = 
    { 
        [K in keyof TMembers as
            TMembers[K] extends __ScalarPropContract<any, any, any>
                ? K
            : TMembers[K] extends __EmbeddedPropContract<any, any, any> 
                ? K
            : TJoinPolicy extends "NONE"
                ? never
            : TMembers[K] extends __ReferencePropContract<any, any, any, any, any, any>
                ? K
            : TMembers[K] extends __CollectionPropContract<any, any, any, any, any>
                ? K
            : never
        ]: TMembers[K] extends __ScalarPropContract<any, any, any>
            ? __MakeExpression<TNullity, TMembers[K]>
        : TMembers[K] extends __EmbeddedPropContract<infer R, infer Nullity, any>
            ? () => __DslMembers<TModel, R, __CombinedNullity<TNullity, Nullity>, TJoinPolicy>
        : TJoinPolicy extends "NONE"
            ? never
        : TMembers[K] extends __ReferencePropContract<infer TargetModel, any, any, any, any, any>
            ? __ReferenceJoinAction<TModel, TargetModel, __AllModelMembers<TargetModel>, TJoinPolicy>
        : TMembers[K] extends __CollectionPropContract<infer TargetModel, any, any, any, any>
            ? __CollectionJoinAction<TModel, TargetModel, __AllModelMembers<TargetModel>, TJoinPolicy>
        : never
    } & __DslReferenceKeyMembers<TModel, TMembers, TNullity>;

export type __MakeExpression<
    TNullity extends __NullityType, 
    TProp
> =
    TProp extends __ScalarPropContract<infer R, infer Nullity, infer Customized>
        ? TProp extends __I64PropContract<infer R, any>
            ? NumExpression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
        : TProp extends __EnumSetPropContract<infer R>
            ? EnumSetExpression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
        : Customized extends true
            ? Expression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
        : R extends Date
            ? DateExpression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
        : R extends string
            ? StrExpression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
        : R extends number
            ? NumExpression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
        : Expression<__MakeType<R, __CombinedNullity<TNullity, Nullity>>>
    : never;

export type __MakeType<T, TNullity extends __NullityType> =
    TNullity extends "NONNULL"
        ? T
        : T | null;

export type __DslReferenceKeyMembers<TModel extends AnyModel, TMembers, TNullity extends __NullityType> = {
    [
        K in keyof TMembers as
            TMembers[K] extends __ReferencePropContract<infer _, any, "COLUMNS", undefined, any, infer TKey>
                ? TKey extends string
                    ? `${K & string}${Capitalize<__RequiredModelKey<TModel, TKey>>}`
                    : never
                : never
    ]: TMembers[K] extends __ReferencePropContract<infer TargetModel, infer Nullity, "COLUMNS", undefined, any, infer Key>
        ? Key extends string
            ? __AllModelMembers<TargetModel>[__RequiredModelKey<TargetModel, Key>] extends __EmbeddedPropContract<infer R, any, any>
                ? () => __DslMembers<TModel, R, __CombinedNullity<TNullity, Nullity>, "REFERENCE">
            : __MakeExpression<
                __CombinedNullity<TNullity, Nullity>,
                __AllModelMembers<TargetModel>[__RequiredModelKey<TModel, Key>]
            >
            : never
        : never
};

export type __ReferenceJoinAction<
    TParentModel extends AnyModel, 
    TModel extends AnyModel, 
    TMembers extends object, 
    TJoinPolicy extends __JoinPolicyType
> = {

    (): __EntityTableMembers<TModel, TMembers, "NONNULL", TJoinPolicy>;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): __EntityTableMembers<
        TModel, 
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TJoinPolicy
    >;

    (filter: FilterType<TParentModel, TModel>): __EntityTableMembers<
        TModel, 
        TMembers, 
        "NONNULL", 
        TJoinPolicy
    >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            readonly joinType?: TJoinType,
            readonly filter?: FilterType<TParentModel, TModel>
            readonly ignoreTargetFilters?: boolean
        }
    ): __EntityTableMembers<
        TModel, 
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TJoinPolicy
    >;
};

export type __CollectionJoinAction<
    TParentModel extends AnyModel, 
    TModel extends AnyModel, 
    TMembers extends object, 
    TJoinPolicy extends __JoinPolicyType
> = {

    (): __TableRiskWrapper<
        __EntityTableMembers<TModel, TMembers, "NONNULL", "ARBITRARY">,
        TJoinPolicy
    >; 
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): __TableRiskWrapper<
        __EntityTableMembers<
            TModel,
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL",
            "ARBITRARY"
        >,
        TJoinPolicy
    >;

    (filter: FilterType<TParentModel, TModel>): __TableRiskWrapper<
        __EntityTableMembers<
            TModel,
            TMembers, 
            "NONNULL",
            "ARBITRARY"
        >,
        TJoinPolicy
    >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            readonly joinType?: TJoinType,
            readonly filter?: FilterType<TParentModel, TModel>,
            readonly ignoreTargetFilters?: boolean
        }
    ): __TableRiskWrapper<
        __EntityTableMembers<
            TModel,
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL",
            "ARBITRARY"
        >,
        TJoinPolicy
    >;
};

export type __TableRiskWrapper<T extends __TableLike, TJoinPolicy extends __JoinPolicyType> = 
    TJoinPolicy extends "ARBITRARY"
        ? T
        : { $acceptMulti(): T; };

export type __WeakJoinAction<
    TModel extends __ModelLike,
    TJoinPolicy extends __JoinPolicyType
> = 
    TJoinPolicy extends "NONE"
        ? {}
        : {

            join<
                TTargetModel extends AnyModel,
            >(
                targetModel: TTargetModel,
                filter: FilterType<TModel, TTargetModel>
            ): __TableRiskWrapper<__EntityTableMembers<
                    TTargetModel, 
                    __AllModelMembers<TTargetModel>, 
                    "NONNULL", 
                    TJoinPolicy
                >,
                TJoinPolicy
            >;

            join<
                TTargetModel extends AnyModel,
                TJoinType extends JoinType = "INNER",
            >(
                targetModel: TTargetModel,
                options: {
                    readonly joinType?: TJoinType,
                    readonly filter: FilterType<TModel, TTargetModel>,
                    readonly ignoreTargetFilters?: boolean
                }
            ): __TableRiskWrapper<
                __EntityTableMembers<
                    TTargetModel, 
                    __AllModelMembers<TTargetModel>, 
                    TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
                    TJoinPolicy
                >,
                TJoinPolicy
            >;

            join<
                TTargetModel extends BaseModel<any>,
            >(
                targetModel: TTargetModel,
                filter: FilterType<TModel, TTargetModel>
            ): BaseTable<BaseQueryMapOf<TTargetModel>, TJoinPolicy>;

            join<
                TTargetModel extends BaseModel<any>,
                TJoinType extends JoinType = "INNER",
            >(
                targetModel: TTargetModel,
                options: {
                    readonly joinType?: TJoinType,
                    readonly filter: FilterType<TModel, TTargetModel>,
                    readonly ignoreTargetFilters?: boolean
                }
            ): BaseTable<
                TJoinType extends "LEFT"
                    ? __NullableBaseQuerySelectMapOf<BaseQueryMapOf<TTargetModel>>
                    : BaseQueryMapOf<TTargetModel>, 
                TJoinPolicy
            >;
        };

export interface __StaticEntityTableMembers<
    TModel extends AnyModel,
    TMembers extends object,
    TNullity extends __NullityType, 
    TJoinPolicy extends __JoinPolicyType
> extends __AssociationAction<TModel, TJoinPolicy>, __AssociationExistenceAction<TMembers>, __CollectionExistenceAction<TMembers> { 
    __type(): {
        tableLike: true;
        entityTableLike: true;
        entityTable: TModel | true;
    };

    fetch<X>(
        view: View<TModel, X>
    ): FetchedView<
        TModel, 
        TNullity extends "NULLABLE" ? X | null : X
    >;

    is<TDerivedModel extends AnyModel>(
        derivedModel: __DerivedModel<TDerivedModel, TModel>
    ): Predicate;

    as<TDerivedModel extends AnyModel>(
        derivedModel: __DerivedModel<TDerivedModel, TModel>
    ): __EntityTableMembers<TModel, __AllModelMembers<TDerivedModel>, "NULLABLE", TJoinPolicy>;

    match(
        criteria: Criteria<TModel>
    ): Predicate | undefined;
}

export interface __AssociationAction<TModel extends AnyModel, TJoinPolicy extends __JoinPolicyType> {
    
    association<
        TKey extends __AssociationKeys<TModel>
    >(
        key: TKey,
    ): __TableRiskWrapper<
        __MakeAssociationTableMembers<
            TModel,
            TKey,
            "NONNULL"
        >,
        TJoinPolicy
    >;

    association<
        TKey extends __AssociationKeys<TModel>,
        TJoinType extends JoinType = "INNER"
    >(
        key: TKey,
        joinType: TJoinType
    ): __TableRiskWrapper<
        __MakeAssociationTableMembers<
            TModel,
            TKey,
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >,
        TJoinPolicy
    >;

    association<
        TKey extends __AssociationKeys<TModel>
    >(
        key: TKey,
        filter: FilterType<TModel, __MakeAssociationModel<TModel, TKey>>
    ): __TableRiskWrapper<
        __MakeAssociationTableMembers<
            TModel,
            TKey,
            "NONNULL"
        >,
        TJoinPolicy
    >;

    association<
        TKey extends __AssociationKeys<TModel>,
        TJoinType extends JoinType = "INNER"
    >(
        key: TKey,
        options: {
            readonly joinType?: TJoinType;
            readonly filter?: FilterType<TModel, __MakeAssociationModel<TModel, TKey>>,
            readonly ignoreTargetFilters?: boolean
        }
    ): __TableRiskWrapper<
        __MakeAssociationTableMembers<
            TModel,
            TKey,
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >,
        TJoinPolicy
    >;
};

export interface __AssociationExistenceAction<TModelMembers> {
    none<TKey extends __AssociatedKeys<TModelMembers>>(
        key: TKey,
        fn?: __AssociatedFilter<TModelMembers[TKey]>
    ): Predicate;

    some<TKey extends __AssociatedKeys<TModelMembers>>(
        key: TKey,
        fn?: __AssociatedFilter<TModelMembers[TKey]>
    ): Predicate;

    noneIf<TKey extends __AssociatedKeys<TModelMembers>>(
        key: TKey,
        fn: __AssociatedFilter<TModelMembers[TKey]>
    ): Predicate | undefined;

    someIf<TKey extends __AssociatedKeys<TModelMembers>>(
        key: TKey,
        fn: __AssociatedFilter<TModelMembers[TKey]>
    ): Predicate | undefined;
};

export type __AssociatedKeys<TModelMembers> =
    TModelMembers extends object 
        ? { 
            [K in keyof TModelMembers]: 
                TModelMembers[K] extends __AssociatedPropContract<any, any, any, any, any, any>
                    ? K
                    : never
        }[keyof TModelMembers] :
        never;

export type __AssociatedFilter<TProp> =
    TProp extends __AssociatedPropContract<infer TargetModel, any, any, any, any, any>
        ? (
            table: __EntityTableMembers<
                TargetModel, 
                __AllModelMembers<TargetModel>, 
                "NONNULL", 
                "ARBITRARY"
            >
        ) => Predicate | undefined
        : never;

export interface __CollectionExistenceAction<TModelMembers> {
    every<TKey extends __CollectionKeys<TModelMembers>>(
        key: TKey,
        fn: __AssociatedFilter<TModelMembers[TKey]>
    ): Predicate | undefined;

    count<TKey extends __CollectionKeys<TModelMembers>>(
        key: TKey,
        fn?: __AssociatedFilter<TModelMembers[TKey]>
    ): NumExpression<number>;
}

export type __NullableBaseQuerySelectMapOf<
    TMap extends BaseQuerySelectMapArgs
> = {
    readonly [K in keyof TMap]: 
        TMap[K] extends EnumSetExpression<infer T>
            ? EnumSetExpression<T | null>
        : TMap[K] extends DateExpression<infer T>
            ? DateExpression<T | null>
        : TMap[K] extends StrExpression<infer T>
            ? StrExpression<T | null>
        : TMap[K] extends NumExpression<infer T>
            ? NumExpression<T | null>
        : TMap[K] extends CmpExpression<infer T>
            ? CmpExpression<T | null>
        : TMap[K] extends Expression<infer T> 
            ? Expression<T | null>
        : __NullableEntityTableOf<TMap[K]>;
};

export type __MakeTableWithJoinPolicy<TEntityTable, TJoinPolicy extends __JoinPolicyType = "REFERENCE"> =
    TEntityTable extends EntityTable<infer M extends AnyModel, any>
        ? EntityTable<M, TJoinPolicy>
        : never;

export type __NullableEntityTableOf<TEntityTable> =
    TEntityTable extends __EntityTableMembers<infer Model, infer _ extends object, any, infer JoinPolicy extends __JoinPolicyType>
        ? __EntityTableMembers<Model, __AllModelMembers<Model>, "NULLABLE", JoinPolicy>
        : never;

export type __PrettifyDsl<T> = {
    readonly [K in keyof T]: T[K];
};