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

import { 
    __MutatedLiterals,
    __MutatedMembers, 
    __MutatedValue, 
    AnyAssociationModel, 
    AnyModel, 
    AtLeastOne, 
    BaseModel, 
    BaseQueryProjection, 
    BaseQuerySelectMapArgs, 
    dsl, 
    err, 
    Insert, 
    InsertSource, 
    MutableInsert, 
    MutableInsertSourceContext, 
    MutableInsertSourceQuery, 
    OnConflictInsert, 
    spi,
    Table
} from "@ts-grm/core";
import { SqlClientImplementor } from "@/sql_client";
import { OnConflictInsertImpl } from "./insert_impl";
import { propsOf } from "./utils";

export class MutableInsertImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements MutableInsert<TModel, TKeys> {

    private readonly _props: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _model: TModel,
        private readonly _keys: TKeys
    ) {
        this._props = propsOf(_model, _keys as ReadonlyArray<string>);
    }
    
    row(
        ...values: __MutatedLiterals<TModel, TKeys>
    ): OnConflictInsert<TModel, TKeys> {
        return this.rows(values);
    }
    
    rows(
        ...rows: ReadonlyArray<__MutatedLiterals<TModel, TKeys>>
    ): OnConflictInsert<TModel, TKeys> {
        if (rows.length === 0) {
            throw new err.ArgumentError(
                `The "rows.length" cannot be 0`
            );
        }
        const sourceRows = rows.map(row => new SourceRowImpl(row));
        return new OnConflictInsertImpl<TModel, TKeys>(
            this._sqlClient,
            this._model,
            sourceRows,
            this._props,
            undefined
        );
    }

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

    using(
        ...args: ReadonlyArray<any>
    ): Insert<TModel> {
        if (typeof args[0] === "string") {
            return this._using(args[0] as "DERIVED" | "CTE", args[1]);
        }
        return this._using("DERIVED", args[0]);
    }

    private _using(
        kind: "DERIVED" | "CTE",
        fn: (
            ctx: MutableInsertSourceContext<{
                readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
            } & BaseQuerySelectMapArgs>
        ) => InsertSource<{
            readonly [K in TKeys[number]]: __MutatedMembers<TModel, true>[K & keyof __MutatedMembers<TModel, true>]
        } & BaseQuerySelectMapArgs>
    ): OnConflictInsert<TModel, TKeys> {
        const source = fn(new MutableInsertSourceContextImpl());
        const baseModel = (source as any as spi.BaseQueryImplementor<any>).toModel(kind === "CTE");
        const sourceTable = spi.createTypedBaseTable(baseModel, undefined);
        const bindings: Array<spi.Binding> = [];
        const size = this._keys.length;
        for (let i = 0; i < size; i++) {
            const valueExpr = (sourceTable as any)[this._keys[i] as string];
            bindings.push({
                prop: this._props[i]!,
                valueExpr
            });
        }
        return new OnConflictInsertImpl<TModel, TKeys>(
            this._sqlClient,
            this._model,
            baseModel,
            bindings,
            sourceTable
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

class MutableInsertSourceContextImpl<
    TSelectionMap extends BaseQuerySelectMapArgs
> implements MutableInsertSourceContext<
    TSelectionMap
> {
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
    ): InsertSource<TSelectionMap> {
        return dsl.baseQuery(...args) as any as InsertSource<TSelectionMap>;
    }

    union(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap> {
        return dsl.union(...sources as AtLeastOne<any>) as any;
    }

    unionAll(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap> {
        return dsl.unionAll(...sources as AtLeastOne<any>) as any;
    }

    except(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap> {
        return dsl.except(...sources as AtLeastOne<any>) as any;
    }

    exceptAll(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap> {
        return dsl.exceptAll(...sources as AtLeastOne<any>) as any;
    } 

    intersect(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap> {
        return dsl.intersect(...sources as AtLeastOne<any>) as any;
    }

    intersectAll(
        ...sources: AtLeastOne<InsertSource<TSelectionMap>>
    ): InsertSource<TSelectionMap> {
        return dsl.intersectAll(...sources as AtLeastOne<any>) as any;
    }
}

