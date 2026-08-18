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

import { spi, ExpressionLike, MutableSubQuery, SubQueryProjection, SubQuerySelectArrArgs } from "@ts-grm/core";
import { AbstractMutableQuery } from "./abstract_mutable_query";
import { AbstractSubQueryProjection } from "./query_projection";

export class MutableSubQueryImpl 
extends AbstractMutableQuery
implements MutableSubQuery {

    __type(): { mutableSubQuery: true; } {
        return { mutableSubQuery: true };
    }

    constructor(
        tables: ReadonlyArray<spi.AbstractTable>
    ) {
        super(tables);
    }

    select<
            const TExpressions extends SubQuerySelectArrArgs,
    >(
        ...expressions: TExpressions
    ): SubQueryProjection<TExpressions, "TUPLE">;

    select<TExpression extends ExpressionLike>(
        expression: TExpression
    ): SubQueryProjection<TExpression, "EXPRESSION">;

    select(...args: any[]): SubQueryProjection<any, any> {
        return AbstractSubQueryProjection.of(args, false);
    }

    selectDistinct<
            const TExpressions extends SubQuerySelectArrArgs,
    >(
        ...expressions: TExpressions
    ): SubQueryProjection<TExpressions, "TUPLE">;

    selectDistinct<TExpression extends ExpressionLike>(
        expression: TExpression
    ): SubQueryProjection<TExpression, "EXPRESSION">;

    selectDistinct(...args: any[]): SubQueryProjection<any, any> {
        return AbstractSubQueryProjection.of(args, true);
    }
}