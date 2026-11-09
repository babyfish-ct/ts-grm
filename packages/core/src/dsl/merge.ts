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
import { __MergeContext, __MergeMetchedContext, __MergeUnmatchedContext, __MutatedLiterals, __MutatedMembers, __MutatedReturn, __MutatedValue, __StaticEntityTableKeys } from "./mutate_internal_types";
import { BaseModel, BaseQuery, BaseQueryMapOf } from "./base_query";
import { Predicate } from "./expression";
import { __MakeType } from "./table_internal_types";
import { AtLeastOne } from "./utils";
import { Table } from "./table";
import { Importer } from "./importer";

export interface MutableMerge<
    TModel extends AnyModel | AnyAssociationModel
> {
    using<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): MutableMergeByValues<
        TModel, 
        Pick<Table<TModel, "NONE">, (TKeys[number] | __StaticEntityTableKeys) & keyof Table<TModel, "NONE">>, 
        TKeys
    >;

    using<
        TQuery extends BaseQuery<any>
    >(
        query: TQuery    
    ): MutableMergeMatcher<
        TModel, 
        Table<BaseModel<BaseQueryMapOf<TQuery>>, "NONE">, 
        false
    >;
}

export interface MutableMergeByValues<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {
    values(
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): MutableMergeMatcher<TModel, TSourceTableLike, true>;
}

export interface MutableMergeMatcher<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TUseValues extends boolean
> {

    on(
        fn: (
            ctx: __MergeContext<TModel, TSourceTableLike>
        ) => Predicate | null | undefined
    ): MutableMergeMatched<TModel, TSourceTableLike, TUseValues>;
}

export interface MutableMergeMatched<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TUseValues extends boolean
> {
    matched(
        fn?: (ctx: __MergeMetchedContext<TModel, TSourceTableLike>) => void
    ): MutableMergeUnmatched<TModel, TSourceTableLike, TUseValues>;
}

export interface MutableMergeUnmatched<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TUseValues extends boolean
> {
    unmatched(
        fn?: (ctx: __MergeUnmatchedContext<TModel, TSourceTableLike, TUseValues>) => void    
    ): Importer<TModel>;
}
