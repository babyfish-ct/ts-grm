import { AllModelMembers, AnyModel, CtorMembers, Model, ModelCtor } from "@/schema/model";
import { CollectionProp, EmbeddedProp, ForeignKeyProp, I64Prop, NullityType, ReferenceProp, ReturnTypeOf, ScalarProp } from "@/schema/prop";
import { ExpressionType, I64Expression, NonNullExpression, NullableExpression, Predicate } from "./expression";
import { FilterNever } from "@/utils";

export type EntityTable<TModel extends Model<any, any, any, any, any>> = 
    DslMembers<TModel, AllModelMembers<TModel>, "NONNULL", false>;

type DslMembers<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends NullityType, 
    TRiskAccepted extends boolean
> = 
    FilterNever<{
        [K in keyof TMembers]:
            TMembers[K] extends I64Prop<infer R, infer Nullity>
                ? I64Expression<R, Nullity>
            : TMembers[K] extends ScalarProp<infer R, infer Nullity>
                ? ExpressionType<R, CombinedNullity<TNullity, Nullity>>
            : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
                ? () => DslMembers<TModel, R, CombinedNullity<TNullity, Nullity>, TRiskAccepted>
            : TMembers[K] extends ReferenceProp<infer TTargetModel, infer Nullity, any, any>
                ? Nullity extends "NONNULL" 
                    ? NonNullReferenceJoinAction<TModel, TTargetModel, CtorMembers<ModelCtor<TTargetModel>>, TRiskAccepted>
                    : ReferenceJoinAction<TModel, TTargetModel, CtorMembers<ModelCtor<TTargetModel>>, TRiskAccepted>
            : TMembers[K] extends CollectionProp<infer TTargetModel>
                ? CollectionJoinAction<TModel, TTargetModel, CtorMembers<ModelCtor<TTargetModel>>, TRiskAccepted>
            : never
        } & ReferenceKeyMembers<TMembers,TNullity>
    > &
    WeakJoinAction<TModel, TRiskAccepted>;

type ReferenceKeyMembers<TMembers, TNullity extends NullityType> = {
    [
        K in keyof TMembers as
            TMembers[K] extends ReferenceProp<infer _, any, "OWNING", infer TKey>
                ? TKey extends string
                    ? `${K & string}${Capitalize<TKey>}`
                    : never
                : never
    ]: TMembers[K] extends ReferenceProp<infer TTargetModel, infer Nullity, "OWNING", infer TKey>
        ? TKey extends string
            ? AllModelMembers<TTargetModel>[TKey] extends I64Prop<infer R, any>
                ? I64Expression<R, CombinedNullity<TNullity, Nullity>>
                : ExpressionType<
                    ReturnTypeOf<
                        AllModelMembers<TTargetModel>[TKey]>, 
                        CombinedNullity<TNullity, Nullity>
                > 
            : never
        : never
};

type CombinedNullity<
    TNullity1 extends NullityType, 
    TNullity2 extends NullityType
> = TNullity1 extends "NULLABLE"
        ? "NULLABLE"
    : TNullity2 extends "NULLABLE"
        ? "NULLABLE"
    : "NONNULL";

export type JoinType = "INNER" | "LEFT";

type NonNullReferenceJoinAction<
    TParentModel extends AnyModel, 
    TModel extends AnyModel, 
    TMembers extends object, 
    TRiskAccepted extends boolean
> = {

    (): DslMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;
    
    (
        joinType: JoinType
    ): DslMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;
    
    (
        options: {
            joinType?: JoinType,
        }
    ): DslMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;

    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter: FilterType<TParentModel, TModel>
        }
    ): DslMembers<
        TModel, 
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
};

type ReferenceJoinAction<
    TParentModel extends AnyModel, 
    TModel extends AnyModel, 
    TMembers extends object, 
    TRiskAccepted extends boolean
> = {

    (): DslMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): DslMembers<
        TModel, 
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: FilterType<TParentModel, TModel>
        }
    ): DslMembers<
        TModel, 
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
};

type CollectionJoinAction<
    TParentModel extends AnyModel, 
    TModel extends AnyModel, 
    TMembers extends object, 
    TRiskAccepted extends boolean
> = {

    (): TRiskAccepted extends true
        ? DslMembers<TModel, TMembers, "NONNULL", true>
        : RiskUnkownJoinedTable<TModel, TMembers, "NONNULL">;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): TRiskAccepted extends true
        ? DslMembers<
            TModel, 
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedTable<
            TModel,
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: FilterType<TParentModel, TModel>
        }
    ): TRiskAccepted extends true
        ? DslMembers<
            TModel, 
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedTable<
            TModel,
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
};

type RiskUnkownJoinedTable<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends NullityType
> = {
    $acceptRisk(): DslMembers<TModel, TMembers, TNullity, true>;
};

type WeakJoinAction<
    TModel extends AnyModel,
    TRiskAccepted extends boolean
> = {

    join<
        TTargetModel extends AnyModel,
    >(
        targetModel: TTargetModel,
        filter: FilterType<TModel, TTargetModel>
    ): TRiskAccepted extends true
        ? DslMembers<
            TTargetModel, 
            AllModelMembers<TTargetModel>, 
            "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedTable<
            TTargetModel,
            AllModelMembers<TTargetModel>, 
            "NONNULL"
        >;

    join<
        TTargetModel extends AnyModel,
        TJoinType extends JoinType,
    >(
        targetModel: TTargetModel,
        joinType: TJoinType,
        filter: FilterType<TModel, TTargetModel>
    ): TRiskAccepted extends true
        ? DslMembers<
            TTargetModel, 
            AllModelMembers<TTargetModel>, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedTable<
            TTargetModel,
            AllModelMembers<TTargetModel>, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
};

type FilterType<TParentModel extends AnyModel, TModel extends AnyModel> =
    (source: EntityTable<TParentModel>, target: EntityTable<TModel>) => Predicate;