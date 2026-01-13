import { AllModelMembers, AnyModel, CtorMembers, ModelCtor, ModelName } from "@/schema/model";
import { CollectionProp, EmbeddedProp, I64Prop, NullityType, ReferenceProp, DirectTypeOf, ScalarProp, CombinedNullity } from "@/schema/prop";
import { Expression, MakeType, Predicate } from "./expression";
import { FilterNever } from "@/utils";
import { View } from "@/schema/dto";
import { FetchedView } from "./root-query";
import { BaseQuerySelectMapArgs, BaseModel } from "./base-query";

export type TableLike = {

    __type(): { tableLike: true; };
};

export type Table<T extends AnyModel | BaseModel<any>, TRiskAccepted extends boolean = false> =
    T extends AnyModel
        ? EntityTable<T, TRiskAccepted>
    : T extends BaseModel<infer TMap>
        ? BaseTable<TMap, TRiskAccepted>
    : never;

export type EntityTable<TModel extends AnyModel, TRiskAccepted extends boolean = false> = 
    EntityTableMembers<TModel, AllModelMembers<TModel>, "NONNULL", TRiskAccepted>;

type EntityTableMembers<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends NullityType, 
    TRiskAccepted extends boolean
> = DslMembers<TModel, TMembers, TNullity, TRiskAccepted>
    & WeakJoinAction<TModel, TRiskAccepted> 
    & { 
        fetch<X>(
            view: View<TModel, X>
        ): FetchedView<
            TModel, 
            TNullity extends "NULLABLE" ? X | null | undefined : X
        >; 
    } & {
        __type(): {
            tableLike: true;
            entityTable: TModel;
        }
    };

type DslMembers<
    TModel extends AnyModel, 
    TMembers extends object, 
    TNullity extends NullityType, 
    TRiskAccepted extends boolean
> = 
    FilterNever<{
        [K in keyof TMembers]:
            TMembers[K] extends I64Prop<infer R, infer Nullity>
                ? Expression<
                    MakeType<R, Nullity>,
                    R extends string ? "AS_NUMBER" : undefined
                >
            : TMembers[K] extends ScalarProp<infer R, infer Nullity>
                ? Expression<MakeType<R, CombinedNullity<TNullity, Nullity>>>
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
    >;

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
                ? Expression<
                    MakeType<R, CombinedNullity<TNullity, Nullity>>, 
                    R extends string ? "AS_NUMBER" : undefined
                >
                : Expression<
                    MakeType<
                        DirectTypeOf<AllModelMembers<TTargetModel>[TKey]>, 
                        CombinedNullity<TNullity, Nullity>
                    >
                > 
            : never
        : never
};

export type JoinType = "INNER" | "LEFT";

type NonNullReferenceJoinAction<
    TParentModel extends AnyModel, 
    TModel extends AnyModel, 
    TMembers extends object, 
    TRiskAccepted extends boolean
> = {

    (): EntityTableMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;
    
    (
        joinType: JoinType
    ): EntityTableMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;
    
    (
        options: {
            joinType?: JoinType,
        }
    ): EntityTableMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;

    <TJoinType extends JoinType = "INNER">(
        options: {
            joinType?: TJoinType,
            filter: FilterType<TParentModel, TModel>
        }
    ): EntityTableMembers<
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

    (): EntityTableMembers<TModel, TMembers, "NONNULL", TRiskAccepted>;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): EntityTableMembers<
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
    ): EntityTableMembers<
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
        ? EntityTableMembers<TModel, TMembers, "NONNULL", true>
        : RiskUnkownJoinedTable<TModel, TMembers, "NONNULL">;
    
    <TJoinType extends JoinType>(
        joinType: TJoinType
    ): TRiskAccepted extends true
        ? EntityTableMembers<
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
        ? EntityTableMembers<
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
    $acceptRisk(): EntityTableMembers<TModel, TMembers, TNullity, true>;
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
        ? EntityTableMembers<
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
        ? EntityTableMembers<
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

export type BaseTable<
    TMap extends BaseQuerySelectMapArgs,
    TRiskAccepted extends boolean = false
> = {
    __type(): { 
        tableLike: true; 
        baseTable: true; 
    };
} & {
    [K in keyof TMap]: 
        TMap[K] extends EntityTable<any, any>
            ? MakeRiskAcceptedTable<TMap[K], TRiskAccepted>
            : TMap[K];
};

type MakeRiskAcceptedTable<TEntityTable, TRiskAccepted extends boolean = false> =
    TEntityTable extends EntityTable<infer M extends AnyModel, any>
        ? EntityTable<M, TRiskAccepted>
        : never;