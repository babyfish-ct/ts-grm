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
import { __ModelLike } from "./table_internal_types";
import { __MergeSourceDslMembers, __MergeSourceReferenceKeyExpr, __MergeSourceReferenceKeyName } from "./merge_source_table_internal_types";
import { __AllModelMembers } from "@/schema/model_internal_types";
import { AnyAssociationModel, AssociationModel } from "./association";
import { __MutatedMembers } from "./mutate_internal_types";

export type MergeSourceTable<
    TModel extends AnyModel | AnyAssociationModel, 
    TKeys extends string & keyof __MutatedMembers<TModel>
> =
    TModel extends AnyModel
        ? MergeSourceEntityTable<TModel, TKeys>
    : TModel extends AnyAssociationModel
        ? MergeSourceAssociationTable<TModel, TKeys>
    : never;

export type MergeSourceEntityTable<
    TModel extends AnyModel, 
    TKeys extends string & keyof __MutatedMembers<TModel>
> = 
    {
        __type(): {
            readonly tableLike: true;
        };
    } & __MergeSourceDslMembers<TModel, __AllModelMembers<TModel>, "NONNULL", TKeys>;

export type MergeSourceAssociationTable<
    TModel extends AnyAssociationModel,
    TKeys extends string & keyof __MutatedMembers<TModel>
> = 
    TModel extends AssociationModel<infer SourceModel, infer SourceKey, infer TargetModel, infer TargetKey>
        ? {
            __type(): {
                readonly tableLike: true;
            };
        } & {
            [
                K in SourceKey as
                    __MergeSourceReferenceKeyName<"source", SourceModel, K, TKeys>
            ]: __MergeSourceReferenceKeyExpr<"source", "NONNULL", SourceModel, K, TKeys>
        } & {
            [
                K in TargetKey as
                    __MergeSourceReferenceKeyName<"target", TargetModel, K, TKeys>
            ]: __MergeSourceReferenceKeyExpr<"target", "NONNULL", TargetModel, K, TKeys>
        }
        : never;