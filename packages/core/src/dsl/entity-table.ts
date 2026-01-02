import { CtorMembers, Model, ModelCtor } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityType, ReferenceProp, ScalarProp } from "@/schema/prop";
import { ExpressionType, Predicate } from "./expression";
import { FilterNever } from "@/utils";

export type EntityTable<TModel extends Model<any, any, any, any>> = 
    DslMembers<CtorMembers<ModelCtor<TModel>>, "NONNULL", false>;

type DslMembers<TMembers, TNullity extends NullityType, TRiskAccepted extends boolean> = 
    TMembers extends any
        ? FilterNever<{
            [K in keyof TMembers]:
                TMembers[K] extends ScalarProp<infer R, infer Nullity>
                    ? ExpressionType<R, CombinedNullity<TNullity, Nullity>>
                : TMembers[K] extends EmbeddedProp<infer R, infer Nullity>
                    ? () => DslMembers<R, CombinedNullity<TNullity, Nullity>, TRiskAccepted>
                : TMembers[K] extends ReferenceProp<infer R, infer Nullity, any>
                    ? Nullity extends "NONNULL" 
                        ? NonNullReferenceJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                        : ReferenceJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                : TMembers[K] extends CollectionProp<infer R>
                    ? CollectionJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                : never
        }>
        : never;

type CombinedNullity<
    TNullity1 extends NullityType, 
    TNullity2 extends NullityType
> = TNullity1 extends "NULLABLE"
        ? "NULLABLE"
    : TNullity2 extends "NULLABLE"
        ? "NULLABLE"
    : "NONNULL";

export type JoinType = "INNER" | "LEFT";

type NonNullReferenceJoinAction<TMembers, TRiskAccepted extends boolean> = {

    (): DslMembers<TMembers, "NONNULL", TRiskAccepted>;
    
    (
        joinType: "INNER"
    ): DslMembers<TMembers, "NONNULL", TRiskAccepted>;
    
    (
        options: {
            joinType?: "INNER",
            filter?: Predicate
        }
    ): DslMembers<TMembers, "NONNULL", TRiskAccepted>;
};

type ReferenceJoinAction<TMembers, TRiskAccepted extends boolean> = {

    (): DslMembers<TMembers, "NONNULL", TRiskAccepted>;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): DslMembers<
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: Predicate
        }
    ): DslMembers<
        TMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
};

type CollectionJoinAction<TMembers, TRiskAccepted extends boolean> = {

    (): TRiskAccepted extends true
        ? DslMembers<TMembers, "NONNULL", true>
        : RiskUnkownJoinedCollection<TMembers, "NONNULL">;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): TRiskAccepted extends true
        ? DslMembers<
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedCollection<
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: Predicate
        }
    ): TRiskAccepted extends true
        ? DslMembers<
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedCollection<
            TMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
};

type RiskUnkownJoinedCollection<TMembers, TNullity extends NullityType> = {
    $acceptRisk(): DslMembers<TMembers, TNullity, true>;
};