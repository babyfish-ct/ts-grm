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

import { ArgumentError, StateError } from "@/error/common";
import type { AbstractCmpExpr, AbstractExpr } from "./expr";
import type { BetweenPred, ConstantPred, CmpOp, CmpPred, InCollectionPred, InSubQueryPred, NullityPred } from "./pred";
import type { CoalesceCmpExpr, CoalesceDtExpr, CoalesceEsExpr, CoalesceExpr, CoalesceNumExpr, CoalesceStrExpr } from "./coalesce_expr";
import type { AbstractNumExpr } from "./num_expr";
import type { AbstractStrExpr } from "./str_expr";
import type { AbstractDtExpr } from "./dt_expr";
import { ExpressionOrder } from "@/dsl/utils";
import { ShadowAnchor } from "../shadow_anchor";
import { QueryContract } from "./query";
import { AbstractEsExpr } from "./es_expr";

let _internalFactory: InternalFactory | undefined = undefined;

export function getInternalFactory(): InternalFactory {
    const factory = _internalFactory;
    if (factory == null) {
        throw new StateError("Internal factory is not set");
    }
    return factory;
}

export function setInternalFactory(factory: InternalFactory) {
    _internalFactory = factory;
}

export interface InternalFactory {

    createExprOrder(
        expr: AbstractExpr<any>, 
        desc: boolean
    ): ExpressionOrder;

    createConstantPred(
        value: boolean
    ): ConstantPred; 
    
    createCmpPred<T>(
        op: CmpOp,
        left: AbstractExpr<T>,
        right: AbstractExpr<T>
    ): CmpPred;

    createBetweenPred<T>(
        expr: AbstractCmpExpr<T>,
        min: AbstractExpr<T>,
        max: AbstractExpr<T>
    ): BetweenPred;

    createInCollectionPred<T>(
        expr: AbstractExpr<T>,
        values: ReadonlyArray<T | AbstractExpr<T>>,
        neg: boolean
    ): InCollectionPred<T>;

    createInSubQueryPred(
        expr: AbstractExpr<any>,
        subQuery: QueryContract,
        neg: boolean
    ): InSubQueryPred;

    createNullityPred(
        expr: AbstractExpr<any>,
        neg: boolean
    ): NullityPred;

    createCoalesceExpr<T>(
        expr: AbstractExpr<T>,
        defaultExprs: ReadonlyArray<AbstractExpr<T>>
    ): CoalesceExpr<T>;

    createCoalesceCmpExpr<T>(
        expr: AbstractCmpExpr<T>,
        defaultExprs: ReadonlyArray<AbstractCmpExpr<T>>
    ): CoalesceCmpExpr<T>;

    createCoalesceNumExpr<T extends number | string>(
        expr: AbstractNumExpr<T>,
        defaultExprs: ReadonlyArray<AbstractNumExpr<T>>
    ): CoalesceNumExpr<T>;

    createCoalesceStrExpr(
        expr: AbstractStrExpr,
        defaultExprs: ReadonlyArray<AbstractStrExpr>
    ): CoalesceStrExpr;

    createCoalesceEsExpr<T extends string>(
        expr: AbstractEsExpr<T>,
        defaultExprs: ReadonlyArray<AbstractEsExpr<T>>
    ): CoalesceEsExpr<T>;

    createCoalesceDtExpr(
        expr: AbstractDtExpr,
        defaultExprs: ReadonlyArray<AbstractDtExpr>
    ): CoalesceDtExpr;

    createShadowExpr<T>(
        anchor: ShadowAnchor
    ): AbstractExpr<T>;

    createLiteral(value: number): AbstractNumExpr<number>;

    createLiteral<
        T extends string,
        TAs extends "AS_NUMBER" | "AS_ENUM_SET"
    >(
        value: T, 
        as: TAs
    ): TAs extends "AS_NUMBER" 
        ? AbstractNumExpr<string>
        : AbstractEsExpr<T>;

    createLiteral(value: string): AbstractStrExpr;

    createLiteral(value: Date): AbstractDtExpr;

    createLiteral<T>(value: T): AbstractExpr<T>;
}

export function validateInValues(values: ReadonlyArray<any>) {
    for (const value of values) {
        const typeFn = value.__type;
        if (typeof typeFn === "function") {
            const type = typeFn();
            if (type != null && type.subQueryLike) {
                throw new ArgumentError(
                    `Cannot directly use subqueries in 'IN' expressions.
Either use the 'inSubQuery()' function for collection operations;
or use 'asValue()' to convert the subquery into a single value before using it.`
                );
            }
        }
    }
}
