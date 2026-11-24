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
    dsl, 
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
import { entityOf } from "./insert_impl";
import { BaseModelImpl } from "./abstract_base_query_impl";
import { MergeImpl } from "./merge_impl";

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
        ...args: ReadonlyArray<any>
    ): any {
        const arg = args[0]!;
        if (typeof arg === "string") {
            return new MutableMergeByValuesImpl(
                this._sqlClient,
                this._model,
                args,
            );
        }
        if (arg instanceof BaseModelImpl) {
            return new MutableMergeMatcherImpl(
                this._sqlClient,
                this._model,
                arg,
                undefined,
                spi.createTypedBaseTable(arg, undefined),
            );
        }
        const baseModel: any = dsl.derivedModel(arg);
        return new MutableMergeMatcherImpl(
            this._sqlClient,
            this._model,
            baseModel,
            undefined,
            spi.createTypedBaseTable(baseModel, undefined),
        );
    }
}

class MutableMergeByValuesImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements MutableMergeByValues<
    TModel,
    TKeys
> {

    private readonly _valueProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _keys: ReadonlyArray<string>
    ) {
        const sortedKeys = [..._keys].sort();
        for (let i = 0; i < sortedKeys.length; i++) {
            if (i > 0 && sortedKeys[i - 1] === sortedKeys[i]) {
                throw new err.ArgumentError(`Duplicated key "${sortedKeys[i]}"`);
            }
        }
        const entity = entityOf(this._model);
        const props: Array<any> = [];
        for (const key of _keys) {
            const prop = entity.expandedPropMap.get(key);
            if (prop == null) {
                throw new err.ArgumentError(`No property key "${key}" in model "${entity.toString()}"`);
            }
            props.push(prop);
        }
        this._valueProps = props;
    }

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
        const sourceTable = toTable(this._model).__lock("__merged_source", this._keys) as any as PartialTable<TModel, TKeys[number]>;
        return new MutableMergeMatcherImpl(this._sqlClient, this._model, sourceRows, this._valueProps, sourceTable);
    }
}

class MutableMergeMatcherImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceTableLike extends __TableLike
> implements MutableMergeMatcher<
    TModel,
    TSourceTableLike                                                                       
> {
    private readonly _mergedTable: Table<TModel, "NONE">;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _source: Iterable<spi.SourceRow> | BaseModel<any>,
        private readonly _valueProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined,
        private readonly _sourceTable: TSourceTableLike
    ) {
        this._mergedTable = toTable(this._model) as any as Table<TModel, "NONE">;
    }

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
        const that = this;
        const ctx = new class implements __MergeConditionContext<TModel, TSourceTableLike> {
            readonly old = that._mergedTable;
            readonly new = that._sourceTable;
        }
        const predicate = fn(ctx);
        if (predicate == null) {
            throw new err.ArgumentError("The lambda of argument cannot return null or undefined");
        }
        return new MutableMergeMatchableImpl(
            this._sqlClient,
            this._model,
            this._source,
            this._valueProps,
            this._mergedTable,
            this._sourceTable,
            predicate as spi.AbstractPred
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
    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _source: Iterable<spi.SourceRow> | BaseModel<any>,
        private readonly _valueProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined,
        private readonly _mergedTable: Table<TModel, "NONE">,
        private readonly _sourceTable: TSourceTableLike,
        private readonly _predicate: spi.AbstractPred
    ) {
        
    }

    matched(
        fn?: (ctx: __MergeMatchedContext<TModel, TSourceTableLike>) => void
    ): MutableMergeUnmatchable<TModel, TSourceTableLike> {
        const bindings: Array<spi.Binding> = [];
        if (fn != null) {
            const that = this;
            const entity = entityOf(this._model);
            const ctx = new class implements __MergeMatchedContext<TModel, TSourceTableLike> {
                readonly old = that._mergedTable;
                readonly new = that._sourceTable;
                update<
                    TKey extends keyof __MutatedMembers<TModel>
                >(
                    key: TKey,
                    value: __MutatedValue<__MutatedMembers<TModel>[TKey & keyof __MutatedMembers<TModel>]>
                ): this {
                    const prop = entity.expandedPropMap.get(key as string);
                    if (prop == null) {
                        throw new err.ArgumentError(`There is no updatable key "${key as string}"`);
                    }
                    const valueExpr = value instanceof spi.AbstractExpr
                        ? value
                        : dsl.literal(value) as spi.AbstractExpr<any>;
                    bindings.push({prop, valueExpr});
                    return this;
                }
            };
            fn(ctx);
        }
        return new MutableMergeUnmatchableImpl(
            this._sqlClient,
            this._model,
            this._source,
            this._valueProps,
            this._mergedTable,
            this._sourceTable,
            this._predicate,
            bindings.length !== 0 ? bindings : undefined
        );
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
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel,
        private readonly _source: Iterable<spi.SourceRow> | BaseModel<any>,
        private readonly _valueProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined,
        private readonly _mergedTable: Table<TModel, "NONE">,
        private readonly _sourceTable: TSourceTableLike,
        private readonly _predicate: spi.AbstractPred,
        private readonly _matchedBindings: ReadonlyArray<spi.Binding> | undefined
    ) {}

    unmatched(
        fn?: (ctx: __MergeUnmatchedContext<TModel, TSourceTableLike>) => void    
    ): Merge<TModel> {
        const bindings: Array<spi.Binding> = [];
        if (fn != null) {
            const that = this;
            const entity = entityOf(this._model);
            const ctx = new class implements __MergeUnmatchedContext<TModel, TSourceTableLike> {
                readonly new = that._sourceTable;
                insert<
                    TKey extends keyof __MutatedMembers<TModel>
                >(
                    key: TKey,
                    value: __MutatedValue<__MutatedMembers<TModel>[TKey & keyof __MutatedMembers<TModel>]>
                ): this {
                    const prop = entity.expandedPropMap.get(key as string);
                    if (prop == null) {
                        throw new err.ArgumentError(`There is no updatable key "${key as string}"`);
                    }
                    const valueExpr = value instanceof spi.AbstractExpr
                        ? value
                        : dsl.literal(value) as spi.AbstractExpr<any>;
                    bindings.push({prop, valueExpr});
                    return this;
                }
            };
            fn(ctx);
        }
        return new MergeImpl<TModel>(
            this._sqlClient,
            this._source,
            this._valueProps,
            this._mergedTable as any,
            this._sourceTable as any,
            this._predicate as any,
            this._matchedBindings,
            bindings.length !== 0 ? bindings : undefined
        );
    }
}