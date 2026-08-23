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
import { AbstractCmpExpr } from "./expr";
import { getInternalFactory } from "./internal_factory";
import type { CoalesceNumExpr } from "./coalesce_expr";
import { Visitor } from "./visitor";
import { mergeExplicitDataType, ExplicitDataType } from "../explicit";

export abstract class AbstractNumExpr<T extends string | number> extends AbstractCmpExpr<T> {

    unaryMinus(): AbstractNumExpr<T> {
        return new UnaryMinusExpr(this);
    }

    plus<X extends string | number>(
        value: X | AbstractNumExpr<T>
    ): AbstractNumExpr<MergeNumType<T, X>> {
        return new BinaryNumExpr(
            "+", 
            this, 
            value instanceof AbstractNumExpr ? value : 
                typeof value === "string"
                    ? getInternalFactory().createLiteral(value, "AS_NUMBER")
                    : getInternalFactory().createLiteral(value)
        );
    }

    minus<X extends string | number>(
        value: X | AbstractNumExpr<T>
    ): AbstractNumExpr<MergeNumType<T, X>> {
        return new BinaryNumExpr(
            "-", 
            this, 
            value instanceof AbstractNumExpr ? value : 
                typeof value === "string"
                    ? getInternalFactory().createLiteral(value, "AS_NUMBER")
                    : getInternalFactory().createLiteral(value)
        );
    }

    times<X extends string | number>(
        value: X | AbstractNumExpr<T>
    ): AbstractNumExpr<MergeNumType<T, X>> {
        return new BinaryNumExpr(
            "*", 
            this, 
            value instanceof AbstractNumExpr ? value : 
                typeof value === "string"
                    ? getInternalFactory().createLiteral(value, "AS_NUMBER")
                    : getInternalFactory().createLiteral(value)
        );
    }

    div<X extends string | number>(
        value: X | AbstractNumExpr<T>
    ): AbstractNumExpr<MergeNumType<T, X>> {
        return new BinaryNumExpr(
            "/", 
            this, 
            value instanceof AbstractNumExpr ? value : 
                typeof value === "string"
                    ? getInternalFactory().createLiteral(value, "AS_NUMBER")
                    : getInternalFactory().createLiteral(value)
        );
    }

    rem<X extends string | number>(
        value: X | AbstractNumExpr<T>
    ): AbstractNumExpr<MergeNumType<T, X>> {
        return new BinaryNumExpr(
            "%", 
            this, 
            value instanceof AbstractNumExpr ? value : 
                typeof value === "string"
                    ? getInternalFactory().createLiteral(value, "AS_NUMBER")
                    : getInternalFactory().createLiteral(value)
        );
    }

    override coalesce(
        values: ReadonlyArray<T | AbstractNumExpr<T>>
    ): CoalesceNumExpr<T> {
        const arr = values.map(value => {
            if (value == null) {
                throw new ArgumentError("coalesce does not accept null/undefined value");
            }
            if (value instanceof AbstractNumExpr) {
                return value;
            }
            if (typeof value === "string") {
                return getInternalFactory().createLiteral(value, "AS_NUMBER") as AbstractNumExpr<T>;
            }
            return getInternalFactory().createLiteral(value) as AbstractNumExpr<T>;
        });
        return getInternalFactory().createCoalesceNumExpr(this, arr);
    }

    abstract override get explicitDataType(): ExplicitDataType;
}

export class UnaryMinusExpr<T extends number | string> extends AbstractNumExpr<T> {

    constructor(
        readonly expr: AbstractNumExpr<T>
    ) {
        super();
    }

    override unaryMinus(): AbstractNumExpr<T> {
        return this.expr;
    }

    accept(visitor: Visitor): void {
        visitor.visitUnaryMinusExpr(this);
    }

    override get explicitDataType(): ExplicitDataType {
        return this.expr.explicitDataType;
    }
}

export class BinaryNumExpr<T extends number | string> extends AbstractNumExpr<T> {

    private readonly _explicitDataType: ExplicitDataType;

    constructor(
        readonly op: BinaryNumOp,
        readonly leftExpr: AbstractNumExpr<any>,
        readonly rightExpr: AbstractNumExpr<any>
    ) {
        super();
        this._explicitDataType = mergeExplicitDataType(leftExpr.explicitDataType, rightExpr.explicitDataType);
    }

    override accept(visitor: Visitor): void {
        visitor.visitBinaryNumExpr(this);
    }

    override get explicitDataType(): ExplicitDataType {
        return this._explicitDataType;
    }
}

export type BinaryNumOp = "+" | "-" | "*" | "/" | "%";

type MergeNumType<
    T1 extends string | number | null | undefined, 
    T2 extends string | number | null | undefined
> =
    string extends T1 | T2
        ? Exclude<T1 | T2, number> 
        : T1 | T2;
