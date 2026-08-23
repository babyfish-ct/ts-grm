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

import { ArgumentError } from "@/error/common";
import { AbstractDtExpr } from "./dt_expr";
import { Node } from "./node";
import { AbstractNumExpr } from "./num_expr";
import { QueryContract } from "./query";
import { AbstractStrExpr } from "./str_expr";
import { Visitor } from "./visitor";
import { AbstractPred } from "./pred";
import { ExplicitDataType } from "../explicit";

export interface SubQueryExprContract extends Node {
    readonly op: SubQueryExprOp;
    readonly subQuery: QueryContract;
}

export type SubQueryExprOp = "ALL" | "ANY";

export function subQueryExpr(
    op: SubQueryExprOp,
    subQuery: QueryContract
): SubQueryExprContract {
    if (subQuery instanceof AbstractNumExpr) {
        return new NumSubQueryExpr(op, subQuery);
    }
    if (subQuery instanceof AbstractStrExpr) {
        return new StrSubQueryExpr(op, subQuery);
    }
    if (subQuery instanceof AbstractDtExpr) {
        return new DtSubQueryExpr(op, subQuery);
    }
    throw new ArgumentError("The arugment must subquery which returns number, string or Date");
}

class NumSubQueryExpr extends AbstractNumExpr<any> implements SubQueryExprContract {

    private readonly _explicitDataType: ExplicitDataType;

    constructor(
        readonly op: SubQueryExprOp,
        readonly subQuery: QueryContract
    ) {
        super();
        this._explicitDataType = subQuery.projection.kind === "SUB_SINGLE"
                ? (subQuery.projection.selection as AbstractNumExpr<any>).explicitDataType
                : ExplicitDataType.INTEGER;
    }

    override accept(visitor: Visitor): void {
        visitor.visitSubQueryExpr(this);
    }

    override get explicitDataType(): ExplicitDataType {
        return this._explicitDataType;
    }
}

class StrSubQueryExpr extends AbstractStrExpr implements SubQueryExprContract {

    constructor(
        readonly op: SubQueryExprOp,
        readonly subQuery: QueryContract
    ) {
        super();
    }

    accept(visitor: Visitor): void {
        visitor.visitSubQueryExpr(this);
    }
}

class DtSubQueryExpr extends AbstractDtExpr implements SubQueryExprContract {

    constructor(
        readonly op: SubQueryExprOp,
        readonly subQuery: QueryContract
    ) {
        super();
    }

    accept(visitor: Visitor): void {
        visitor.visitSubQueryExpr(this);
    }
}

export class ExistsPred extends AbstractPred {

    constructor(
        readonly subQuery: QueryContract,
        readonly neg: boolean
    ) {
        super();
    }

    negative(): AbstractPred {
        return new ExistsPred(
            this.subQuery,
            !this.neg
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitExistsPred(this);
    }
}