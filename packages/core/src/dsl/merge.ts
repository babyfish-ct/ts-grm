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
import { AnyAssociationModel } from "./association";
import { __MergeMatchedContext, __MutatedLiterals, __MutatedMembers, __MutatedReturn, __MutatedValue, __MutatedReturnKey, __MergeConditionContext, __MergeUnmatchedContext } from "./mutate_internal_types";
import { BaseModel, BaseQuery, BaseQueryMapOf } from "./base_query";
import { Predicate } from "./expression";
import { __MakeType, __TableLike } from "./table_internal_types";
import { AtLeastOne, ImportResult, ImportResultWithData } from "./utils";
import { Table } from "./table";
import { PartialTable } from "./partial_table";

export interface MutableMerge<
    TModel extends AnyModel | AnyAssociationModel
> {
    using<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): MutableMergeByValues<
        TModel,  
        TKeys
    >;

    using<
        TQuery extends BaseQuery<any>
    >(
        query: TQuery    
    ): MutableMergeMatcher<
        TModel, 
        Table<BaseModel<BaseQueryMapOf<TQuery>>, "NONE">
    >;

    using<
        TSourceModel extends BaseModel<any>
    >(
        model: TSourceModel
    ): MutableMergeMatcher<
        TModel, 
        Table<TSourceModel, "NONE">
    >;
}

export interface MutableMergeByValues<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {
    row(
        ...values: __MutatedLiterals<TModel, TKeys>
    ): MutableMergeMatcher<TModel, PartialTable<TModel, TKeys[number]>>;

    rows(
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): MutableMergeMatcher<TModel, PartialTable<TModel, TKeys[number]>>;
}

export interface MutableMergeMatcher<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> {
    on(
        fn: (
            ctx: __MergeConditionContext<TModel, TSourceTableLike>
        ) => Predicate
    ): MutableMergeMatchable<TModel, TSourceTableLike>;
}

export interface MutableMergeMatchable<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> {
    matched(
        fn?: (ctx: __MergeMatchedContext<TModel, TSourceTableLike>) => void
    ): MutableMergeUnmatchable<TModel, TSourceTableLike>;
}

export interface MutableMergeUnmatchable<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> {
    unmatched(
        fn?: (ctx: __MergeUnmatchedContext<TModel, TSourceTableLike>) => void    
    ): Merge<TModel>;
}

export interface Merge<
    TModel extends AnyModel | AnyAssociationModel
> {
    execute(): Promise<ImportResult>;

    returning<
        const TKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
    >(
        ...keys: TKeys
    ): ReturnedMerge<TModel, TKeys>;
}

export interface ReturnedMerge<
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
