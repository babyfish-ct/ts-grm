import { 
    __InsertConext,
    __MutatedLiterals,
    __MutatedMembers, 
    __MutatedValue, 
    AnyAssociationModel, 
    AnyModel, 
    AtLeastOne, 
    BaseModel, 
    BaseQuery, 
    BaseQueryMapOf, 
    dsl, 
    err, 
    Insert, 
    MutableInsert, 
    MutableInsertByBaseModel, 
    MutableInsertByValues, 
    spi,
    Table
} from "@ts-grm/core";
import { BaseModelImpl } from "./abstract_base_query_impl";
import { SqlClientImplementor } from "@/sql_client";
import { entityOf, InsertImpl } from "./insert_impl";
import { propsOf } from "./utils";

export class MutableInsertImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements MutableInsert<TModel> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: AnyModel | AnyAssociationModel
    ) {}
    
    using<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): MutableInsertByValues<TModel, TKeys>;

    using<
        TQuery extends BaseQuery<any>,
    >(
        query: TQuery,
    ): MutableInsertByBaseModel<
        TModel, 
        BaseModel<BaseQueryMapOf<TQuery>>
    >;

    using<
        TSourceModel extends BaseModel<any>
    >(
        model: TSourceModel
    ): MutableInsertByBaseModel<
        TModel, 
        TSourceModel
    >;

    using(
        ...args: ReadonlyArray<any>
    ): any {
        const first = args[0];
        if (typeof first === "string") {
            return new MutableInsertByValuesImpl(this._sqlClient, this._model, args as any);
        }
        if (first instanceof BaseModelImpl) {
            const baseModel = first as BaseModel<any>;
            return new MutableInsertByBaseModelImpl(this._sqlClient, this._model, baseModel);
        }
        const baseQuery = first as BaseQuery<any>;
        const baseModel = (baseQuery as any as spi.BaseQueryImplementor<any>)
            .toModel((baseQuery as any as spi.QueryContract).isRecursive);
        return new MutableInsertByBaseModelImpl(this._sqlClient, this._model, baseModel);
    }
}

class MutableInsertByValuesImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements MutableInsertByValues<
    TModel,
    TKeys
> {
    
    private readonly _props: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: TModel,
        keys: TKeys
    ) {
        this._props = propsOf(_model, keys as ReadonlyArray<string>);
    }

    values(
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): Insert<TModel> {
        const sourceRows = rows.map(row => new SourceRowImpl(row));
        return new InsertImpl(
            this._sqlClient,
            this._model,
            sourceRows,
            this._props,
            undefined
        );
    }
}

class MutableInsertByBaseModelImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends BaseModel<any>
> implements MutableInsertByBaseModel<
    TModel,
    TSourceModel
> {
    readonly new: Table<TSourceModel, "NONE">;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: TModel,
        private readonly _sourceMode: TSourceModel
    ) {
        this.new = spi.createTypedBaseTable(this._sourceMode as any, undefined) as any;
    }

    do(
        fn: (ctx: __InsertConext<TModel, TSourceModel>) => void
    ): Insert<TModel> {
        const ctx = new InsertContextImpl(this._model, this.new);
        fn(ctx);
        return new InsertImpl(
            this._sqlClient,
            this._model,
            this._sourceMode,
            ctx.bindings,
            this.new as any
        );
    }
}

class SourceRowImpl implements spi.SourceRow {

    constructor(
        private readonly _data: ReadonlyArray<any>
    ) {}

    get(col: number): any {
        return this._data[col];
    }
}

class InsertContextImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends BaseModel<any>
> implements __InsertConext<
    TModel,
    TSourceModel
> {
    private readonly _bindingMap = new Map<keyof __MutatedMembers<TModel>, spi.InsertBinding>();

    private _bindings: ReadonlyArray<spi.InsertBinding> | undefined = undefined;

    readonly new: Table<TSourceModel, "NONE">;

    constructor(
        private readonly _model: TModel,
        newTable: Table<TSourceModel, "NONE">
    ) {
        this.new = newTable;
    }

    insert<
        TKey extends keyof __MutatedMembers<TModel>
    >(
        key: TKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TKey]> 
    ): this {
        if (this._bindingMap.has(key)) {
            throw new err.ArgumentError(`Duplicated inserted key "${key.toString()}"`);
        }
        this._bindings = undefined;
        const entity = entityOf(this._model);
        if (entity instanceof spi.Entity) {
            const prop = key === "__typename" 
                ? new spi.TypeNameProp(entity, entity.tableSettings.discriminator!.name, undefined)
                : entity.expandedPropMap.get(key as string);
            if (prop == null) {
                throw new err.ArgumentError(
                    `There is no property "${key.toString()}" in the model "${entity.name}"`
                );
            }
            const valueExpr = value instanceof spi.AbstractExpr
                ? value
                : dsl.literal(value) as spi.AbstractExpr<any>;
            this._bindingMap.set(key, { prop, valueExpr })
        } else if (entity instanceof spi.AssociationEntity) {
            const prop = entity.expandedProps.get(key as string);
            if (prop == null) {
                throw new err.ArgumentError(
                    `There is no property "${key.toString()}" in the model "${entity.toString()}"`
                );
            }
            const valueExpr = value instanceof spi.AbstractExpr
                ? value
                : dsl.literal(value) as spi.AbstractExpr<any>;
            this._bindingMap.set(key, { prop, valueExpr });
        }
        return this;
    }

    get bindings(): ReadonlyArray<spi.InsertBinding> {
        let bindings = this._bindings;
        if (bindings == null) {
            this._bindings = bindings = Array.from(this._bindingMap.values());
        }
        return bindings;
    }
}

