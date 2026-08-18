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

import { __AllModelMembers } from "@/schema/model_internal_types";
import { BaseQuerySelectMapArgs, BaseModel } from "./base_query";
import { AnyAssociationModel, AssociationTable } from "./association";
import { __EntityTableMembers, __JoinPolicyType, __MakeTableWithJoinPolicy, __ModelLike, __WeakJoinAction } from "./table_internal_types";
import { AnyModel } from "@/schema/model";
import { Predicate } from "./expression";

export type Table<T extends __ModelLike, TJoinPolicy extends __JoinPolicyType = "REFERENCE"> =
    T extends AnyModel
        ? EntityTable<T, TJoinPolicy>
    : T extends BaseModel<infer TMap>
        ? BaseTable<TMap, TJoinPolicy>
    : T extends AnyAssociationModel
        ? AssociationTable<T>
    : never;

export type EntityTable<TModel extends AnyModel, TJoinPolicy extends __JoinPolicyType = "REFERENCE"> = 
    __EntityTableMembers<TModel, __AllModelMembers<TModel>, "NONNULL", TJoinPolicy>;

export type BaseTable<
    TMap extends BaseQuerySelectMapArgs,
    TJoinPolicy extends __JoinPolicyType = "REFERENCE"
> = {
    __type(): { 
        tableLike: true; 
        baseTable: true; 
    };
} & {
    readonly [K in keyof TMap]: 
        TMap[K] extends __EntityTableMembers<any, any, any, any>
            ? __MakeTableWithJoinPolicy<TMap[K], TJoinPolicy>
            : TMap[K];
} & __WeakJoinAction<BaseModel<TMap>, TJoinPolicy>;

export type JoinType = "INNER" | "LEFT";

export interface FilterType<
    TParentModel extends __ModelLike, 
    TModel extends __ModelLike
> {
    (ctx: FilterContextType<TParentModel, TModel>): Predicate | undefined;
}

export interface FilterContextType<
    TParentModel extends __ModelLike, 
    TModel extends __ModelLike
> {
    readonly source: Table<TParentModel>;
    readonly target: Table<TModel>;
};