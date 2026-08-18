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

import { Entity } from "@/impl/entity";
import { __AllModelMembers } from "@/schema/model_internal_types";
import { __JoinPolicyType } from "./table_internal_types";
import { AssociationModelImpl } from "@/impl/association_model_impl";
import { __AssociationKeys, __AssociationTableMembers, __MakeAssociationModel } from "./association_internal_types";
import { AnyModel } from "@/schema/model";
import { EntityProp } from "@/impl/entity_prop";

export interface AssociationModel<
    TSourceModel extends AnyModel,
    TSourceKey extends keyof __AllModelMembers<TSourceModel> & string,
    TTargetModel extends AnyModel,
    TTargetKey extends keyof __AllModelMembers<TTargetModel> & string,
    TJoinPolicy extends __JoinPolicyType
> {
    __type(): {
        readonly associationModel: [
            TSourceModel, 
            TSourceKey, 
            TTargetModel, 
            TTargetKey,
            TJoinPolicy
        ] | true;
    };

    readonly sourceEntity: Entity;

    readonly sourceKeyProp: EntityProp;

    readonly targetEntity: Entity;

    readonly targetKeyProp: EntityProp;
}

export type AnyAssociationModel = AssociationModel<AnyModel, any, AnyModel, any, any>;

export function associationModel<
    TModel extends AnyModel,
    TAssociationKey extends __AssociationKeys<TModel>
>(
    model: TModel,
    associationKey: TAssociationKey
): __MakeAssociationModel<TModel, TAssociationKey> {
    const sourceEntity = Entity.of(model);
    const associationProp = sourceEntity.prop(associationKey);
    return new AssociationModelImpl(associationProp) as any;
}

export type AssociationTable<
    TModel extends AnyAssociationModel 
> = 
    TModel extends AssociationModel<
        infer SourceModel,
        infer SourceKey,
        infer TargetModel,
        infer TargetKey,
        infer JoinPolicy
    >
        ? __AssociationTableMembers<
            SourceModel, 
            SourceKey, 
            TargetModel, 
            TargetKey,
            "NONNULL",
            JoinPolicy
        > 
        : never;
