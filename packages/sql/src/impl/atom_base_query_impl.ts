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
    spi,
    AtomBaseQuery, 
    BaseQueryMapOf, 
    ExpressionOrder, 
} from "@ts-grm/core";
import { MutableBaseQueryImpl } from "./mutable_base_query_impl";
import { MapBaseQueryProjection } from "./query_projection";
import { AbstractBaseQueryImpl } from "./abstract_base_query_impl";
import { RecursiveMutableBaseQueryImpl } from "./recursive_mutable_base_query_impl";

export class AtomBaseQueryImpl<TProjection> 
extends AbstractBaseQueryImpl<TProjection>
implements 
    AtomBaseQuery<TProjection>, 
    spi.BaseQueryImplementor<TProjection>, 
    spi.AtomQueryContract {

    readonly options: spi.AtomQueryOptions;

    constructor(
        readonly mutableQuery: MutableBaseQueryImpl,
        readonly recursivePred: spi.AbstractPred | undefined,
        readonly _projection: MapBaseQueryProjection<BaseQueryMapOf<TProjection>>,
        options: spi.AtomQueryOptions | undefined
    ) {
        super();
        this.options = options ?? spi.defaultAtomQueryOptions;
    }

    __type(): { 
        baseQuery: TProjection | true; 
        atomBaseQuery: TProjection | true;
    } {
        return { baseQuery: true, atomBaseQuery: true };
    }

    distinct(): AtomBaseQuery<TProjection> {
        return new AtomBaseQueryImpl(
            this.mutableQuery,
            this.recursivePred,
            this._projection,
            {...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomBaseQuery<TProjection> {
        return new AtomBaseQueryImpl(
            this.mutableQuery,
            this.recursivePred,
            this._projection,
            {...this.options, limit }
        );
    }

    offset(offset: number): AtomBaseQuery<TProjection> {
        return new AtomBaseQueryImpl(
            this.mutableQuery,
            this.recursivePred,
            this._projection,
            {...this.options, offset }
        );
    }

    get args(): BaseQueryMapOf<TProjection> {
        return this._projection.args;
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
        return this.mutableQuery instanceof RecursiveMutableBaseQueryImpl;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }
}
