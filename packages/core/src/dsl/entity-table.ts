import { AllModelMembers, CtorMembers, Model, ModelCtor } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityType, ReferenceProp, ReturnTypeOf, ScalarProp } from "@/schema/prop";
import { ExpressionType, Predicate } from "./expression";
import { FilterNever } from "@/utils";

export type EntityTable<TModel extends Model<any, any, any, any, any>> = 
    DslMembers<AllModelMembers<TModel>, "NONNULL", false>;

type DslMembers<TAllMemembers extends object, TNullity extends NullityType, TRiskAccepted extends boolean> = 
    FilterNever<{
        [K in keyof TAllMemembers]:
            TAllMemembers[K] extends ScalarProp<infer R, infer Nullity>
                ? ExpressionType<R, CombinedNullity<TNullity, Nullity>>
            : TAllMemembers[K] extends EmbeddedProp<infer R, infer Nullity>
                ? () => DslMembers<R, CombinedNullity<TNullity, Nullity>, TRiskAccepted>
            : TAllMemembers[K] extends ReferenceProp<infer R, infer Nullity, any, any>
                ? Nullity extends "NONNULL" 
                    ? NonNullReferenceJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                    : ReferenceJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
            : TAllMemembers[K] extends CollectionProp<infer R>
                ? CollectionJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
            : never
        } & ReferenceIdMembers<TAllMemembers,TNullity>
    >;

type ReferenceIdMembers<TMembers, TNullity extends NullityType> = {
    [
        K in keyof TMembers as
            TMembers[K] extends ReferenceProp<infer TTargetModel, any, any, "REAL">
                ? TTargetModel extends Model<any, infer TIdProp, any, any, any>
                    ? `${K & string}${Capitalize<TIdProp & string>}`
                    : never
                : never
    ]: 
        TMembers[K] extends ReferenceProp<infer TTargetModel, infer Nullity, any, "REAL"> 
            ? TTargetModel extends Model<any, infer TProp, any, any, any>
                ? ExpressionType<ReturnTypeOf<AllModelMembers<TTargetModel>[TProp]>, CombinedNullity<TNullity, Nullity>> 
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

type NonNullReferenceJoinAction<TAllMemembers extends object, TRiskAccepted extends boolean> = {

    (): DslMembers<TAllMemembers, "NONNULL", TRiskAccepted>;
    
    (
        joinType: "INNER"
    ): DslMembers<TAllMemembers, "NONNULL", TRiskAccepted>;
    
    (
        options: {
            joinType?: "INNER",
            filter?: Predicate
        }
    ): DslMembers<TAllMemembers, "NONNULL", TRiskAccepted>;
};

type ReferenceJoinAction<TAllMemembers extends object, TRiskAccepted extends boolean> = {

    (): DslMembers<TAllMemembers, "NONNULL", TRiskAccepted>;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): DslMembers<
        TAllMemembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: Predicate
        }
    ): DslMembers<
        TAllMemembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
};

type CollectionJoinAction<TAllMemembers extends object, TRiskAccepted extends boolean> = {

    (): TRiskAccepted extends true
        ? DslMembers<TAllMemembers, "NONNULL", true>
        : RiskUnkownJoinedCollection<TAllMemembers, "NONNULL">;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): TRiskAccepted extends true
        ? DslMembers<
            TAllMemembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedCollection<
            TAllMemembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: Predicate
        }
    ): TRiskAccepted extends true
        ? DslMembers<
            TAllMemembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedCollection<
            TAllMemembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
};

type RiskUnkownJoinedCollection<TAllMemembers extends object, TNullity extends NullityType> = {
    $acceptRisk(): DslMembers<TAllMemembers, TNullity, true>;
};