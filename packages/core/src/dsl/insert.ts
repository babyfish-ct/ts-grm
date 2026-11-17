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

import { AnyAssociationModel } from "./association";
import { __MutatedValue, __MutatedMembers, __MutatedLiterals, __MutatedReturn } from "./mutate_internal_types";
import { AnyModel } from "@/schema/model";
import { AtLeastOne } from "./utils";
import { AbstractMutableBaseQuery, BaseModel, BaseQueryProjection, BaseQuerySelectMapArgs } from "./base_query";
import { Table } from "./table";

export interface MutableInsert<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {
    row(
        ...values: __MutatedLiterals<TModel, TKeys>
    ): Insert<TModel>;
    
    rows(
        ...rows: ReadonlyArray<__MutatedLiterals<TModel, TKeys>>
    ): Insert<TModel>;

    using(
        fn: (
            ctx: MutableInsertSourceContext<{
                readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
            } & BaseQuerySelectMapArgs>
        ) => InsertSource<{
            readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
        } & BaseQuerySelectMapArgs>
    ): Insert<TModel>;

    using(
        kind: "DERIVED" | "CTE",
        fn: (
            ctx: MutableInsertSourceContext<{
                readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
            } & BaseQuerySelectMapArgs>
        ) => InsertSource<{
            readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
        } & BaseQuerySelectMapArgs>
    ): Insert<TModel>;
}

export interface MutableInsertSourceContext<TSelectionMap extends BaseQuerySelectMapArgs> {

    source<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any> | AnyAssociationModel>
    >(
        ...args: [
            ...models: TModels,
            fn: (
                q: MutableInsertSourceQuery<TSelectionMap>,
                ...tables: {
                    [K in keyof TModels]: Table<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => BaseQueryProjection<TSelectionMap>
        ]
    ): InsertSource<TSelectionMap>;

    union(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap>; 

    unionAll(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap>; 

    except(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap>; 

    exceptAll(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap>; 

    intersect(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap>; 

    intersectAll(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap>; 
}

export interface MutableInsertSourceQuery<
    TSelectionMap extends BaseQuerySelectMapArgs
> extends AbstractMutableBaseQuery {

    select(
        selectionMap: TSelectionMap
    ): BaseQueryProjection<TSelectionMap>;

    selectDistinct(
        selectionMap: TSelectionMap
    ): BaseQueryProjection<TSelectionMap>;
}

export interface InsertSource<
    TSelectionMap extends BaseQuerySelectMapArgs
> {
    __type(): { 
        insertSource: BaseQueryProjection<TSelectionMap> | true;
    };
}

export interface Insert<
    TModel extends AnyModel | AnyAssociationModel
> {
    execute<
        TReturnKind extends "AFFECTED_ROW_COUNT" | "NOTHING" = "AFFECTED_ROW_COUNT"
    >(kind?: TReturnKind): Promise<
        TReturnKind extends "NOTHING"
            ? void
            : InsertResult
    >;

    returning<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): ReturnedInsert<TModel, TKeys>;
}

export interface ReturnedInsert<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {

    execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? InsertResultWithData<
                __MutatedReturn<__MutatedMembers<TModel>[TKeys[0]], TNullAsUndefined> 
            >
            : InsertResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<__MutatedMembers<TModel>[TKeys[K]], TNullAsUndefined> 
            }>
    >;
}

export interface InsertResult {

    readonly affectedRowCount: number;
}

export interface InsertResultWithData<T> extends InsertResult {

    readonly rows: ReadonlyArray<T>;
}
