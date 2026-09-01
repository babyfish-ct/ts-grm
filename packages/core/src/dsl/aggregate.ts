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

import { 
    CmpExprContract, 
    CmpExpression, 
    DateExprContract, 
    DateExpression, 
    EnumSetExprContract, 
    EnumSetExpression, 
    ExprContract, 
    Expression, 
    ExpressionLike, 
    NumExprContract, 
    NumExpression, 
    StrExprContract, 
    StrExpression 
} from "./expression";
import { AggregateExpr } from "@/impl/ast/aggregate_expr";
import { AbstractExpr } from "@/impl/ast";

export function count(
    expr?: ExpressionLike
): NumExpression<number> {
    return new AggregateExpr(
        "COUNT", 
        expr as any as AbstractExpr<any> | undefined
    ) as any as NumExpression<number>;
}

export function sum(
    expr: NumExpression<number>
): NumExpression<number | null>;

export function sum(
    expr: NumExpression<string>
): NumExpression<string | null>;

export function sum(
    expr: NumExpression<number> | NumExpression<string>
): any {
    return new AggregateExpr("SUM", expr as any as AbstractExpr<any>);
}

export function max(
    expr: NumExprContract<number>
): NumExpression<number | null>;

export function max(
    expr: NumExprContract<string>
): NumExpression<string | null>;

export function max(
    expr: StrExprContract
): StrExpression<string | null>;

export function max(
    expr: DateExprContract
): DateExpression<Date | null>;

export function max(
    expr: EnumSetExprContract
): EnumSetExpression<string | null>;

export function max<T>(
    expr: CmpExprContract<T>
): CmpExpression<T | null>;

export function max<T>(
    expr: ExprContract<T>
): Expression<T | null>;

export function max(
    expr: any
): any {
    return new AggregateExpr("MAX", expr as AbstractExpr<any>);
}

export function min(
    expr: NumExprContract<number>
): NumExpression<number | null>;

export function min(
    expr: NumExprContract<string>
): NumExpression<string | null>;

export function min(
    expr: StrExprContract
): StrExpression<string | null>;

export function min(
    expr: DateExprContract
): DateExpression<Date | null>;

export function min(
    expr: EnumSetExprContract
): EnumSetExpression<string | null>;

export function min<T>(
    expr: CmpExprContract<T>
): CmpExpression<T | null>;

export function min(
    expr: any
): any {
    return new AggregateExpr("MIN", expr as AbstractExpr<any>);
}

export function avg(
    expr: NumExpression<number>
): NumExpression<number | null>;

export function avg(
    expr: NumExpression<string>
): NumExpression<string | null>;

export function avg(
    expr: NumExpression<number> | NumExpression<string>
): any {
    return new AggregateExpr("AVG", expr as any as AbstractExpr<any>);
}
