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

import { AnyModel } from "@/schema/model";
import { AnyAssociationModel, AssociationModel } from "./association";
import { __FlattenMembers } from "@/auxiliary_types";
import { __AllModelMembers, __RequiredModelKey } from "@/schema/model_internal_types";
import { __AssociationKeyType } from "./association_internal_types";
import { __ReferencePropContract, __ScalarPropContract } from "@/schema/prop_internal_types";
import { __MakeExpression } from "./table_internal_types";
import { Expression, NumExpression } from "./expression";
import { __TargetModelOf, __WithNullity } from "@/index_internal";
import { AtLeastOne } from "./utils";
import { Table } from "./table";
import { BaseModel } from "./base_query";

export type __MutatedMembers<TModel extends AnyModel | AnyAssociationModel> = 
    TModel extends AnyModel
        ? __MutatedMembersImpl<__FlattenMembers<__AllModelMembers<TModel>>>
    : TModel extends AssociationModel<
        infer SourceModel,
        infer SourceKey,
        infer TargetModel,
        infer TargetKey,
        any
    >
        ? {
            readonly [K in `source${Capitalize<SourceKey>}`]: 
                __AssociationKeyType<__AllModelMembers<SourceModel>, SourceKey, "NONNULL">;
        } & {
            readonly [K in `target${Capitalize<TargetKey>}`]: 
                __AssociationKeyType<__AllModelMembers<TargetModel>, TargetKey, "NONNULL">;
        }
    : never;

export type __MutatedMembersImpl<TFlattenCtorMembers> = 
    TFlattenCtorMembers extends object
        ? { 
            [
                K in keyof TFlattenCtorMembers as 
                    TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any, any> 
                        ? K
                    : TFlattenCtorMembers[K] extends __ReferencePropContract<infer TargetModel, any, "COLUMNS", never, any, infer TargetKey>
                        ? `${K & string}${Capitalize<__RequiredModelKey<TargetModel, TargetKey>>}`
                    : never
            ]: TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any, any> 
                ? __MakeExpression<"NONNULL", TFlattenCtorMembers[K]>
            : TFlattenCtorMembers[K] extends __ReferencePropContract<infer TargetModel, infer Nullity, "COLUMNS", never, any, infer TargetKey>
                ? __MakeExpression<Nullity, __AllModelMembers<TargetModel>[__RequiredModelKey<TargetModel, TargetKey>]>
            : never
        }
        : never;

export type __MutatedValue<TExpression> =
    TExpression extends Expression<infer R>
        ? null extends R
            ? __MutatedRhsExpr<TExpression> | R | undefined
        : undefined extends R
            ? __MutatedRhsExpr<TExpression> | R | null
        : TExpression | R
    : never;

export type __MutatedRhsExpr<TExpression> =
    TExpression extends NumExpression<infer R>
        ? TExpression | NumExpression<NonNullable<R>>
    : TExpression extends Expression<infer R>
        ? TExpression | Expression<NonNullable<R>>
    : never;

export type __MutatedLiterals<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> = {
    readonly [
        K in keyof TKeys
    ]: TKeys[K] extends keyof __MutatedMembers<TModel> 
        ? __MutatedLiteral<__MutatedMembers<TModel>[TKeys[K]]>
        : never;
}

export type __MutatedLiteral<TExpression> =
    TExpression extends Expression<infer R>
        ? null extends R
            ? R | undefined
        : undefined extends R
            ? R | null
        : R
    : never;

export type __MutatedReturn<TExpression, TNullAsUndefined extends boolean> =
    TExpression extends Expression<infer R>
        ? null extends R
            ? __WithNullity<
                NonNullable<R>, 
                "NULLABLE", 
                TNullAsUndefined extends true ? "NULL_VIEW" : "UNDEFINED_VIEW"
            >
        : undefined extends R
            ? __WithNullity<
                NonNullable<R>, 
                "NULLABLE", 
                TNullAsUndefined extends true ? "NULL_VIEW" : "UNDEFINED_VIEW"
            >
        : R
    : never;

export interface __MergeContext<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>
> {
    readonly old: Table<TModel, "NONE">;
    readonly new: Table<TSourceModel, "NONE">;
}

export interface __MergeMetchedContext<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>
> extends __MergeContext<TModel, TSourceModel> {
    
    update<
        TKey extends keyof __MutatedMembers<TModel>
    >(
        key: TKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TKey]>
    ): this;
}

export type __MergeUnmatchedContext<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>,
    TUseValues extends boolean
> = 
    TUseValues extends true
        ? __MergeUnmatchedContextUsingValuesItf<TModel, TSourceModel>
        : __MergeUnmatchedContextItf<TModel, TSourceModel>;

export interface __MergeUnmatchedContextItf<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>
> {
    readonly new: Table<TSourceModel, "NONE">;

    insert<
        TKey extends keyof __MutatedMembers<TModel>
    >(
        key: TKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TKey]> 
    ): this;
}

export interface __MergeUnmatchedContextUsingValuesItf<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>
> extends __MergeUnmatchedContextItf<TModel, TSourceModel> {
    
    insertAll(options?: {
        readonly execlude: keyof __MutatedMembers<TModel> | ReadonlyArray<keyof __MutatedMembers<TModel>>;
    }): this;
}