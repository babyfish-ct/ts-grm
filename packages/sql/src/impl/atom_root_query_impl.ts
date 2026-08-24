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

import { spi, ExpressionOrder, AtomRootQuery, RootQueryProjection, RowTypeOf, FetchOptions, FetchRangeOptions, FetchPageOptions, Page, RootQuerySelection } from "@ts-grm/core";
import { MutableRootQueryImpl } from "./mutable_root_query_impl";
import { AbstractRootQueryProjection } from "./query_projection";
import { executeQuery } from "./query_executor/execute_query";
import { exeuctePageQuery, finalRangeOptions } from "./query_executor/execute_page_query";
import { NoDataError, TooManyDataError } from "@/error/data_count_error";
import { LambdaJoinFetchVisitor } from "./query_executor/join_fetch_visitor";
import { SqlClientImplementor } from "@/sql_client";
import { ExplicitDataTypeArrayProvider } from "./numeric_type_array_provider";

export class AtomRootQueryImpl<TProjection extends RootQueryProjection<any>> 
implements AtomRootQuery<TProjection>, spi.AtomQueryContract, ExplicitDataTypeArrayProvider {

    readonly options: spi.AtomQueryOptions;

    private _explicitDataTypes: ReadonlyArray<spi.ExplicitDataType> | undefined = undefined;

    constructor(
        readonly mutableQuery: MutableRootQueryImpl,
        private readonly _projection: AbstractRootQueryProjection<any>,
        options: spi.AtomQueryOptions | undefined
    ) {
        this.options = options ?? spi.defaultAtomQueryOptions;
    }

    __type(): { 
        rootQuery: TProjection | true; 
        atomRootQuery: TProjection | true;
    } {
        return { rootQuery: true, atomRootQuery: true };
    }

    get level(): "ROOT" {
        return "ROOT";
    }

    distinct(): AtomRootQuery<TProjection> {
        return new AtomRootQueryImpl(
            this.mutableQuery,
            this._projection,
            {...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomRootQuery<TProjection> {
        return new AtomRootQueryImpl(
            this.mutableQuery,
            this._projection,
            {...this.options, limit }
        );
    }

    offset(offset: number): AtomRootQuery<TProjection> {
        return new AtomRootQueryImpl(
            this.mutableQuery,
            this._projection,
            {...this.options, offset }
        );
    }

    async fetchList<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<Array<RowTypeOf<TProjection, TNullAsUndefined>>> {
        const sqlClient = this.mutableQuery.sqlClient;
        if (!sqlClient.isValidated) {
            await sqlClient.validate();
        }
        return await executeQuery(
            this, 
            options?.nullAsUndefined ?? false, 
            finalRangeOptions(undefined, this.options),
            sqlClient.options.maxJoinFetchOffset
        ) as Array<RowTypeOf<TProjection, TNullAsUndefined>>;
    }

    async fetchRange<
        TNullAsUndefined extends boolean = false
    >(
        options: FetchRangeOptions & FetchOptions<TNullAsUndefined>
    ): Promise<Array<RowTypeOf<TProjection, TNullAsUndefined>>> {
        const sqlClient = this.mutableQuery.sqlClient;
        if (!sqlClient.isValidated) {
            await sqlClient.validate();
        }
        return await executeQuery(
            this, 
            options?.nullAsUndefined ?? false, 
            finalRangeOptions(options, this.options),
            sqlClient.options.maxJoinFetchOffset
        ) as Array<RowTypeOf<TProjection, TNullAsUndefined>>;
    }

    async fetchPage<
        TNullAsUndefined extends boolean = false
    >(
        options: FetchPageOptions & FetchOptions<TNullAsUndefined>
    ): Promise<Page<RowTypeOf<TProjection, TNullAsUndefined>>> {
        const sqlClient = this.mutableQuery.sqlClient;
        if (!sqlClient.isValidated) {
            await sqlClient.validate();
        }
        return await exeuctePageQuery(this, options);
    }

    async fetchRequired<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<RowTypeOf<TProjection, TNullAsUndefined>> {
        const sqlClient = this.mutableQuery.sqlClient;
        if (!sqlClient.isValidated) {
            await sqlClient.validate();
        }
        const rows = await executeQuery(
            this, 
            options?.nullAsUndefined ?? false, 
            "UNIQUE",
            sqlClient.options.maxJoinFetchOffset
        ) as Array<RowTypeOf<TProjection, TNullAsUndefined>>;
        switch (rows.length) {
            case 0:
                throw new NoDataError(`"fetchRequired" does not accept empty result set`);
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchRequired" does not accept multiple rows`);
        }
    }

    async fetchOptional<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<
        RowTypeOf<TProjection, TNullAsUndefined> 
        | TNullAsUndefined extends true ? undefined : null
    > {
        const sqlClient = this.mutableQuery.sqlClient;
        if (!sqlClient.isValidated) {
            await sqlClient.validate();
        }
        const rows = await executeQuery(
            this, 
            options?.nullAsUndefined ?? false, 
            "UNIQUE",
            sqlClient.options.maxJoinFetchOffset
        ) as Array<RowTypeOf<TProjection, TNullAsUndefined>>;
        switch (rows.length) {
            case 0:
                return ((options?.nullAsUndefined ?? false) ? undefined : null) as any;
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchOptional" does not accept multiple rows`);
        }
    }

    async fetchCount(): Promise<number> {
        const sqlClient = this.mutableQuery.sqlClient;
        if (!sqlClient.isValidated) {
            await sqlClient.validate();
        }
        const rows = await executeQuery(this, false, "COUNT", undefined); 
        return rows[0]!;
    }

    get kind(): "ATOM" {
        return "ATOM";
    }

    get isDistinct(): boolean {
        return this.options.distinct;
    }

    get tables(): ReadonlyArray<spi.AbstractTable> {
        return this.mutableQuery.tables;
    }
    
    get wherePred(): spi.AbstractPred | undefined {
        return this.mutableQuery.wherePred;
    }
    
    get orders(): ReadonlyArray<ExpressionOrder> {
        return this.mutableQuery.orders;
    }
    
    get groupByExprs(): ReadonlyArray<spi.AbstractExpr<any>> | undefined {
        return this.mutableQuery.groupByExprs;
    }
    
    get havingPred(): spi.AbstractPred | undefined {
        return this.mutableQuery.havingPred;
    }

    get projection(): spi.ProjectionContract {
        return this._projection as any as spi.ProjectionContract;
    }

    get isRecursive(): boolean {
        return false;
    }

    get recursivePred(): spi.AbstractPred | undefined {
        return undefined;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }

    toCount(): AtomRootQueryImpl<any> | undefined {
        if (this.mutableQuery.groupByExprs != null) {
            return undefined;
        }
        switch (this.projection.kind) {
            case "ROOT_SINGLE":
                if (this.projection.selection instanceof spi.AggregateExpr) {
                    return undefined;
                }
                break;
            case "ROOT_ARRAY":
                for (const selection of this.projection.selections) {
                    if (selection instanceof spi.AggregateExpr) {
                        return undefined;
                    }
                }
                break;
            case "ROOT_MAP":
                for (const key in this.projection.selections) {
                    if (this.projection.selections[key] instanceof spi.AggregateExpr) {
                        return undefined;
                    }
                }
                break;
        }
        return new AtomRootQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, countMode: true }
        );
    }

    get explicitDataTypes(): ReadonlyArray<spi.ExplicitDataType> | undefined {
        let explicitDataTypes = this._explicitDataTypes;
        if (explicitDataTypes == null) {
            const projection = this.projection;
            const explicitDataTypeArrayCreator = new ExplicitDataTypeArrayCreator(this.mutableQuery.sqlClient);
            switch (projection.kind) {
                case "ROOT_SINGLE":
                    explicitDataTypeArrayCreator.add(projection.selection);
                    break;
                case "ROOT_ARRAY":
                    for (const selection of projection.selections) {
                        explicitDataTypeArrayCreator.add(selection);
                    }
                    break;
                case "ROOT_MAP":
                    for (const key in projection.selections) {
                        explicitDataTypeArrayCreator.add(projection.selections[key]!);
                    }
                    break;
                default:
                    throw new Error("Internal bug");
            }
            this._explicitDataTypes = explicitDataTypes = explicitDataTypeArrayCreator.create();
        }
        return explicitDataTypes.length === 0 ? undefined : explicitDataTypes;
    }
}

class ExplicitDataTypeArrayCreator {

    private _explicitDataTypes: Array<spi.ExplicitDataType> | undefined = undefined;

    private _index = 0;

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {}

    add(selection: RootQuerySelection<any>): void {
        if (selection instanceof spi.FetchedViewImpl) {
            this._addFetchedView(selection);
        } else {
            if (selection instanceof spi.AbstractExpr) {
                this._addExplicitDataType(selection.explicitDataType);
            }
            this._index++;
        }
    }

    private _addFetchedView(
        fetchedView: spi.FetchedViewImpl<any, any>
    ): void {
        const joinFetchVisitor = new LambdaJoinFetchVisitor(this._sqlClient, {
            visitField: field => {
                if (field.columnIndex == null) {
                    return;
                }
                if (field.prop instanceof spi.EntityProp) {
                    this._addExplicitDataType(field.prop.explicitDataType);
                } else if (field.prop instanceof spi.SqlFormulaProp) {
                    this._addExplicitDataType(field.prop.formula.explicitDataType)
                }
                this._index++;
            }
        });
        joinFetchVisitor.visit(fetchedView.view.mapper);
    }

    private _addExplicitDataType(
        explicitDataType: spi.ExplicitDataType
    ): void {
        if (explicitDataType == spi.ExplicitDataType.NONE) {
            return;
        }
        let explicitDataTypes = this._explicitDataTypes;
        if (explicitDataTypes == null) {
            this._explicitDataTypes = explicitDataTypes = Array.from({length: this._index}, () => spi.ExplicitDataType.NONE);
        }
        explicitDataTypes[this._index] = explicitDataType;
    }

    create(): ReadonlyArray<spi.ExplicitDataType> {
        return this._explicitDataTypes ?? [];
    }
}