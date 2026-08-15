import { spi, ExpressionOrder, AtomRootQuery, RootQueryProjection, RowTypeOf, FetchOptions, FetchRangeOptions, FetchPageOptions, Page, RootQuerySelection } from "@ts-grm/core";
import { MutableRootQueryImpl } from "./mutable_root_query_impl";
import { AbstractRootQueryProjection } from "./query_projection";
import { executeQuery } from "./query_executor/execute_query";
import { exeuctePageQuery, finalRangeOptions } from "./query_executor/execute_page_query";
import { NoDataError, TooManyDataError } from "@/error/data_error";
import { LambdaJoinFetchVisitor } from "./query_executor/join_fetch_visitor";
import { SqlClientImplementor } from "@/sql_client";
import { NumericTypeArrayProvider } from "./numeric_type_array_provider";

export class AtomRootQueryImpl<TProjection extends RootQueryProjection<any>> 
implements AtomRootQuery<TProjection>, spi.AtomQueryContract, NumericTypeArrayProvider {

    readonly options: spi.AtomQueryOptions;

    private _numericTypes: ReadonlyArray<spi.NumericType> | undefined = undefined;

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
        const rows = await this.fetchRange({
            ...options,
            limit: 2
        });
        switch (rows.length) {
            case 0:
                throw new NoDataError(`"fetchRequired" does not accpet empty result set`);
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchRequired" does not accpet multiple rows`);
        }
    }

    async fetchOptional<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<
        RowTypeOf<TProjection, TNullAsUndefined> 
        | TNullAsUndefined extends true ? undefined : null
    > {
        const rows = await this.fetchRange({
            ...options,
            limit: 2
        });
        switch (rows.length) {
            case 0:
                return ((options?.nullAsUndefined ?? false) ? undefined : null) as any;
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchRequired" does not accpet multiple rows`);
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

    get numericTypes(): ReadonlyArray<spi.NumericType> | undefined {
        let numericTypes = this._numericTypes;
        if (numericTypes == null) {
            const projection = this.projection;
            const numericTypeArrayCreator = new NumericTypeArrayCreator(this.mutableQuery.sqlClient);
            switch (projection.kind) {
                case "ROOT_SINGLE":
                    numericTypeArrayCreator.add(projection.selection);
                    break;
                case "ROOT_ARRAY":
                    for (const selection of projection.selections) {
                        numericTypeArrayCreator.add(selection);
                    }
                    break;
                case "ROOT_MAP":
                    for (const key in projection.selections) {
                        numericTypeArrayCreator.add(projection.selections[key]!);
                    }
                    break;
                default:
                    throw new Error("Internal bug");
            }
            this._numericTypes = numericTypes = numericTypeArrayCreator.create();
        }
        return numericTypes.length === 0 ? undefined : numericTypes;
    }
}

class NumericTypeArrayCreator {

    private _numericTypes: Array<spi.NumericType> | undefined = undefined;

    private _index = 0;

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {}

    add(selection: RootQuerySelection<any>): void {
        if (selection instanceof spi.FetchedViewImpl) {
            this._addFetchedView(selection);
        } else {
            if (selection instanceof spi.AbstractNumExpr) {
                this._addNumericType(selection.numericType);
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
                    this._addNumericType(field.prop.numericType);
                } else if (field.prop instanceof spi.SqlFormulaProp) {
                    this._addNumericType(field.prop.formula.numericType)
                }
                this._index++;
            }
        });
        joinFetchVisitor.visit(fetchedView.view.mapper);
    }

    private _addNumericType(
        numericType: spi.NumericType
    ): void {
        if (numericType == null) {
            return;
        }
        let numericTypes = this._numericTypes;
        if (numericTypes == null) {
            this._numericTypes = numericTypes = Array.from({length: this._index}, () => spi.NumericType.NONE);
        }
        numericTypes[this._index] = numericType;
    }

    create(): ReadonlyArray<spi.NumericType> {
        return this._numericTypes ?? [];
    }
}