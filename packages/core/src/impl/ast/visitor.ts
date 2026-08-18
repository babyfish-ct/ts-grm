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

import { FetchedViewContract } from "./fetched_view";
import { AggregateExpr } from "./aggregate_expr";
import { CoalesceExprContract } from "./coalesce_expr";
import type { DtDiffExpr, DtPlusExpr } from "./dt_expr";
import { AbstractExpr } from "./expr";
import { NativeExprContract } from "./native_expr";
import type { BinaryNumExpr, UnaryMinusExpr } from "./num_expr";
import type { BetweenPred, CmpPred, CompoundPred, ConstantPred, EsOpPred, InCollectionPred, InSubQueryPred, LikePred, NullityPred } from "./pred";
import type { PropExprContract } from "./prop_expr";
import { AtomQueryContract, MergedQueryContract } from "./query";
import { ShadowExprContract } from "./shadow_expr";
import type { ConcatExpr, LeftExpr, LengthExpr, LowerExpr, PadExpr, PositionExpr, ReplaceExpr, ReverseExpr, RightExpr, SubstringExpr, TrimExpr, UpperExpr } from "./str_expr";
import { ExistsPred, SubQueryExprContract } from "./sub_query_expr";
import { TupleCmpPred, TupleContract, TupleInCollectionPred, TupleInSubQueryPred } from "./tuple";
import { Node } from "./node";
import { IsPred } from "./is_pred";
import { ExpressionOrder } from "@/dsl/utils";

export interface Visitor {

    visitAtomQuery(query: AtomQueryContract): void;

    visitMergedQuery(query: MergedQueryContract): void;

    visitTuple(tuple: TupleContract): void;

    visitTupleCmpPred(pred: TupleCmpPred): void;

    visitTupleInCollectionPred(pred: TupleInCollectionPred): void;

    visitTupleInSubQueryPred(pred: TupleInSubQueryPred): void;

    visitConstantPred(pred: ConstantPred): void;

    visitCmpPred(pred: CmpPred): void;

    visitInCollectionPred(pred: InCollectionPred<any>): void;

    visitInSubQueryPred(pred: InSubQueryPred): void;

    visitBetweenPred(pred: BetweenPred): void;

    visitLikePred(pred: LikePred): void;

    visitNullityPred(pred: NullityPred): void;

    visitCompoundPred(pred: CompoundPred): void;

    visitExistsPred(pred: ExistsPred): void;

    visitEsOpPred(pred: EsOpPred): void;

    visitFetchedView(view: FetchedViewContract): void;

    visitPropExpr(expr: PropExprContract): void;

    visitIsPred(pred: IsPred): void;

    visitNativeExpr(expr: NativeExprContract): void;

    visitSubQueryExpr(expr: SubQueryExprContract): void;

    visitShadowExpr(expr: ShadowExprContract): void;

    visitCoalesceExpr(expr: CoalesceExprContract): void;

    visitLowerExpr(expr: LowerExpr): void;

    visitUpperExpr(expr: UpperExpr): void;

    visitReverseExpr(expr: ReverseExpr): void;

    visitTrimExpr(expr: TrimExpr): void;

    visitLengthExpr(expr: LengthExpr): void;

    visitReplaceExpr(expr: ReplaceExpr): void;

    visitPadExpr(expr: PadExpr): void;

    visitLeftExpr(expr: LeftExpr): void;

    visitRightExpr(expr: RightExpr): void;

    visitPositionExpr(expr: PositionExpr): void;

    visitSubstringExpr(expr: SubstringExpr): void;

    visitConcatExpr(expr: ConcatExpr): void;

    visitUnaryMinusExpr(expr: UnaryMinusExpr<any>): void;

    visitBinaryNumExpr(expr: BinaryNumExpr<any>): void;

    visitAggregateExpr(expr: AggregateExpr<any>): void;

    visitDtPlusExpr(expr: DtPlusExpr): void;

    visitDtDiffExpr(expr: DtDiffExpr): void;

    visitLiteral(value: any): void;

    visitConstant(value: number): void;
}

export abstract class AbstractVisitor implements Visitor {

    visitAtomQuery(query: AtomQueryContract): void {
        query.recursivePred?.accept(this);
        query.wherePred?.accept(this);
        if (!query.options.countMode) {
            for (const order of query.orders) {
                (order.expression as any as Node).accept(this);
            }
        }
        const groupByExprs = query.groupByExprs;
        if (groupByExprs != null) {
            for (const groupByExpr of groupByExprs) {
                groupByExpr.accept(this);
            }
        }
        query.havingPred?.accept(this);
    }

    visitMergedQuery(query: MergedQueryContract): void {
        for (const qry of query.queries) {
            qry.accept(this);
        }
    }

    visitTuple(tuple: TupleContract): void {
        for (const expr of tuple.exprs) {
            expr.accept(this);
        }
    }

    visitTupleCmpPred(pred: TupleCmpPred): void {
        pred.leftTuple.accept(this);
        pred.rightTuple.accept(this);
    }

    visitTupleInCollectionPred(pred: TupleInCollectionPred): void {
        pred.tuple.accept(this);
        for (const tuple of pred.tuples) {
            tuple.accept(this);
        }
    }

    visitTupleInSubQueryPred(pred: TupleInSubQueryPred): void {
        pred.tuple.accept(this);
        pred.subQuery.accept(this);
    }

    visitConstantPred(_: ConstantPred): void {
    }

    visitCmpPred(pred: CmpPred): void {
        pred.leftExpr.accept(this);
        pred.rightExpr.accept(this);
    }

    visitInCollectionPred(pred: InCollectionPred<any>): void {
        pred.expr.accept(this);
    }

    visitInSubQueryPred(pred: InSubQueryPred): void {
        pred.expr.accept(this);
        pred.subQuery.accept(this);
    }

    visitBetweenPred(pred: BetweenPred): void {
        pred.expr.accept(this);
        pred.minExpr.accept(this);
        pred.maxExpr.accept(this);
    }

    visitLikePred(pred: LikePred): void {
        pred.expr.accept(this);
    }

    visitNullityPred(pred: NullityPred): void {
        pred.expr.accept(this);
    }

    visitCompoundPred(pred: CompoundPred): void {
        for (const p of pred.preds) {
            p.accept(this);
        }
    }

    visitExistsPred(pred: ExistsPred): void {
        pred.subQuery.accept(this);
    }

    visitEsOpPred(pred: EsOpPred): void {
        pred.expr.accept(this);
    }

    visitFetchedView(_: FetchedViewContract): void {
    }

    visitPropExpr(_: PropExprContract): void {
    }

    visitIsPred(_: IsPred): void {
    }

    visitCoalesceExpr(expr: CoalesceExprContract): void {
        expr.expr.accept(this);
        for (const defaultExpr of expr.defaultExprs) {
            defaultExpr.accept(this);
        }
    }

    visitNativeExpr(expr: NativeExprContract): void {
        for (const part of expr.parts) {
            if (Array.isArray(part)) {
                for (const e of part) {
                    if (e instanceof ExpressionOrder) {
                        (e.expression as AbstractExpr<any>).accept(this);
                    } else {
                        (e as AbstractExpr<any>).accept(this);
                    }
                }
            }
            if (part instanceof AbstractExpr) {
                part.accept(this);
            }
        }
    }

    visitSubQueryExpr(expr: SubQueryExprContract): void {
        expr.subQuery.accept(this);
    }

    visitShadowExpr(_: ShadowExprContract): void {

    }

    visitLowerExpr(expr: LowerExpr): void {
        expr.expr.accept(this);
    }

    visitUpperExpr(expr: UpperExpr): void {
        expr.expr.accept(this);
    }

    visitReverseExpr(expr: ReverseExpr): void {
        expr.expr.accept(this);
    }

    visitTrimExpr(expr: TrimExpr): void {
        expr.expr.accept(this);
    }

    visitLengthExpr(expr: LengthExpr): void {
        expr.expr.accept(this);
    }

    visitReplaceExpr(expr: ReplaceExpr): void {
        expr.expr.accept(this);
        expr.oldStrExpr.accept(this);
        expr.newStrExpr.accept(this);
    }

    visitPadExpr(expr: PadExpr): void {
        expr.expr.accept(this);
        expr.lenExpr.accept(this);
        expr.padExpr?.accept(this);
    }

    visitLeftExpr(expr: LeftExpr): void {
        expr.expr.accept(this);
        expr.lenExpr.accept(this);
    }

    visitRightExpr(expr: RightExpr): void {
        expr.expr.accept(this);
        expr.lenExpr.accept(this);
    }

    visitPositionExpr(expr: PositionExpr): void {
        expr.expr.accept(this);
        expr.substrExpr.accept(this);
        expr.startExpr?.accept(this);
    }

    visitSubstringExpr(expr: SubstringExpr): void {
        expr.expr.accept(this);
        expr.startExpr.accept(this);
        expr.lenExpr?.accept(this);
    }

    visitConcatExpr(expr: ConcatExpr): void {
        for (const valueExpr of expr.valueExprs) {
            valueExpr.accept(this);
        }
    }

    visitUnaryMinusExpr(expr: UnaryMinusExpr<any>): void {
        expr.expr.accept(this);
    }

    visitBinaryNumExpr(expr: BinaryNumExpr<any>): void {
        expr.leftExpr.accept(this);
        expr.rightExpr.accept(this);
    }

    visitAggregateExpr(expr: AggregateExpr<any>): void {
        expr.expr?.accept(this);
    }

    visitDtPlusExpr(expr: DtPlusExpr): void {
        expr.expr.accept(this);
    }

    visitDtDiffExpr(expr: DtDiffExpr): void {
        expr.expr.accept(this);
        expr.valueExpr.accept(this);
    }

    visitLiteral(_: any): void {

    }

    visitConstant(_: number): void {
        
    }
}