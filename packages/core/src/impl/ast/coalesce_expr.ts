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

import { ScalarProvider } from "@/schema/scalar";
import { AbstractDtExpr } from "./dt_expr";
import { AbstractEsExpr } from "./es_expr";
import { AbstractCmpExpr, AbstractExpr } from "./expr";
import { AbstractNumExpr } from "./num_expr";
import { AbstractStrExpr } from "./str_expr";
import { Visitor } from "./visitor";
import { mergeExplicitDataType, ExplicitDataType } from "../explicit";

export interface CoalesceExprContract {
    readonly expr: AbstractExpr<any>,
    readonly defaultExprs: ReadonlyArray<AbstractExpr<any>>;
}

export class CoalesceExpr<T> extends AbstractExpr<T> implements CoalesceExprContract {

    constructor(
        readonly expr: AbstractExpr<T>,
        readonly defaultExprs: ReadonlyArray<AbstractExpr<T>>
    ) {
        super();
    }

    override get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this.expr.scalarProvider;
    }

    accept(visitor: Visitor): void {
        visitor.visitCoalesceExpr(this);
    }
}

export class CoalesceCmpExpr<T> extends AbstractCmpExpr<T> implements CoalesceExprContract {

    constructor(
        readonly expr: AbstractCmpExpr<T>,
        readonly defaultExprs: ReadonlyArray<AbstractCmpExpr<T>>
    ) {
        super();
    }

    override get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this.expr.scalarProvider;
    }

    accept(visitor: Visitor): void {
        visitor.visitCoalesceExpr(this);
    }
}

export class CoalesceNumExpr<T extends number | string> extends AbstractNumExpr<T> implements CoalesceExprContract {

    private readonly _explicitDataType: ExplicitDataType;

    constructor(
        readonly expr: AbstractNumExpr<T>,
        readonly defaultExprs: ReadonlyArray<AbstractNumExpr<T>>
    ) {
        super();
        this._explicitDataType = mergeExplicitDataType(
            expr.explicitDataType,
            defaultExprs.reduce((max: ExplicitDataType, item: AbstractNumExpr<any>) => {
                return item.explicitDataType > max ? item.explicitDataType : max;
            }, ExplicitDataType.NONE)
        );
    }

    override get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this.expr.scalarProvider;
    }

    override accept(visitor: Visitor): void {
        visitor.visitCoalesceExpr(this);
    }

    override get explicitDataType(): ExplicitDataType {
        return this._explicitDataType;
    }
}

export class CoalesceStrExpr extends AbstractStrExpr implements CoalesceExprContract {

    constructor(
        readonly expr: AbstractStrExpr,
        readonly defaultExprs: ReadonlyArray<AbstractStrExpr>
    ) {
        super();
    }

    override get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this.expr.scalarProvider;
    }

    accept(visitor: Visitor): void {
        visitor.visitCoalesceExpr(this);
    }
}

export class CoalesceEsExpr<T extends string> extends AbstractEsExpr<T> implements CoalesceExprContract {

    constructor(
        readonly expr: AbstractEsExpr<T>,
        readonly defaultExprs: ReadonlyArray<AbstractEsExpr<T>>
    ) {
        super();
    }

    override get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this.expr.scalarProvider;
    }

    accept(visitor: Visitor): void {
        visitor.visitCoalesceExpr(this);
    }
}

export class CoalesceDtExpr extends AbstractDtExpr implements CoalesceExprContract {

    constructor(
        readonly expr: AbstractDtExpr,
        readonly defaultExprs: ReadonlyArray<AbstractDtExpr>
    ) {
        super();
    }

    override get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this.expr.scalarProvider;
    }

    accept(visitor: Visitor): void {
        visitor.visitCoalesceExpr(this);
    }
}
