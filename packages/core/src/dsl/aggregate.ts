import { NonNullExpression, NullableExpression } from "./expression";

export function count(
    expr?: NonNullExpression<any> | NullableExpression<any>
): NonNullExpression<number> {
    throw new Error();
}

export function sum(
    expr: NonNullExpression<number> | NullableExpression<number>
): NullableExpression<number> {
    throw new Error();
}

export function max(
    expr: NonNullExpression<number> | NullableExpression<number>
): NullableExpression<number> {
    throw new Error();
}

export function min(
    expr: NonNullExpression<number> | NullableExpression<number>
): NullableExpression<number> {
    throw new Error();
}

export function avg(
    expr: NonNullExpression<number> | NullableExpression<number>
): NullableExpression<number> {
    throw new Error();
}