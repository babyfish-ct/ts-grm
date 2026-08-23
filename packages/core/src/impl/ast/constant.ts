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

import { ExplicitDataType } from "../explicit";
import { ValueExprContract } from "./literal";
import { AbstractNumExpr } from "./num_expr";
import { Visitor } from "./visitor";

export class ConstantExpr extends AbstractNumExpr<number> implements ValueExprContract {

    constructor(
        readonly value: number
    ) {
        super();
    }

    get isConstant(): true {
        return true;
    }

    override get isValueExpr(): true {
        return true;
    }

    accept(visitor: Visitor): void {
        visitor.visitConstant(this.value);
    }

    get explicitDataType(): ExplicitDataType {
        return ExplicitDataType.INTEGER;
    }
}