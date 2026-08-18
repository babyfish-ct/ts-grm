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

import { spi, ExpressionOrder, SubQueryProjection } from "@ts-grm/core";
import { 
    AbstractDtSubQueryImpl, 
    AbstractNumSubQueryImpl, 
    AbstractStrSubQueryImpl, 
    AbstractExprSubQueryImpl, 
    AbstractTupleSubQueryImpl 
} from "./abstract_sub_query_impl";
import { MutableSubQueryImpl } from "./mutable_sub_query_impl";

export class AtomTupleSubQueryImpl extends AbstractTupleSubQueryImpl implements spi.AtomQueryContract {

    readonly options: spi.AtomQueryOptions;

    constructor(
        readonly mutableQuery: MutableSubQueryImpl,
        readonly _projection: SubQueryProjection<any>,
        optins: spi.AtomQueryOptions | undefined
    ) {
        super();
        this.options = optins ?? spi.defaultAtomQueryOptions;
    }

    distinct(): AtomTupleSubQueryImpl {
        return new AtomTupleSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomTupleSubQueryImpl {
        return new AtomTupleSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, limit }
        );
    }

    offset(offset: number): AtomTupleSubQueryImpl {
        return new AtomTupleSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, offset }
        );
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

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }
}

export class AtomExprSubQueryImpl extends AbstractExprSubQueryImpl implements spi.AtomQueryContract {

    readonly options: spi.AtomQueryOptions;

    constructor(
        readonly mutableQuery: MutableSubQueryImpl,
        readonly _projection: SubQueryProjection<any>,
        optins: spi.AtomQueryOptions | undefined
    ) {
        super();
        this.options = optins ?? spi.defaultAtomQueryOptions;
    }

    distinct(): AtomExprSubQueryImpl {
        return new AtomExprSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomExprSubQueryImpl {
        return new AtomExprSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, limit }
        );
    }

    offset(offset: number): AtomExprSubQueryImpl {
        return new AtomExprSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, offset }
        );
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

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }
}

export class AtomNumSubQueryImpl extends AbstractNumSubQueryImpl implements spi.AtomQueryContract {

    readonly options: spi.AtomQueryOptions;

    constructor(
        readonly mutableQuery: MutableSubQueryImpl,
        readonly _projection: SubQueryProjection<any>,
        optins: spi.AtomQueryOptions | undefined
    ) {
        super();
        this.options = optins ?? spi.defaultAtomQueryOptions;
    }

    distinct(): AtomNumSubQueryImpl {
        return new AtomNumSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomNumSubQueryImpl {
        return new AtomNumSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, limit }
        );
    }

    offset(offset: number): AtomNumSubQueryImpl {
        return new AtomNumSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, offset }
        );
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

    get numericType(): spi.NumericType {
        const projection = this.projection;
        return projection.kind === "SUB_SINGLE"
            ? (projection.selection as spi.AbstractExpr<any>).numericType
            : spi.NumericType.NONE;
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }
}

export class AtomStrSubQueryImpl extends AbstractStrSubQueryImpl implements spi.AtomQueryContract {

    readonly options: spi.AtomQueryOptions;

    constructor(
        readonly mutableQuery: MutableSubQueryImpl,
        readonly _projection: SubQueryProjection<any>,
        optins: spi.AtomQueryOptions | undefined
    ) {
        super();
        this.options = optins ?? spi.defaultAtomQueryOptions;
    }

    distinct(): AtomStrSubQueryImpl {
        return new AtomStrSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomStrSubQueryImpl {
        return new AtomStrSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, limit }
        );
    }

    offset(offset: number): AtomStrSubQueryImpl {
        return new AtomStrSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, offset }
        );
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

    get level(): "SUB" {
        return "SUB";
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }
}

export class AtomDtSubQueryImpl extends AbstractDtSubQueryImpl implements spi.AtomQueryContract {

    readonly options: spi.AtomQueryOptions;

    constructor(
        readonly mutableQuery: MutableSubQueryImpl,
        readonly _projection: SubQueryProjection<any>,
        optins: spi.AtomQueryOptions | undefined
    ) {
        super();
        this.options = optins ?? spi.defaultAtomQueryOptions;
    }

    get kind(): "ATOM" {
        return "ATOM";
    }

    get isDistinct(): boolean {
        return this.options.distinct;
    }

    distinct(): AtomDtSubQueryImpl {
        return new AtomDtSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, distinct: true }
        );
    }

    limit(limit: number): AtomDtSubQueryImpl {
        return new AtomDtSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, limit }
        );
    }

    offset(offset: number): AtomDtSubQueryImpl {
        return new AtomDtSubQueryImpl(
            this.mutableQuery,
            this._projection,
            { ...this.options, offset }
        );
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

    get level(): "SUB" {
        return "SUB";
    }

    accept(visitor: spi.Visitor): void {
        visitor.visitAtomQuery(this);
    }
}
