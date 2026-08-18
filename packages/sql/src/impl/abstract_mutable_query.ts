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

import { dsl, err, spi, ExpressionLike, ExpressionOrder, Predicate } from "@ts-grm/core";

export class AbstractMutableQuery {

    private _predicate: Predicate | undefined = undefined;

    private readonly _orders: Array<ExpressionOrder> = [];

    private _groupByExprs: ReadonlyArray<ExpressionLike> | undefined = undefined;

    private _havingPredicate: Predicate | undefined = undefined;

    constructor(
        readonly tables: ReadonlyArray<spi.AbstractTable>
    ) {}

    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this {
        this._predicate = dsl.and(this._predicate, ...predicates);
        return this;
    }

    orderBy(
        ...orders: ReadonlyArray<ExpressionLike | ExpressionOrder>
    ): this {
        for (const value of orders) {
            if (value != null) {
                if (value instanceof ExpressionOrder) {
                    this._orders.push(value);
                } else {
                    this._orders.push(
                        new ExpressionOrder(value, false, "UNSPECIFIED")
                    );
                }
            }
        }
        return this;
    }

    groupBy(
        ...expressions: ReadonlyArray<ExpressionLike>
    ): this {
        if (this._groupByExprs != null) {
            throw new err.StateError(`"groupBy" can nonly be invoked once`);   
        }
        if (expressions.length === 0) {
            throw new err.ArgumentError("The argument cannot be empty");
        }
        this._groupByExprs = [...expressions];
        return this;
    }

    having(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this {
        if (this._groupByExprs == null) {
            throw new err.StateError(`"having" cannot be invoked before "groupBy"`);
        }
        this._havingPredicate = dsl.and(this._havingPredicate, ...predicates);
        return this;
    }

    get wherePred(): spi.AbstractPred | undefined {
        return this._predicate as spi.AbstractPred | undefined;
    }
    
    get orders(): ReadonlyArray<ExpressionOrder> {
        return this._orders;
    }
    
    get groupByExprs(): ReadonlyArray<spi.AbstractExpr<any>> | undefined {
        return this._groupByExprs as ReadonlyArray<spi.AbstractExpr<any>> | undefined;
    }
    
    get havingPred(): spi.AbstractPred | undefined {
        return this._havingPredicate as spi.AbstractPred | undefined;
    }
}