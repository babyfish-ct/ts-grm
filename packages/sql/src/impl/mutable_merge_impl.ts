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
import { 
    __MergeConditionContext,
    __MergeMatchedContext,
    __MergeUnmatchedContext,
    __MutatedLiterals, 
    __MutatedMembers, 
    __MutatedValue, 
    __TableLike, 
    AnyAssociationModel, 
    AnyModel, 
    AtLeastOne, 
    BaseModel, 
    BaseQuery, 
    BaseQueryMapOf, 
    err, 
    Merge, 
    MutableMerge, 
    MutableMergeByValues, 
    MutableMergeMatchable, 
    MutableMergeMatcher, 
    MutableMergeUnmatchable, 
    PartialTable, 
    Predicate, 
    spi, 
    Table
} from "@ts-grm/core";
import { SourceRowImpl, toTable } from "./utils";

export class MutableMergeImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements MutableMerge<TModel> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel
    ) {
    }

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

    using(
        ...args: ReadonlyArray<string>
    ): any {
        if (typeof args[0] === "string") {
            return new MutableMergeByValuesImpl(
                this._sqlClient,
                this._model,
                args
            );
        }
        throw new Error();
    }
}

class MutableMergeByValuesImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements MutableMergeByValues<
    TModel,
    TKeys
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _keys: ReadonlyArray<string>
    ) {}

    row(
        ...values: __MutatedLiterals<TModel, TKeys>
    ): MutableMergeMatcher<TModel, PartialTable<TModel, TKeys[number]>> {
        return this.rows(values);
    }

    rows(
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): MutableMergeMatcher<TModel, PartialTable<TModel, TKeys[number]>> {
        if (rows.length === 0) {
            throw new err.ArgumentError(`The "rows.length" cannot be null`);
        }
        const sourceRows = rows.map(row => new SourceRowImpl(row));
        return new MutableMergeMatcherImpl(this._sqlClient, this._model, this._keys, sourceRows);
    }
}

class MutableMergeMatcherImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> implements MutableMergeMatcher<
    TModel,
    TSourceTableLike                                                                       
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _keys: ReadonlyArray<string>,
        private readonly _sourceRows: Iterable<spi.SourceRow>
    ) {}

    on(
        fn: (
            ctx: __MergeConditionContext<
                TModel, 
                TSourceTableLike
            >
        ) => Predicate
    ): MutableMergeMatchable<
        TModel, 
        TSourceTableLike
    > {
        return new MutableMergeMatchableImpl(
            this._sqlClient,
            this._model,
            this._keys,
            this._sourceRows,
            fn
        );
    }
}

class MutableMergeMatchableImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> implements MutableMergeMatchable<
    TModel,
    TSourceTableLike
> {

    private readonly _mergedTable: spi.AbstractTable;

    private readonly _sourceTable: spi.AbstractTable;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _keys: ReadonlyArray<string>,
        private readonly _sourceRows: Iterable<spi.SourceRow>,
        fn: (
            ctx: __MergeMatchedContext<
                TModel, 
                TSourceTableLike
            >
        ) => Predicate
    ) {
        this._mergedTable = toTable(this._model);
        this._sourceTable = toTable(this._model).__lock("__merged_src", this._keys);
    }

    matched(
        fn?: (ctx: __MergeMatchedContext<TModel, TSourceTableLike>) => void
    ): MutableMergeUnmatchable<TModel, TSourceTableLike> {
        return new MutableMergeUnmatchableImpl(this._sqlClient);
    }
}

class MutableMergeUnmatchableImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> implements MutableMergeUnmatchable<
    TModel, 
    TSourceTableLike
> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {}

    unmatched(
        fn?: (ctx: __MergeUnmatchedContext<TModel, TSourceTableLike>) => void    
    ): Merge<TModel> {
        throw new Error();
    }
}