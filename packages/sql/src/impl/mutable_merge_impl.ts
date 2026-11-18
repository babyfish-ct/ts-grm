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

import { SqlClientImplementor } from "@/sql_client";
import { __MergeContext, __MergeMetchedContext, __MergeUnmatchedContext, __MutatedLiterals, __MutatedMembers, __StaticEntityTableKeys, AnyAssociationModel, AnyModel, AtLeastOne, BaseModel, BaseQuery, BaseQueryMapOf, err, Merge, MutableMerge, MutableMergeByValues, MutableMergeMatcher, MutableMergeMatchable, MutableMergeUnmatchable, Predicate, Table, spi } from "@ts-grm/core";
import { MergeImpl } from "./merge_impl";
import { toTable } from "./utils";

export class MutableMergeImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements MutableMerge<TModel> {

    private readonly _table: any;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel
    ) {
        this._table = toTable(_model);
    }

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

    using<
        TSourceModel extends BaseModel<any>
    >(
        model: TSourceModel
    ): MutableMergeMatcher<
        TModel, 
        Table<TSourceModel, "NONE">,
        false
    >;

    using(
        ...args: ReadonlyArray<string>
    ): any {
        if (typeof args[0] === "string") {
            return new MutableMergeByValuesImpl(

            );
        }
    }
}

class MutableMergeByValuesImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements MutableMergeByValues<
    TModel,
    TSourceTableLike,
    TKeys
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _table: any,
        private readonly _keys: ReadonlyArray<string>,
        private readonly 
    ) {}

    row(
        ...values: __MutatedLiterals<TModel, TKeys>
    ): MutableMergeMatcher<TModel, TSourceTableLike, true> {
        return this.rows(values);
    }

    rows(
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): MutableMergeMatcher<TModel, TSourceTableLike, true> {
        if (rows.length === 0) {
            throw new err.ArgumentError(`The "rows.length" cannot be null`);
        }
        return new MutableMergeMatcherImpl(this._sqlClient);
    }
}

class MutableMergeMatcherImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TUseValues extends boolean
> implements MutableMergeMatcher<
    TModel,
    TSourceTableLike,
    TUseValues
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {}

    on(
        fn: (
            ctx: __MergeContext<TModel, TSourceTableLike>
        ) => Predicate
    ): MutableMergeMatchable<TModel, TSourceTableLike, TUseValues> {
        return new MutableMergeMatchableImpl(this._sqlClient);
    }
}

class MutableMergeMatchableImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TUseValues extends boolean
> implements MutableMergeMatchable<
    TModel,
    TSourceTableLike,
    TUseValues
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {}

    matched(
        fn?: (ctx: __MergeMetchedContext<TModel, TSourceTableLike>) => void
    ): MutableMergeUnmatchable<TModel, TSourceTableLike, TUseValues> {
        return new MutableMergeUnmatchableImpl(this._sqlClient);
    }
}

class MutableMergeUnmatchableImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike,
    TUseValues extends boolean
> implements MutableMergeUnmatchable<
    TModel,
    TSourceTableLike,
    TUseValues
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {}

    unmatched(
        fn?: (ctx: __MergeUnmatchedContext<TModel, TSourceTableLike, TUseValues>) => void    
    ): Merge<TModel> {
        throw new Error();
    }
}