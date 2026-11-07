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
import { __MergeContext, __MergeMetchedContext, __MergeUnmatchedContext, __MutatedLiterals, __MutatedMembers, __MutatedReturn, __MutatedValue } from "./mutate_internal_types";
import { BaseModel, BaseQuery, BaseQueryMapOf } from "./base_query";
import { Predicate } from "./expression";
import { __MakeType } from "./table_internal_types";
import { AtLeastOne } from "./utils";

export interface MutableMergeCreator<
    TModel extends AnyModel | AnyAssociationModel
> {
    using<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        keys: TKeys,
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): MutableMergeMatcher<TModel, TModel, true>;

    using<
        TQuery extends BaseQuery<any>
    >(
        query: TQuery    
    ): MutableMergeMatcher<TModel, BaseModel<BaseQueryMapOf<TQuery>>, false>;
}

export interface MutableMergeMatcher<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>,
    TUseValues extends boolean
> {

    on(
        fn: (
            ctx: __MergeContext<TModel, TSourceModel>
        ) => Predicate | null | undefined
    ): MutableMergeMatched<TModel, TSourceModel, TUseValues>;
}

export interface MutableMergeMatched<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>,
    TUseValues extends boolean
> {
    matched(
        fn?: (ctx: __MergeMetchedContext<TModel, TSourceModel>) => void
    ): MutableMergeUnmatched<TModel, TSourceModel, TUseValues>;
}

export interface MutableMergeUnmatched<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends AnyModel | AnyAssociationModel | BaseModel<any>,
    TUseValues extends boolean
> {
    unmatched(
        fn?: (ctx: __MergeUnmatchedContext<TModel, TSourceModel, TUseValues>) => void    
    ): Merge<TModel>;
}

export interface Merge<
    TModel extends AnyModel | AnyAssociationModel
> {
    execute(): Promise<void>;

    executeAndReturn<
        TKey extends keyof __MutatedMembers<TModel>,
        TNullAsUndefined extends boolean = false
    >(
        returnedKey: TKey,
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        ReadonlyArray<
            __MutatedReturn<__MutatedMembers<TModel>[TKey], TNullAsUndefined> 
        >
    >;
}
