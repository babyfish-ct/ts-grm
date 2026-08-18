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

import { Predicate } from "@/dsl/expression";
import { AbstractExpr } from "./expr";
import { Visitor } from "./visitor";
import { QueryContract } from "./query";
import { AbstractEsExpr } from "./es_expr";

export abstract class AbstractPred extends AbstractExpr<boolean> {

    abstract negative(): AbstractPred;
}

export class ConstantPred extends AbstractPred {

    static TRUE = new ConstantPred(true);

    static FALSE = new ConstantPred(false);

    private constructor(
        readonly value: boolean
    ) {
        super();
    }

    accept(visitor: Visitor): void {
        visitor.visitConstantPred(this);
    }

    negative(): ConstantPred {
        return this.value ? ConstantPred.FALSE : ConstantPred.TRUE;
    }
}

export class CmpPred extends AbstractPred {

    constructor(
        readonly op: CmpOp,
        readonly leftExpr: AbstractExpr<any>,
        readonly rightExpr: AbstractExpr<any>
    ) {
        super();
    }

    negative(): CmpPred {
        return new CmpPred(
            negativeCmpOp(this.op), 
            this.leftExpr, 
            this.rightExpr
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitCmpPred(this);
    }
}

export type CmpOp = "=" | "<>" | "<" | "<=" | ">" | ">=";

function negativeCmpOp(op: CmpOp): CmpOp {
    switch (op) {
        case "=":
            return "<>";
        case "<>":
            return "=";
        case "<":
            return ">=";
        case "<=":
            return ">";
        case ">":
            return "<=";
        case ">=":
            return "<";
    }
}

export class BetweenPred extends AbstractPred {

    constructor(
        readonly expr: AbstractExpr<any>,
        readonly minExpr: AbstractExpr<any>,
        readonly maxExpr: AbstractExpr<any>,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): AbstractPred {
        return new BetweenPred(
            this.expr,
            this.minExpr,
            this.maxExpr,
            !this.neg
        )
    }

    accept(visitor: Visitor): void {
        visitor.visitBetweenPred(this);
    }
}

export class LikePred extends AbstractPred {

    constructor(
        readonly expr: AbstractExpr<string>,
        readonly pattern: AbstractExpr<string>,
        readonly insensitive: boolean,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): LikePred {
        return new LikePred(
            this.expr,
            this.pattern,
            this.insensitive,
            !this.neg
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitLikePred(this);
    }
}

export class NullityPred extends AbstractPred {

    constructor(
        readonly expr: AbstractExpr<any>,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): NullityPred {
        return new NullityPred(this.expr, !this.neg);
    }

    accept(visitor: Visitor): void {
        visitor.visitNullityPred(this);
    }
}

export class InCollectionPred<T> extends AbstractPred {

    constructor(
        readonly expr: AbstractExpr<T>,
        readonly values: ReadonlyArray<AbstractExpr<T>>,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): InCollectionPred<T> {
        return new InCollectionPred(
            this.expr,
            this.values,
            !this.neg
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitInCollectionPred(this);
    }
}

export class InSubQueryPred extends AbstractPred {

    constructor(
        readonly expr: AbstractExpr<any>,
        readonly subQuery: QueryContract,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): AbstractPred {
        return new InSubQueryPred(
            this.expr,
            this.subQuery,
            !this.neg
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitInSubQueryPred(this);
    }
}

export class CompoundPred extends AbstractPred {

    constructor(
        readonly op: CompoundOp,
        readonly preds: ReadonlyArray<AbstractPred>
    ) {
        super();
    }

    override negative(): AbstractPred {
        const newOp = this.op === "AND" ? "OR" : "AND";
        const newPreds = this.preds.map(pred => pred.negative());
        return new CompoundPred(newOp, newPreds);
    }

    static of(op: CompoundOp, exprs: ReadonlyArray<Predicate | null | undefined>): AbstractPred | undefined {
        if (exprs == null) {
            return undefined;
        }
        const preds: Array<AbstractPred> = [];
        for (const expr of exprs) {
            if (expr instanceof CompoundPred) {
                if (expr.op === op) {
                    preds.push(...expr.preds);
                } else {
                    preds.push(expr);
                }
            } else if (expr instanceof AbstractPred) {
                preds.push(expr);
            } else if (expr instanceof AbstractExpr) {
                preds.push(expr.eq(true) as AbstractPred);
            }
        }
        switch (preds.length) {
            case 0:
                return undefined;
            case 1:
                return preds[0];
            default:
                return new CompoundPred(op, preds);
        }
    }

    accept(visitor: Visitor): void {
        visitor.visitCompoundPred(this);
    }
}

export type CompoundOp = "AND" | "OR";

export class EsOpPred extends AbstractPred {

    constructor(
        readonly op: EsOp,
        readonly expr: AbstractEsExpr<any>,
        readonly values: ReadonlyArray<string>
    ) {
        super();
    }

    override negative(): AbstractPred {
        switch (this.op) {
            case "CONTAINS_ANY":
                return new EsOpPred("NOT_CONTAINS_ANY", this.expr, this.values);
            case "NOT_CONTAINS_ANY":
                return new EsOpPred("CONTAINS_ANY", this.expr, this.values);
            case "CONTAINS_ALL":
                return new EsOpPred("NOT_CONTAINS_ALL", this.expr, this.values);
            case "NOT_CONTAINS_ALL":
                return new EsOpPred("CONTAINS_ALL", this.expr, this.values);
        }
    }

    accept(visitor: Visitor): void {
        visitor.visitEsOpPred(this);
    }
}

export type EsOp = "CONTAINS_ANY" | "NOT_CONTAINS_ANY" | "CONTAINS_ALL" | "NOT_CONTAINS_ALL";