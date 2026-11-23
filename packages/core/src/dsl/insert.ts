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
import { __MutatedValue, __MutatedMembers, __MutatedLiterals, __MutatedReturn, __MutatedReturnKey } from "./mutate_internal_types";
import { AnyModel } from "@/schema/model";
import { AtLeastOne, ImportResult, ImportResultWithData } from "./utils";
import { AbstractMutableBaseQuery, BaseModel, BaseQueryProjection, BaseQuerySelectMapArgs } from "./base_query";
import { Table } from "./table";
import { __TableLike } from "./table_internal_types";
import { __TargetModelOf } from "@/index_internal";
import { PartialTable } from "./partial_table";

export interface MutableInsert<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {
    row(
        ...values: __MutatedLiterals<TModel, TKeys>
    ): OnConflictInsert<TModel, TKeys>;
    
    rows(
        ...rows: ReadonlyArray<__MutatedLiterals<TModel, TKeys>>
    ): OnConflictInsert<TModel, TKeys>;

    using(
        fn: (
            ctx: MutableInsertSourceContext<{
                readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
            } & BaseQuerySelectMapArgs>
        ) => InsertSource<{
            readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
        } & BaseQuerySelectMapArgs>
    ): OnConflictInsert<TModel, TKeys>;

    using(
        kind: "DERIVED" | "CTE",
        fn: (
            ctx: MutableInsertSourceContext<{
                readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
            } & BaseQuerySelectMapArgs>
        ) => InsertSource<{
            readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
        } & BaseQuerySelectMapArgs>
    ): OnConflictInsert<TModel, TKeys>;
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
    TModel extends AnyModel | AnyAssociationModel,
> {
    returning<
        const TReturnedKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
    >(
        ...keys: TReturnedKeys
    ): ReturnedInsert<TModel, TReturnedKeys>;

    execute(): Promise<ImportResult>;
}

export type OnConflictInsert<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>,
> = 
    TModel extends AnyAssociationModel
        ? OnConflictAssociationInsert<TModel>
    : TModel extends AnyModel
        ? OnConflictEntityInsert<TModel, TKeys>
    : never;

export interface OnConflictEntityInsert<
    TModel extends AnyModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>,
> extends Insert<TModel> {

    onConflict<
        TConflictKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...conflictKeys: TConflictKeys
    ): OnConflictEntityUpdate<
        TModel,
        TKeys[number],
        Exclude<TKeys[number], TConflictKeys[number]>
    >;
}

export interface OnConflictAssociationInsert<
    TModel extends AnyAssociationModel
> extends Insert<TModel> {

    onConflictAll(): OnConflictAssociationUpdate<TModel>;

    onConflict<
        TConflictKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...conflictKeys: TConflictKeys
    ): OnConflictAssociationUpdate<
        TModel
    >;
}

export interface OnConflictEntityUpdate<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends keyof __MutatedMembers<TModel>,
    TUpdatableKeys extends keyof __MutatedMembers<TModel>
> {
    doNothing(): Insert<TModel>;

    doUpdate(
        fn: (ctx: OnConflictEntityUpdateContext<TModel, TKeys, TUpdatableKeys>) => void
    ): Insert<TModel>;
}

export interface OnConflictEntityUpdateContext<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends keyof __MutatedMembers<TModel>,
    TUpdatableKeys extends keyof __MutatedMembers<TModel>
> {
    readonly old: PartialTable<TModel, TKeys>;
    readonly new: PartialTable<TModel, TKeys>;
    update<
        TUpdatableKey extends TUpdatableKeys
    >(
        key: TUpdatableKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TUpdatableKey]>
    ): this;
}

export interface OnConflictAssociationUpdate<
    TModel extends AnyModel | AnyAssociationModel
> {
    doNothing(): Insert<TModel>;
}

export interface ReturnedInsert<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
> {

    execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? ImportResultWithData<
                __MutatedReturn<TModel, TKeys[0], TNullAsUndefined> 
            >
            : ImportResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<TModel, TKeys[K], TNullAsUndefined> 
            }>
    >;
}

