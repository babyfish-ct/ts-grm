import { Composite, Value } from "@/sql/fragment";
import { spi } from "@ts-grm/core";

export interface NodeRender {

    renderTupleCmpPred(
        pred: spi.TupleCmpPred,
        ctx: NodeRenderContext
    ): void;

    renderInCollectinPred(
        pred: spi.InCollectionPred<any>,
        ctx: NodeRenderContext
    ): void;

    renderTupleInCollectionPred(
        pred: spi.TupleInCollectionPred,
        ctx: NodeRenderContext
    ): void;

    renderLikePred(
        pred: spi.LikePred,
        ctx: NodeRenderContext
    ): void;

    renderEsOpPred(
        pred: spi.EsOpPred,
        ctx: NodeRenderContext
    ): void;

    renderReverseExpr(
        expr: spi.ReverseExpr,
        ctx: NodeRenderContext
    ): void;

    renderTrimExpr(
        expr: spi.TrimExpr, 
        ctx: NodeRenderContext
    ): void;

    renderLengthExpr(
        expr: spi.LengthExpr,
        ctx: NodeRenderContext
    ): void;

    renderPadExpr(
        expr: spi.PadExpr,
        ctx: NodeRenderContext
    ): void;

    renderLeftExpr(
        expr: spi.LeftExpr,
        ctx: NodeRenderContext
    ): void;

    renderRightExpr(
        expr: spi.RightExpr,
        ctx: NodeRenderContext
    ): void;

    renderPositionExpr(
        expr: spi.PositionExpr,
        ctx: NodeRenderContext
    ): void;

    renderSubstringExpr(
        expr: spi.SubstringExpr,
        ctx: NodeRenderContext
    ): void;

    renderDtPlusExpr(
        expr: spi.DtPlusExpr,
        ctx: NodeRenderContext
    ): void;

    renderDtDiffExpr(
        expr: spi.DtDiffExpr,
        ctx: NodeRenderContext
    ): void;
}

export interface NodeRenderContext {

    readonly driverName: string;

    text(value: string): void;

    separator(): void;

    withComposite(composite: Composite): Disposable;

    withPrecedence(precedence: number): Disposable;

    render(node: spi.Node | Value | string): void;
}
