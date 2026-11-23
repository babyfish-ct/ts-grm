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
import { AnyAssociationModel, AssociationModel } from "./association";
import { __FlattenMembers, __NormalizeOptions, __UnionToIntersection } from "@/auxiliary_types";
import { __AllModelMembers, __RequiredModelKey } from "@/schema/model_internal_types";
import { __AssociationKeyType } from "./association_internal_types";
import { __ReferencePropContract, __ScalarPropContract } from "@/schema/prop_internal_types";
import { __MakeAssignableExpression, __MakeExpression, __StaticEntityTableMembers, __TableLike } from "./table_internal_types";
import { Expression, NumExpression, StrExpression } from "./expression";
import { __CombinedNullity, __EmbeddedPropContract, __NullityType, __TargetModelOf, __WithNullity } from "@/index_internal";
import { AtLeastOne, INSERTED_FLAG } from "./utils";
import { Table } from "./table";

export type __MutatedMembers<
    TModel extends AnyModel | AnyAssociationModel,
    TAssignable extends boolean = false
> = 
    TModel extends Model<any, any, any, any, any, infer Modifier>
        ? __NormalizeOptions<
            __MutatedMembersImpl<__FlattenMembers<__AllModelMembers<TModel>>, TAssignable> & (
                Modifier extends "OPEN" | "ABSTRACT"
                    ? { readonly __discriminator: StrExpression<string>; } 
                : Modifier extends "OPEN_BY_NUM" | "ABSTRACT_BY_NUM"
                    ? { readonly __discriminator: NumExpression<number>; } 
                : object
            )
        >
    : TModel extends AssociationModel<
        infer SourceModel,
        infer SourceKey,
        infer TargetModel,
        infer TargetKey
    >
        ? __MutatedFlattenMembers<
            `source${Capitalize<SourceKey>}`, 
            __AllModelMembers<SourceModel>[SourceKey],
            "NONNULL",
            TAssignable
        >
        & __MutatedFlattenMembers<
            `target${Capitalize<TargetKey>}`, 
            __AllModelMembers<TargetModel>[TargetKey],
            "NONNULL",
            TAssignable
        >
    : never;

export type __MutatedMembersImpl<
    TFlattenCtorMembers,
    TAssignable extends boolean
> = 
    { 
        [
            K in keyof TFlattenCtorMembers as 
                TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any, any> 
                    ? K & string
                    : never
        ]: TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any, any> 
            ? TAssignable extends true
                ? __MakeAssignableExpression<"NONNULL", TFlattenCtorMembers[K]>
                : __MakeExpression<"NONNULL", TFlattenCtorMembers[K]>
            : never
    } & __MutatedReferenceKeyMembers<TFlattenCtorMembers, TAssignable>;

export type __MutatedReferenceKeyMembers<
    TMembers,
    TAssignable extends boolean
> = __UnionToIntersection<{
    readonly [
        K in __MutableReferenceKeys<TMembers>
    ]: TMembers[K] extends __ReferencePropContract<infer TargetModel, infer Nullity, "COLUMNS", never, any, infer TargetKey>
        ? __MutatedFlattenMembers<
            `${K}${Capitalize<__RequiredModelKey<TargetModel, TargetKey>>}`, 
            __AllModelMembers<TargetModel>[__RequiredModelKey<TargetModel, TargetKey>], 
            Nullity,
            TAssignable
        >
        : never
}[__MutableReferenceKeys<TMembers>]>;

export type __MutableReferenceKeys<TMembers> =
    string & keyof {
        [K in string & keyof TMembers as
            TMembers[K] extends __ReferencePropContract<any, any, "COLUMNS", never, any, any>
                ? K
                : never
            ]: never
    };

export type __MutatedFlattenMembers<
    TPrefix extends string, 
    TProp,
    TNullity extends __NullityType,
    TAssignable extends boolean
> =
    TProp extends __ScalarPropContract<any, infer Nullity, any, any>
        ? { 
            readonly [K in TPrefix]: 
                TAssignable extends true
                    ? __MakeAssignableExpression<__CombinedNullity<TNullity, Nullity>, TProp>
                    : __MakeExpression<__CombinedNullity<TNullity, Nullity>, TProp>; 
        }
    : TProp extends __EmbeddedPropContract<any, infer Nullity, infer FlattenProps>
        ? { 
            readonly [
                K in keyof FlattenProps as `${TPrefix}.${K & string}`
            ]: TAssignable extends true
                ? __MakeAssignableExpression<__CombinedNullity<TNullity, Nullity>, FlattenProps[K]>
                : __MakeExpression<__CombinedNullity<TNullity, Nullity>, FlattenProps[K]>; 
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

export type __MutatedReturnKey<
    TModel extends AnyModel | AnyAssociationModel
> =
    keyof __MutatedMembers<TModel> | typeof INSERTED_FLAG;

export type __MutatedReturn<
    TModel extends AnyModel | AnyAssociationModel, 
    TKey extends __MutatedReturnKey<TModel>,
    TNullAsUndefined extends boolean
> =
    TKey extends typeof INSERTED_FLAG
        ? boolean
        : __MutatedMembers<TModel>[Exclude<TKey, typeof INSERTED_FLAG>] extends Expression<infer R>
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

export interface __MergeConditionContext<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> {
    readonly old: Table<TModel, "NONE">;
    readonly new: TSourceTableLike;
}

export interface __MergeMatchedContext<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> {
    
    readonly old: Table<TModel, "NONE">;
    readonly new: TSourceTableLike;
    update<
        TKey extends keyof __MutatedMembers<TModel>
    >(
        key: TKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TKey & keyof __MutatedMembers<TModel>]>
    ): this;
}

export interface __MergeUnmatchedContext<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> {
    readonly new: TSourceTableLike;
    insert<
        TKey extends keyof __MutatedMembers<TModel>
    >(
        key: TKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TKey & keyof __MutatedMembers<TModel>]>
    ): this;
}
