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
import { ExpressionLike, Predicate } from "./expression";
import { BaseTable, Table } from "./table";
import { AtLeastOne, ExpressionOrder } from "./utils";
import { getQueryFactory } from "@/impl/ast/query_factory";
import { BaseQueryImplementor } from "@/impl/base_query_implementor";
import { QueryContract } from "@/impl/ast";
import { ArgumentError } from "@/error/common";
import { AnyAssociationModel } from "./association";
import { __EntityTableLike } from "./table_internal_types";

export function derivedModel<TQuery extends BaseQuery<any>>(
    query: TQuery,
) : BaseModel<BaseQueryMapOf<TQuery>> {
    if ((query as any as QueryContract).isRecursive) {
        throw new ArgumentError("The query contains recursive query, please use \"dsl.cteModel\"");
    }
    return (query as any as BaseQueryImplementor<any>).toModel(false) as 
        BaseModel<BaseQueryMapOf<TQuery>>;
}

export function cteModel<TQuery extends BaseQuery<any>>(
    query: TQuery,
) : BaseModel<BaseQueryMapOf<TQuery>> {
    return (query as any as BaseQueryImplementor<any>).toModel(true) as 
        BaseModel<BaseQueryMapOf<TQuery>>;
}

export function baseQuery<
    const TModels extends AtLeastOne<AnyModel | BaseModel<any> | AnyAssociationModel>,
    TProjection extends BaseQueryProjection<any>
>(
    ...args: [
        ...models: TModels,
        fn: (
            q: MutableBaseQuery,
            ...tables: {
                [K in keyof TModels]: Table<TModels[K]>
            } extends infer T ? T extends any[] ? T : never : never
        ) => TProjection
    ]
): AtomBaseQuery<TProjection> {
    return getQueryFactory().createAtomBaseQuery(...args);
}

export interface MutableBaseQuery {

    __type(): { mutableBaseQuery: true };

    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    orderBy(
        ...orders: ReadonlyArray<ExpressionLike | ExpressionOrder>
    ): this;

    groupBy(
        ...expressions: ReadonlyArray<ExpressionLike>
    ): this;

    having(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    select<
        const TSelectionMap extends BaseQuerySelectMapArgs
    >(
        selectionMap: TSelectionMap
    ): BaseQueryProjection<TSelectionMap>;

    selectDistinct<
        const TSelectionMap extends BaseQuerySelectMapArgs
    >(
        selectionMap: TSelectionMap
    ): BaseQueryProjection<TSelectionMap>;
}

export interface RecursiveMutableBaseQuery<TProjection> 
extends MutableBaseQuery {
    
    __type(): { 
        mutableBaseQuery: true 
        recursiveBaseQuery: TProjection | true
    };

    readonly prev: BaseTable<BaseQueryMapOf<TProjection>>;
}

export interface BaseQuery<TProjection> {

    __type(): { baseQuery: TProjection | true; };

    unionAllRecursively<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any>>,
        const TPrev extends BaseTable<BaseQueryMapOf<TProjection>>
    >(
        ...args: [
            ...models: TModels,
            fnOptions: {
                readonly join: (
                    prev: TPrev, 
                    ...tables: {
                        [K in keyof TModels]: Table<TModels[K]>
                    } extends infer T ? T extends any[] ? T : never : never
                ) => Predicate,
                readonly query: (
                    q: RecursiveMutableBaseQuery<TProjection>,
                    ...tables: {
                        [K in keyof TModels]: Table<TModels[K]>
                    } extends infer T ? T extends any[] ? T : never : never
                ) => TProjection
            }
        ]
    ): BaseQuery<TProjection>;
}

export interface AtomBaseQuery<TProjection> extends BaseQuery<TProjection> {

    __type(): { 
        baseQuery: TProjection | true; 
        atomBaseQuery: TProjection | true;
    };

    limit(limit: number): AtomBaseQuery<TProjection>;

    offset(offset: number): AtomBaseQuery<TProjection>;
}

export type BaseQueryProjection<TSelections extends BaseQuerySelectMapArgs> = {

    __type(): { baseQueryProjection: TSelections | true };
};

export type BaseQuerySelectMapArgs = {
    readonly [key: string]: ExpressionLike | __EntityTableLike;
};

export type BaseQueryMapOf<T> =
    T extends BaseQueryProjection<infer R>
        ? R
    : T extends BaseQuery<infer P>
        ? BaseQueryMapOf<P>
    : T extends BaseModel<infer R>
        ? R
    : never;

export interface BaseModel<
    T extends BaseQuerySelectMapArgs
> {

    __type(): {
        baseModel: T | true
    };
};