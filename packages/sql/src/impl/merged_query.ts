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

import { spi, BaseQuery, BaseQueryMapOf, FetchOptions, FetchPageOptions, FetchRangeOptions, Page, RootQuery, RootQueryProjection, RowTypeOf, err } from "@ts-grm/core";
import { AbstractBaseQueryImpl } from "./abstract_base_query_impl";
import { AbstractDtSubQueryImpl, AbstractExprSubQueryImpl, AbstractNumSubQueryImpl, AbstractStrSubQueryImpl, AbstractTupleSubQueryImpl } from "./abstract_sub_query_impl";
import { SqlClientImplementor } from "@/sql_client";
import { AtomRootQueryImpl } from "./atom_root_query_impl";
import { executeQuery } from "./query_executor/execute_query";
import { exeuctePageQuery, finalRangeOptions } from "./query_executor/execute_page_query";
import { NoDataError, TooManyDataError } from "@/error/data_error";
import { NumericTypeArrayProvider } from "./numeric_type_array_provider";

export class MergedRootQueryImpl<
    TProjection extends RootQueryProjection<any>
> implements RootQuery<TProjection>, spi.MergedQueryContract, NumericTypeArrayProvider {

    private readonly _sqlClient: SqlClientImplementor;

    private readonly _numericTypes: ReadonlyArray<spi.NumericType> | undefined;

    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        if (queries.length < 2) {
            throw new err.ArgumentError("The length of queries cannot be less than 2");
        }
        validateNoOrderClause(kind, queries);
        let sqlClient: SqlClientImplementor | undefined = undefined;
        for (const query of queries) {
            const sc = query instanceof AtomRootQueryImpl
                ? query.mutableQuery.sqlClient
                : (query as MergedRootQueryImpl<any>).sqlClient;
            if (sqlClient == null) {
                sqlClient = sc;
            } else if (sqlClient !== sc) {
                throw new err.ArgumentError("Cannot merge difference root queries created by different sqlClient");
            }
        }
        this._numericTypes = (queries[0] as any as NumericTypeArrayProvider).numericTypes;
        this._sqlClient = sqlClient!;
    }

    __type(): { rootQuery: TProjection | true; } {
        return { rootQuery: true };
    }

    get level(): "ROOT" {
        return "ROOT";
    }
    
    async fetchList<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<Array<RowTypeOf<TProjection, TNullAsUndefined>>> {
        if (!this._sqlClient.isValidated) {
            await this._sqlClient.validate();
        }
        return await executeQuery(
            this, 
            options?.nullAsUndefined ?? false, 
            undefined,
            this.sqlClient.options.maxJoinFetchOffset
        ) as Array<RowTypeOf<TProjection, TNullAsUndefined>>;
    }

    async fetchRange<
        TNullAsUndefined extends boolean = false
    >(
        options: FetchRangeOptions & FetchOptions<TNullAsUndefined>
    ): Promise<Array<RowTypeOf<TProjection, TNullAsUndefined>>> {
        if (!this._sqlClient.isValidated) {
            await this._sqlClient.validate();
        }
        return await executeQuery(
            this, 
            options.nullAsUndefined ?? false, 
            finalRangeOptions(options, undefined),
            this._sqlClient.options.maxJoinFetchOffset
        ) as Array<RowTypeOf<TProjection, TNullAsUndefined>>;
    }

    async fetchPage<
        TNullAsUndefined extends boolean = false
    >(
        options: FetchPageOptions & FetchOptions<TNullAsUndefined>
    ): Promise<Page<RowTypeOf<TProjection, TNullAsUndefined>>> {
        if (!this._sqlClient.isValidated) {
            await this._sqlClient.validate();
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
        if (!this._sqlClient.isValidated) {
            await this._sqlClient.validate();
        }
        const rows = await executeQuery(this, false, "COUNT", undefined);
        return rows[0];
    }

    get isRecursive(): boolean {
        return false;
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }

    get sqlClient(): SqlClientImplementor {
        const q = this.queries[0] as spi.QueryContract;
        if (q.kind === "ATOM") {
            return (q as AtomRootQueryImpl<any>).mutableQuery.sqlClient;
        }
        return (q as MergedRootQueryImpl<any>).sqlClient;
    }

    get numericTypes(): ReadonlyArray<spi.NumericType> | undefined {
        return this._numericTypes;
    }
}

export class MergedBaseQueryImpl<TProjection>
extends AbstractBaseQueryImpl<TProjection>
implements BaseQuery<TProjection>, spi.MergedQueryContract {

    __type(): { baseQuery: TProjection | true; } {
        return { baseQuery: true };
    }

    readonly isRecursive: boolean;
    
    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        super();
        validateNoOrderClause(kind, queries);
        let recursive = false;
        for (const query of queries) {
            if (query.isRecursive) {
                recursive = true;
                break;
            } 
        }
        this.isRecursive = recursive;
    }
    
    get args(): BaseQueryMapOf<TProjection> {
        return (this.queries[0]! as any as AbstractBaseQueryImpl<TProjection>).args;
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }
}

export class MergedTupleSubQueryImpl
extends AbstractTupleSubQueryImpl
implements spi.MergedQueryContract {
    
    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        super();
        validateNoOrderClause(kind, queries);
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }
}

export class MergedExprSubQueryImpl
extends AbstractExprSubQueryImpl
implements spi.MergedQueryContract {
    
    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        super();
        validateNoOrderClause(kind, queries);
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }
}

export class MergedNumSubQueryImpl
extends AbstractNumSubQueryImpl
implements spi.MergedQueryContract {
    
    private readonly _numericType: spi.NumericType;

    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        super();
        validateNoOrderClause(kind, queries);
        this._numericType = queries.reduce(
            (max: spi.NumericType, query: spi.QueryContract) => 
                spi.mergeNumericType(
                    max, 
                    query.projection.kind === "SUB_SINGLE"
                        ? (query.projection.selection as spi.AbstractExpr<any>).numericType
                        : spi.NumericType.NONE
                ),
            spi.NumericType.NONE
        )
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    override accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }

    override get numericType(): spi.NumericType {
        return this._numericType;
    }
}

export class MergedStrSubQueryImpl
extends AbstractStrSubQueryImpl
implements spi.MergedQueryContract {
    
    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        super();
        validateNoOrderClause(kind, queries);
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }
}

export class MergedDtSubQueryImpl
extends AbstractDtSubQueryImpl
implements spi.MergedQueryContract {
    
    constructor(
        readonly kind: spi.MergedQueryKind,
        readonly queries: ReadonlyArray<spi.QueryContract>
    ) {
        super();
        validateNoOrderClause(kind, queries);
    }

    get level(): "SUB" {
        return "SUB";
    }

    get projection(): spi.ProjectionContract {
        return this.queries[0]!.projection;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitMergedQuery(this);
    }
}

function validateNoOrderClause(
    kind: spi.MergedQueryKind,
    queries: ReadonlyArray<spi.QueryContract>
) {
    let size = queries.length;
    for (let i = 0; i < size; i++) {
        if (queries[i]!.kind === "ATOM") {
            const atomQuery = queries[i] as spi.AtomQueryContract;
            if (atomQuery.orders.length !== 0) {
                throw new err.ArgumentError(
                    `Unable to compose a "${kind}" set operation query: sub-query at index ${i} ` + 
                    `contains an "order by" clause, ` +
                    `but no database guarantees that the ordering of an individual branch is preserved ` +
                    `after a set operation (UNION, UNION ALL, EXCEPT, EXCEPT ALL, INTERSECT, or ` +
                    `INTERSECT ALL) is applied, so ordering a branch on its own is meaningless. ` +
                    `To fix this, remove the "order by" clause from this sub-query, and if you need the ` +
                    `combined result to be ordered, apply "order by" on top of the "base-query" API ` +
                    `(a derived table or CTE) instead.`
                );
            }
        }
    }
}