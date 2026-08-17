import { Precedence } from "@/sql/precedence";
import { NodeRender, NodeRenderContext } from "./node_render";
import { Scope, Value } from "@/sql/fragment";
import { err, ScalarProvider, spi } from "@ts-grm/core";
import { Driver } from "./deriver";

export abstract class AbstractNodeRender implements NodeRender {

    readonly name: string;

    constructor(owner: Driver) {
        this.name = owner.name;
    }

    renderTupleCmpPred(
        pred: spi.TupleCmpPred, 
        ctx: NodeRenderContext
    ): void {
        const providers = pred.providers;
        using _ = ctx.withPrecedence(Precedence.COMPARISON);
        this._renderTuple(pred.leftTuple, providers, ctx);
        ctx.text(" ");
        ctx.text(pred.op);
        ctx.text(" ");
        this._renderTuple(pred.rightTuple, providers, ctx);
    }

    renderInCollectinPred(
        pred: spi.InCollectionPred<any>, 
        ctx: NodeRenderContext
    ): void {
        const provider = pred.expr.scalarProvider;
        if (provider == null) {
            this._renderInCollection(pred.neg, pred.expr, pred.values, ctx);
            return;
        }
        const values: Array<spi.AbstractExpr<any> | Value | string> = [];
        for (const value of pred.values) {
            if (value.isValueExpr) {
                values.push(valueOf(value, provider));
            } else {
                values.push(value);
            }
        }
        this._renderInCollection(pred.neg, pred.expr, values, ctx);
    }

    private _renderInCollection(
        neg: boolean,
        expr: spi.AbstractExpr<any>,
        values: ReadonlyArray<spi.AbstractExpr<any> | Value | string>,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.COMPARISON);
        ctx.render(expr);
        ctx.text(neg ? " not in": " in");
        using __ = ctx.withComposite(new Scope("VALUES", false));
        for (const value of values) {
            ctx.separator();
            ctx.render(value);
        }
    }

    renderTupleInCollectionPred(
        pred: spi.TupleInCollectionPred,
        ctx: NodeRenderContext
    ): void {
        
        const providers = pred.providers;

        using _ = ctx.withPrecedence(Precedence.COMPARISON);

        ctx.render(pred.tuple)
        ctx.text(pred.neg ? " not in" : " in");

        using __ = ctx.withPrecedence(Precedence.ROOT);
        using ___ = ctx.withComposite(new Scope("VALUES"));
        for (const tuple of pred.tuples) {
            ctx.separator();
            this._renderTuple(tuple, providers, ctx);
        }
    }

    protected _renderTuple(
        tuple: spi.TupleContract, 
        providers: ReadonlyArray<ScalarProvider<any, any> | undefined> | undefined,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        using __ = ctx.withComposite(new Scope("VALUES", false));
        const span = tuple.exprs.length;
        for (let i = 0; i < span; i++) {
            const expr = tuple.exprs[i]!;
            ctx.separator();
            if (providers != null && providers[i] != null && expr.isValueExpr) {
                ctx.render(valueOf(expr, providers[i]!));
            } else {
                ctx.render(expr);
            }
        }
    }

    renderLikePred(pred: spi.LikePred, ctx: NodeRenderContext): void {
        using _ = ctx.withPrecedence(Precedence.COMPARISON);
        if (pred.insensitive) {
            ctx.text("lower(");
            ctx.render(pred.expr);
            ctx.text(pred.neg ? ") not like ": ") like ");
        } else {
            ctx.render(pred.expr);
            ctx.text(pred.neg ? " not like " : " like ");
        }
        ctx.render(pred.pattern);
    }

    renderEsOpPred(
        pred: spi.EsOpPred,
        ctx: NodeRenderContext
    ): void {
        const provider = pred.expr.scalarProvider!;
        const flags = provider.toSql(pred.values) as any;
        const value = new Value(flags, pred.values);
        using _ = ctx.withPrecedence(Precedence.COMPARISON);
        ctx.text("(");
        ctx.render(pred.expr);
        ctx.text(" & ");
        ctx.render(value);
        ctx.text(")");
        switch (pred.op) {
            case "CONTAINS_ANY":
                ctx.text(" <> 0");
                break;
            case "NOT_CONTAINS_ANY":
                ctx.text(" = 0");
                break;
            case "CONTAINS_ALL":
                ctx.text(" = ");
                ctx.render(value);
                break;
            case "NOT_CONTAINS_ALL":
                ctx.text(" <> ");
                ctx.render(value);
                break;
        }
    }

    renderReverseExpr(expr: spi.ReverseExpr, ctx: NodeRenderContext): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("reverse(");
        ctx.render(expr.expr);
        ctx.text(")");
    }

    renderTrimExpr(
        expr: spi.TrimExpr,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        switch (expr.side) {
            case "LEFT":
                ctx.text("ltrim");
                break;
            case "RIGHT":
                ctx.text("rtrim");
                break;
            default:
                ctx.text("trim");
                break;
        }
        ctx.text("(");
        ctx.render(expr.expr);
        ctx.text(")");
    }

    renderLengthExpr(expr: spi.LengthExpr, ctx: NodeRenderContext): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("length(cast(");
        ctx.render(expr.expr);
        ctx.text(" as text))");
    }

    renderPadExpr(expr: spi.PadExpr, ctx: NodeRenderContext): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text(expr.side === "LEFT" ? "lpad(" : "rpad(");
        ctx.render(expr.expr);
        ctx.text(", ");
        ctx.render(expr.lenExpr);
        ctx.text(", ");
        if (expr.padExpr != null) { 
            ctx.render(expr.padExpr);
        } else {
            ctx.text("' '");
        }
        ctx.text(")");
    }

    renderLeftExpr(
        expr: spi.LeftExpr,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("substr(");
        ctx.render(expr.expr);
        ctx.text(", ");
        ctx.render(expr.lenExpr);
        ctx.text(")");
    }

    renderRightExpr(
        expr: spi.RightExpr,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("substr(");
        ctx.render(expr.expr);
        ctx.text(", -");
        ctx.render(expr.lenExpr);
        ctx.text(")");
    }

    renderPositionExpr(
        expr: spi.PositionExpr,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("instr(");
        ctx.render(expr.expr);
        ctx.text(", ");
        ctx.render(expr.substrExpr);
        ctx.text(")");
    }
    
    renderSubstringExpr(
        expr: spi.SubstringExpr,
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("substr(");
        ctx.render(expr.expr);
        ctx.text(", ");
        ctx.render(expr.startExpr);
        if (expr.lenExpr != null) {
            ctx.text(", ");
            ctx.render(expr.lenExpr);
        }
        ctx.text(")");
    }

    renderDtPlusExpr(
        _expr: spi.DtPlusExpr,
        _ctx: NodeRenderContext
    ): void {
        throw new Error("Unsupported Operation Exception");
    }

    renderDtDiffExpr(
        _expr: spi.DtDiffExpr,
        _ctx: NodeRenderContext
    ): void {
        throw new Error("Unsupported Operation Exception");
    }

    protected unsupportedFun(funName: string): never {
        throw new err.StateError(`The driver "${this.name}" does not support the function "${funName}"`);
    }
};

function valueOf(
    expr: spi.AbstractExpr<any>,
    provider: ScalarProvider<any, any>
): Value | string {
    const valueContract = expr as any as spi.ValueExprContract;
    const originalValue = valueContract.value;
    const value = provider.toSql(originalValue);
    if (valueContract.isConstant) {
        return typeof value === "string" ? value : `${value}`;
    }
    return new Value(value, originalValue);
}