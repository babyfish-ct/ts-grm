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

export { AbstractSelection } from "./selection";
export { AbstractExpr, AbstractCmpExpr } from "./expr";
export { AbstractNumExpr } from "./num_expr";
export { AbstractStrExpr } from "./str_expr";
export { AbstractEsExpr } from "./es_expr";
export { AbstractDtExpr } from "./dt_expr";
export { AbstractPred } from "./pred";
export { AggregateExpr } from "./aggregate_expr";
export type { Node } from "./node";
export type { DtDiffExpr, DtPlusExpr } from "./dt_expr";
export type { BinaryNumExpr, UnaryMinusExpr } from "./num_expr";
export type { NativeExprContract } from "./native_expr";
export type { 
    ConstantPred,
    CmpPred, 
    CompoundPred, 
    InCollectionPred, 
    InSubQueryPred,
    LikePred, 
    NullityPred,
    BetweenPred,
    EsOpPred,
    CompoundOp,
    EsOp,
} from "./pred";
export type { IsPred } from "./is_pred";
export type { ValueExprContract } from "./literal";
export type { PropExprContract } from "./prop_expr";
export type { CoalesceExprContract } from "./coalesce_expr";
export type { 
    ConcatExpr, 
    LeftExpr, 
    LengthExpr, 
    LowerExpr, 
    PadExpr, 
    PositionExpr, 
    ReplaceExpr, 
    ReverseExpr, 
    RightExpr, 
    SubstringExpr, 
    TrimExpr, 
    UpperExpr 
} from "./str_expr";
export type {
    FetchedViewContract
} from "./fetched_view";
export type {
    ShadowExprContract
} from "./shadow_expr";
export type {
    TupleContract,
    TupleCmpPred,
    TupleInCollectionPred,
    TupleInSubQueryPred,
} from "./tuple";
export type {
    ExistsPred,
    SubQueryExprContract,
    SubQueryExprOp,
} from "./sub_query_expr";
export type { 
    QueryContract, 
    AtomQueryContract, 
    MergedQueryContract, 
    ProjectionContract, 
    AtomQueryOptions 
} from "./query";
export { defaultAtomQueryOptions } from "./query";
export type { Visitor } from "./visitor";
export { AbstractVisitor } from "./visitor";
export type { QueryFactory, MergedQueryKind } from "./query_factory";
export { setQueryFactory } from "./query_factory";

import { getInternalFactory, InternalFactory, setInternalFactory } from "@/impl/ast/internal_factory";
import { BetweenPred, CmpOp, CmpPred, ConstantPred, InCollectionPred, InSubQueryPred, NullityPred } from "@/impl/ast/pred";
import { AbstractExpr, QueryContract } from "@/impl/ast";
import { CoalesceCmpExpr, CoalesceDtExpr, CoalesceExpr, CoalesceNumExpr, CoalesceStrExpr, CoalesceEsExpr } from "@/impl/ast/coalesce_expr";
import { AbstractCmpExpr } from "@/impl/ast/expr";
import { AbstractNumExpr } from "@/impl/ast/num_expr";
import { AbstractStrExpr } from "@/impl/ast/str_expr";
import { AbstractDtExpr } from "@/impl/ast/dt_expr";
import { AbstractEsExpr } from "@/impl/ast/es_expr";
import { createLiteral } from "@/impl/ast/literal";
import { ExpressionOrder } from "@/dsl";
import { ShadowCmpExpr, ShadowDtExpr, ShadowExpr, ShadowNumExpr, ShadowStrExpr } from "./shadow_expr";
import { ShadowAnchor } from "../shadow_anchor";

class InternalFactoryImpl implements InternalFactory {

    createExprOrder(
        expr: AbstractExpr<any>, 
        desc: boolean
    ): ExpressionOrder {
        return new ExpressionOrder(expr, desc, "UNSPECIFIED");    
    }

    createConstantPred(
        value: boolean
    ): ConstantPred {
        return value ? ConstantPred.TRUE : ConstantPred.FALSE;    
    }

    createCmpPred<T>(
        op: CmpOp,
        left: AbstractExpr<T>,
        right: AbstractExpr<T>
    ): CmpPred {
        return new CmpPred(op, left, right);
    }

    createBetweenPred<T>(
        expr: AbstractCmpExpr<T>, 
        min: AbstractExpr<T>, 
        max: AbstractExpr<T>
    ): BetweenPred {
        return new BetweenPred(expr, min, max);    
    }

    createInCollectionPred<T>(
        expr: AbstractExpr<T>,
        values: ReadonlyArray<T | AbstractExpr<T>>,
        neg: boolean
    ): InCollectionPred<T> {
        return new InCollectionPred(
            expr, 
            values.map(v => 
                v instanceof AbstractExpr 
                    ? v 
                    : getInternalFactory().createLiteral(v)
            ), 
            neg
        );
    }

    createInSubQueryPred(
        expr: AbstractExpr<any>, 
        subQuery: QueryContract, 
        neg: boolean
    ): InSubQueryPred {
        return new InSubQueryPred(expr, subQuery, neg);
    }

    createNullityPred(
        expr: AbstractExpr<any>,
        neg: boolean
    ): NullityPred {
        return new NullityPred(expr, neg);
    }

    createCoalesceExpr<T>(
        expr: AbstractExpr<T>,
        defaultExprs: ReadonlyArray<AbstractExpr<T>>
    ): CoalesceExpr<T> {
        return new CoalesceExpr(expr, defaultExprs);
    }

    createCoalesceCmpExpr<T>(
        expr: AbstractCmpExpr<T>,
        defaultExprs: ReadonlyArray<AbstractCmpExpr<T>>
    ): CoalesceCmpExpr<T> {
        return new CoalesceCmpExpr(expr, defaultExprs);
    }

    createCoalesceNumExpr<T extends number | string>(
        expr: AbstractNumExpr<T>,
        defaultExprs: ReadonlyArray<AbstractNumExpr<T>>
    ): CoalesceNumExpr<T> {
        return new CoalesceNumExpr(expr, defaultExprs);
    }

    createCoalesceStrExpr(
        expr: AbstractStrExpr,
        defaultExprs: ReadonlyArray<AbstractStrExpr>
    ): CoalesceStrExpr {
        return new CoalesceStrExpr(expr, defaultExprs);
    }

    createCoalesceEsExpr<T extends string>(
        expr: AbstractEsExpr<T>,
        defaultExprs: ReadonlyArray<AbstractEsExpr<T>>
    ): CoalesceEsExpr<T> {
        return new CoalesceEsExpr(expr, defaultExprs);
    }

    createCoalesceDtExpr(
        expr: AbstractDtExpr,
        defaultExprs: ReadonlyArray<AbstractDtExpr>
    ): CoalesceDtExpr {
        return new CoalesceDtExpr(expr, defaultExprs);
    }

    createShadowExpr<T>(
        anchor: ShadowAnchor
    ): AbstractExpr<T> {
        const expr = anchor.original;
        if (expr instanceof AbstractDtExpr) {
            return new ShadowDtExpr(anchor) as AbstractExpr<T>;
        }
        if (expr instanceof AbstractStrExpr) {
            return new ShadowStrExpr(anchor) as AbstractExpr<T>;
        }
        if (expr instanceof AbstractNumExpr) {
            return new ShadowNumExpr(anchor, expr.numericType) as AbstractExpr<T>;
        }
        if (expr instanceof AbstractCmpExpr) {
            return new ShadowCmpExpr(anchor) as AbstractExpr<T>;
        }
        return new ShadowExpr(anchor);
    }

    createLiteral(value: number): AbstractNumExpr<number>;

    createLiteral<
        T extends string, TAs extends "AS_NUMBER" | "AS_ENUM_SET"
    >(
        value: T, 
        as: TAs
    ): TAs extends "AS_NUMBER" 
        ? AbstractNumExpr<string>
        : AbstractEsExpr<T>;

    createLiteral(value: string): AbstractStrExpr;

    createLiteral(value: Date): AbstractDtExpr;

    createLiteral<T>(value: T): AbstractExpr<T>;

    createLiteral(value: any, as?: "AS_NUMBER" | "AS_ENUM_SET"): AbstractExpr<any> {
        return createLiteral(value, as);
    }
}

setInternalFactory(new InternalFactoryImpl());