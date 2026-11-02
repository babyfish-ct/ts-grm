import { AnyModel } from "@/schema/model";
import { AnyAssociationModel, AssociationModel } from "./association";
import { __FlattenMembers } from "@/auxiliary_types";
import { __AllModelMembers, __RequiredModelKey } from "@/schema/model_internal_types";
import { __AssociationKeyType } from "./association_internal_types";
import { __ReferencePropContract, __ScalarPropContract } from "@/schema/prop_internal_types";
import { __MakeExpression } from "./table_internal_types";
import { Expression } from "./expression";

export type __UpdatedMembers<TModel extends AnyModel | AnyAssociationModel> = 
    TModel extends AnyModel
        ? __UpdatedMembersImpl<__FlattenMembers<__AllModelMembers<TModel>>>
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

export type __UpdatedMembersImpl<TFlattenCtorMembers> = 
    TFlattenCtorMembers extends object
        ? { 
            [
                K in keyof TFlattenCtorMembers as 
                    TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any> 
                        ? K
                    : TFlattenCtorMembers[K] extends __ReferencePropContract<infer TargetModel, any, "COLUMNS", never, any, infer TargetKey>
                        ? `${K & string}${Capitalize<__RequiredModelKey<TargetModel, TargetKey>>}`
                    : never
            ]: TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any> 
                ? __MakeExpression<"NONNULL", TFlattenCtorMembers[K]>
            : TFlattenCtorMembers[K] extends __ReferencePropContract<infer TargetModel, infer Nullity, "COLUMNS", never, any, infer TargetKey>
                ? __MakeExpression<Nullity, __AllModelMembers<TargetModel>[__RequiredModelKey<TargetModel, TargetKey>]>
            : never
        }
        : never;

export type __UpdatedValue<TExpression> =
    TExpression extends Expression<infer R>
        ? null extends R
            ? TExpression | R | undefined
        : undefined extends R
            ? TExpression | R | null
        : TExpression | R
    : never;