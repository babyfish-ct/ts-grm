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

import { AbstractDtExpr } from "./dt_expr";
import { AbstractCmpExpr, AbstractExpr } from "./expr";
import { AbstractNumExpr } from "./num_expr";
import { ShadowAnchor } from "../shadow_anchor";
import { AbstractStrExpr } from "./str_expr";
import { Visitor } from "./visitor";
import { Node } from "./node";
import { TypedBaseTable } from "../base_table";
import { StateError } from "@/error/common";
import { NumericType } from "../numeric";

export interface ShadowExprContract extends Node {

    readonly anchor: ShadowAnchor;

    readonly shadow: TypedBaseTable | undefined;

    __forShadow(shadow: TypedBaseTable): ShadowExprContract;
}

export class ShadowExpr<T> extends AbstractExpr<T> implements ShadowExprContract {

    private _shadow: TypedBaseTable | undefined = undefined;

    constructor(
        readonly anchor: ShadowAnchor
    ) {
        super();
    }

    get shadow(): TypedBaseTable | undefined {
        return this._shadow;
    }

    __forShadow(shadow: TypedBaseTable): ShadowExprContract {
        if (this._shadow === shadow) {
            return this;
        }
        const cloned = cloneShadowExpr(this, shadow);
        cloned._shadow = shadow;
        return cloned;
    }

    accept(visitor: Visitor): void {
        visitor.visitShadowExpr(this);
    }
}

export class ShadowCmpExpr<T> extends AbstractCmpExpr<T> implements ShadowExprContract {

    private _shadow: TypedBaseTable | undefined = undefined;

    constructor(
        readonly anchor: ShadowAnchor
    ) {
        super();
    }

    get shadow(): TypedBaseTable | undefined {
        return this._shadow;
    }

    __forShadow(shadow: TypedBaseTable): ShadowExprContract {
        if (this._shadow === shadow) {
            return this;
        }
        const cloned = cloneShadowExpr(this, shadow);
        cloned._shadow = shadow;
        return cloned;
    }

    accept(visitor: Visitor): void {
        visitor.visitShadowExpr(this);
    }
}

export class ShadowNumExpr<T extends number | string> extends AbstractNumExpr<T> implements ShadowExprContract {

    private _shadow: TypedBaseTable | undefined = undefined;

    constructor(
        readonly anchor: ShadowAnchor,
        private readonly _numericType: NumericType
    ) {
        super();
    }

    get shadow(): TypedBaseTable | undefined {
        return this._shadow;
    }

    __forShadow(shadow: TypedBaseTable): ShadowExprContract {
        if (this._shadow === shadow) {
            return this;
        }
        const cloned = cloneShadowExpr(this, shadow);
        cloned._shadow = shadow;
        return cloned;
    }

    override accept(visitor: Visitor): void {
        visitor.visitShadowExpr(this);
    }

    override get numericType(): NumericType {
        return this._numericType;
    }
}

export class ShadowStrExpr extends AbstractStrExpr implements ShadowExprContract {

    private _shadow: TypedBaseTable | undefined = undefined;

    constructor(
        readonly anchor: ShadowAnchor
    ) {
        super();
    }

    get shadow(): TypedBaseTable | undefined {
        return this._shadow;
    }

    __forShadow(shadow: TypedBaseTable): ShadowExprContract {
        if (this._shadow === shadow) {
            return this;
        }
        const cloned = cloneShadowExpr(this, shadow);
        cloned._shadow = shadow;
        return cloned;
    }

    accept(visitor: Visitor): void {
        visitor.visitShadowExpr(this);
    }
}

export class ShadowDtExpr extends AbstractDtExpr implements ShadowExprContract {

    private _shadow: TypedBaseTable | undefined = undefined;

    constructor(
        readonly anchor: ShadowAnchor
    ) {
        super();
    }

    get shadow(): TypedBaseTable | undefined {
        return this._shadow;
    }

    __forShadow(shadow: TypedBaseTable): ShadowExprContract {
        if (this._shadow === shadow) {
            return this;
        }
        const cloned = cloneShadowExpr(this, shadow);
        cloned._shadow = shadow;
        return cloned;
    }

    accept(visitor: Visitor): void {
        visitor.visitShadowExpr(this);
    }
}

function cloneShadowExpr<T extends ShadowExprContract>(
    expr: T,
    shadow: TypedBaseTable
) {
    if (shadow.__baseModel !== expr.anchor?.baseModel) {
        throw new StateError(
            "Failed to create a clone expression for the shadow, " + 
            "because the model of the shadow anchor in the current expression " + 
            "differs from the model of the actual shadow"
        );
    }
    return Object.assign(Object.create(Object.getPrototypeOf(expr)), expr) as T;
}