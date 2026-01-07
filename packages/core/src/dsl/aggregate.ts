import { Expression } from "./expression";

export function count(
    expr?: Expression<any> | Expression<string, "AS_NUMBER">
): Expression<number> {
    throw new Error();
}

export function sum(
    expr: Expression<number>
): Expression<number>;

export function sum(
    expr: Expression<string, "AS_NUMBER">
): Expression<string, "AS_NUMBER">;

export function sum(
    expr: Expression<number> | Expression<string, "AS_NUMBER">
): any {
    throw new Error();
}

export function max(
    expr: Expression<number>
): Expression<number>;

export function max(
    expr: Expression<string, "AS_NUMBER">
): Expression<string, "AS_NUMBER">;

export function max(
    expr: Expression<number> | Expression<string, "AS_NUMBER">
): any {
    throw new Error();
}

export function min(
    expr: Expression<number>
): Expression<number>;

export function min(
    expr: Expression<string, "AS_NUMBER">
): Expression<string, "AS_NUMBER">;

export function min(
    expr: Expression<number> | Expression<string, "AS_NUMBER">
): any {
    throw new Error();
}

export function avg(
    expr: Expression<number>
): Expression<number>;

export function avg(
    expr: Expression<string, "AS_NUMBER">
): Expression<string, "AS_NUMBER">;

export function avg(
    expr: Expression<number> | Expression<string, "AS_NUMBER">
): any {
    throw new Error();
}