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

import { collectNativeParts, NativeDtExpr, NativeNumExpr, NativeStrExpr } from "@/impl/ast/native_expr";
import { DateExpression, ExpressionLike, NumExpression, StrExpression } from "./expression";
import { ExpressionOrder } from "./utils";
import { ExplicitDataType } from "@/impl/explicit";

export type NativeValueType = 
    ExpressionLike 
    | boolean 
    | number 
    | boolean 
    | Date 
    | ReadonlyArray<ExpressionLike> 
    | ReadonlyArray<ExpressionOrder>;

export type NativeNumCreator = {
    (
        strings: TemplateStringsArray, 
        ...values: ReadonlyArray<NativeValueType>
    ): NumExpression<number>;

    asString(
        strings: TemplateStringsArray, 
        ...values: ReadonlyArray<NativeValueType>
    ): NumExpression<string>;
}

function num(
    strings: TemplateStringsArray, 
    ...values: ReadonlyArray<NativeValueType>
) {
    return new NativeNumExpr<number>(
        collectNativeParts(strings, ...values),
        ExplicitDataType.INTEGER
    ) as any as NumExpression<number>;
}

function numAsString(
    strings: TemplateStringsArray, 
    ...values: ReadonlyArray<NativeValueType>
) {
    return new NativeNumExpr<string>(
        collectNativeParts(strings, ...values),
        ExplicitDataType.STRING
    ) as any as NumExpression<string>;
}

(num as any).asString = numAsString;

function str(
    strings: TemplateStringsArray, 
    ...values: ReadonlyArray<NativeValueType>
) {
    return new NativeStrExpr(
        collectNativeParts(strings, ...values)
    ) as any as StrExpression<string>;
}

function date(
    strings: TemplateStringsArray, 
    ...values: ReadonlyArray<NativeValueType>
): DateExpression<Date> {
    return new NativeDtExpr(
        collectNativeParts(strings, ...values)
    ) as any as DateExpression<Date>;
}

export const native = {
    num: num as NativeNumCreator,
    str,
    date
};