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
import { __PartialDslMembers, __PartialReferenceKeyExpr, __PartialReferenceKeyName } from "./partial_table_internal_types";
import { __AllModelMembers } from "@/schema/model_internal_types";
import { AnyAssociationModel, AssociationModel } from "./association";
import { __MutatedMembers } from "./mutate_internal_types";

export type PartialTable<
    TModel extends AnyModel | AnyAssociationModel, 
    TKeys extends keyof __MutatedMembers<TModel>
> =
    TModel extends AnyModel
        ? PartialEntityTable<TModel, TKeys>
    : TModel extends AnyAssociationModel
        ? PartialAssociationTable<TModel, TKeys>
    : never;

export type PartialEntityTable<
    TModel extends AnyModel, 
    TKeys extends keyof __MutatedMembers<TModel>
> = 
    {
        __type(): {
            readonly tableLike: true;
        };
    } & __PartialDslMembers<TModel, __AllModelMembers<TModel>, "NONNULL", TKeys>;

export type PartialAssociationTable<
    TModel extends AnyAssociationModel,
    TKeys extends keyof __MutatedMembers<TModel>
> = 
    TModel extends AssociationModel<infer SourceModel, infer SourceKey, infer TargetModel, infer TargetKey>
        ? {
            __type(): {
                readonly tableLike: true;
            };
        } & {
            [
                K in SourceKey as
                    __PartialReferenceKeyName<"source", SourceModel, K, TKeys & string>
            ]: __PartialReferenceKeyExpr<"source", "NONNULL", SourceModel, K, TKeys & string>
        } & {
            [
                K in TargetKey as
                    __PartialReferenceKeyName<"target", TargetModel, K, TKeys & string>
            ]: __PartialReferenceKeyExpr<"target", "NONNULL", TargetModel, K, TKeys & string>
        }
        : never;