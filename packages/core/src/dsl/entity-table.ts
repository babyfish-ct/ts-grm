import { CtorMembers, InheritedModelMembers, Model, ModelCtor } from "@/schema/model";
import { CollectionProp, EmbeddedProp, NullityType, ReferenceProp, ScalarProp } from "@/schema/prop";
import { ExpressionType, Predicate } from "./expression";
import { FilterNever } from "@/utils";

export type EntityTable<TModel extends Model<any, any, any, any, any>> = 
    DslMembers<InheritedModelMembers<TModel>, "NONNULL", false>;

type DslMembers<TInheritedMembers, TNullity extends NullityType, TRiskAccepted extends boolean> = 
    TInheritedMembers extends object
        ? FilterNever<{
            [K in keyof TInheritedMembers]:
                TInheritedMembers[K] extends ScalarProp<infer R, infer Nullity>
                    ? ExpressionType<R, CombinedNullity<TNullity, Nullity>>
                : TInheritedMembers[K] extends EmbeddedProp<infer R, infer Nullity>
                    ? () => DslMembers<R, CombinedNullity<TNullity, Nullity>, TRiskAccepted>
                : TInheritedMembers[K] extends ReferenceProp<infer R, infer Nullity, any, any>
                    ? Nullity extends "NONNULL" 
                        ? NonNullReferenceJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                        : ReferenceJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                : TInheritedMembers[K] extends CollectionProp<infer R>
                    ? CollectionJoinAction<CtorMembers<ModelCtor<R>>, TRiskAccepted>
                : never
        }>
        : never;

// type ReferenceIdMembers<TInheritedMembers, TNullity extends NullityType> =
//     TInheritedMembers extends object
//         ? FilterNever<{
//             [K in keyof TInheritedMembers]: 
//                 TInheritedMembers[K] extends ReferenceProp<infer M, infer Nullity, any, "REAL"> 
//                     ? M extends Model<any, infer I, any, any, any>
//                         ? ExpressionType<InheritedModelMembers<M>[I], CombinedNullity<TNullity, Nullity>> 
//                         : never
//                     : never
//         }>
//         : Record<string, never>;

type CombinedNullity<
    TNullity1 extends NullityType, 
    TNullity2 extends NullityType
> = TNullity1 extends "NULLABLE"
        ? "NULLABLE"
    : TNullity2 extends "NULLABLE"
        ? "NULLABLE"
    : "NONNULL";

export type JoinType = "INNER" | "LEFT";

type NonNullReferenceJoinAction<TInheritedMembers, TRiskAccepted extends boolean> = {

    (): DslMembers<TInheritedMembers, "NONNULL", TRiskAccepted>;
    
    (
        joinType: "INNER"
    ): DslMembers<TInheritedMembers, "NONNULL", TRiskAccepted>;
    
    (
        options: {
            joinType?: "INNER",
            filter?: Predicate
        }
    ): DslMembers<TInheritedMembers, "NONNULL", TRiskAccepted>;
};

type ReferenceJoinAction<TInheritedMembers, TRiskAccepted extends boolean> = {

    (): DslMembers<TInheritedMembers, "NONNULL", TRiskAccepted>;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): DslMembers<
        TInheritedMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: Predicate
        }
    ): DslMembers<
        TInheritedMembers, 
        TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
        TRiskAccepted
    >;
};

type CollectionJoinAction<TInheritedMembers, TRiskAccepted extends boolean> = {

    (): TRiskAccepted extends true
        ? DslMembers<TInheritedMembers, "NONNULL", true>
        : RiskUnkownJoinedCollection<TInheritedMembers, "NONNULL">;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): TRiskAccepted extends true
        ? DslMembers<
            TInheritedMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedCollection<
            TInheritedMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
    
    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter?: Predicate
        }
    ): TRiskAccepted extends true
        ? DslMembers<
            TInheritedMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL", 
            TRiskAccepted
        >
        : RiskUnkownJoinedCollection<
            TInheritedMembers, 
            TJoinType extends "LEFT" ? "NULLABLE" : "NONNULL"
        >;
};

type RiskUnkownJoinedCollection<TInheritedMembers, TNullity extends NullityType> = {
    $acceptRisk(): DslMembers<TInheritedMembers, TNullity, true>;
};