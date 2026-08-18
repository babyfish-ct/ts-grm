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
import { AbstractExpr } from "./expr";
import { AbstractNumExpr } from "./num_expr";
import { AbstractStrExpr } from "./str_expr";
import { AbstractEsExpr } from "./es_expr";
import { AbstractDtExpr } from "./dt_expr";
import { Visitor } from "./visitor";
import { NumericType } from "../numeric";

export function createLiteral(
    value: any,
    as?: "AS_NUMBER" | "AS_ENUM_SET"
): AbstractExpr<any> {
    if (value == null) {
        throw new ArgumentError("The argument cannot be null");
    }
    switch (typeof value) {
        case "string":
            return as === "AS_NUMBER"
                    ? new LiteralNumExpr(value, NumericType.STRING)
                : as === "AS_ENUM_SET"
                    ? new LiteralEsExpr(value)
                : new LiteralStrExpr(value);
        case "number":
            return new LiteralNumExpr(value, NumericType.INTEGER);
        default:
            if (value instanceof Date) {
                return new LiteralDtExpr(value);
            }
            return new LiteralExpr(value);
    }   
}

export interface ValueExprContract {
    readonly isConstant: boolean;
    readonly value: any;
}

class LiteralExpr<T> extends AbstractExpr<T> implements ValueExprContract {

    constructor(readonly value: T) {
        super();
    }

    get isConstant(): false {
        return false;
    }

    override get isValueExpr(): true {
        return true;
    }

    accept(visitor: Visitor): void {
        visitor.visitLiteral(this.value);
    }
}

class LiteralNumExpr<T extends number | string> extends AbstractNumExpr<T> implements ValueExprContract {

    constructor(
        readonly value: T, 
        private readonly _numericType: NumericType
    ) {
        super();
    }

    get isConstant(): false {
        return false;
    }

    override get isValueExpr(): true {
        return true;
    }

    override accept(visitor: Visitor): void {
        visitor.visitLiteral(this.value);
    }

    override get numericType(): NumericType {
        return this._numericType;
    }
}

export class LiteralStrExpr extends AbstractStrExpr implements ValueExprContract {

    constructor(readonly value: string) {
        super();
    }

    get isConstant(): false {
        return false;
    }

    override get isValueExpr(): true {
        return true;
    }

    accept(visitor: Visitor): void {
        visitor.visitLiteral(this.value);
    }
}

class LiteralEsExpr<T extends string> extends AbstractEsExpr<T> implements ValueExprContract {

    constructor(readonly value: T) {
        super();
    }

    get isConstant(): false {
        return false;
    }

    override get isValueExpr(): true {
        return true;
    }

    accept(visitor: Visitor): void {
        visitor.visitLiteral(this.value);
    }
}

export class LiteralDtExpr extends AbstractDtExpr implements ValueExprContract {

    constructor(readonly value: Date) {
        super();
    }

    get isConstant(): false {
        return false;
    }
    
    override get isValueExpr(): true {
        return true;
    }

    accept(visitor: Visitor): void {
        visitor.visitLiteral(this.value);
    }
}