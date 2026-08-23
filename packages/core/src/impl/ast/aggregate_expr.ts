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

import { AbstractExpr } from "./expr";
import { Visitor } from "./visitor";
import { Node } from "./node";
import { AbstractNumExpr } from "./num_expr";
import { ExplicitDataType } from "../explicit";

export class AggregateExpr<T extends number | string> extends AbstractNumExpr<T> implements Node {

    private readonly _explicitDataType: ExplicitDataType;

    constructor(
        readonly op: AggregatieOp,
        readonly expr: AbstractExpr<T> | undefined
    ) {
        super();
        this._explicitDataType = op === "COUNT"
            ? ExplicitDataType.INTEGER
            : expr!.explicitDataType;
    }

    accept(visitor: Visitor): void {
        visitor.visitAggregateExpr(this);
    }

    override get explicitDataType(): ExplicitDataType {
        return this._explicitDataType;
    }
}

export type AggregatieOp = "COUNT" | "SUM" | "MIN" | "MAX" | "AVG";