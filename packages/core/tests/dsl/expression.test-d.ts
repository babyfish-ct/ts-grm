import { Expression } from "@/dsl/expression";
import { expectTypeOf, test } from "vitest";

test("TestNumber", () => {

    const a = undefinedLargeNumExpr().plus(nonNullNumExpr());
    expectTypeOf<typeof a>().toEqualTypeOf<Expression<string | undefined, "AS_NUMBER">>();
    
    const b = nonNullLargeNumExpr().plus(undefinedNumExpr());
    expectTypeOf<typeof b>().toEqualTypeOf<Expression<string | undefined, "AS_NUMBER">>();

    const c = nonNullLargeNumExpr().plus(nonNullNumExpr());
    expectTypeOf<typeof c>().toEqualTypeOf<Expression<string, "AS_NUMBER">>();

    const d = undefinedNumExpr().plus(nonNullNumExpr());
    expectTypeOf<typeof d>().toEqualTypeOf<Expression<number | undefined>>();

    const e = nonNullNumExpr().plus(undefinedNumExpr());
    expectTypeOf<typeof e>().toEqualTypeOf<Expression<number | undefined>>();

    const f = nonNullNumExpr().plus(nonNullNumExpr());
    expectTypeOf<typeof f>().toEqualTypeOf<Expression<number>>();

    const g = nonNullNumExpr().plus(nullOrUndefinedNumber());
    expectTypeOf<typeof g>().toEqualTypeOf<Expression<number | null | undefined>>();
});

test("TestString", () => {

    const a = nonNullStrExpr().concat(undefinedStrExpr());
    expectTypeOf<typeof a>().toEqualTypeOf<Expression<string | undefined>>();

    const b = undefinedStrExpr().concat(nonNullStrExpr());
    expectTypeOf<typeof b>().toEqualTypeOf<Expression<string | undefined>>();

    const c = nonNullStrExpr().concat(nonNullStrExpr());
    expectTypeOf<typeof c>().toEqualTypeOf<Expression<string>>();
});

test("TestCoalesc", () => {
    
    const a = undefinedNumExpr().coalesce(undefinedNumExpr(), nonNullNumExpr());
    expectTypeOf<typeof a>().toEqualTypeOf<Expression<number>>();

    const b = undefinedNumExpr().coalesce(undefinedNumExpr(), nullOrUndefinedNumber());
    expectTypeOf<typeof b>().toEqualTypeOf<Expression<number | null | undefined>>();

    const c = undefinedNumExpr().coalesce(undefinedNumExpr(), 3);
    expectTypeOf<typeof c>().toEqualTypeOf<Expression<number>>();
});

function undefinedNumExpr(): Expression<number | undefined> {
    throw new Error();
}

function nullOrUndefinedNumber(): Expression<number | null | undefined> {
    throw new Error();
}

function nonNullNumExpr(): Expression<number> {
    throw new Error();
}

function undefinedLargeNumExpr(): Expression<string | undefined, "AS_NUMBER"> {
    throw new Error();
}

function nonNullLargeNumExpr(): Expression<string, "AS_NUMBER"> {
    throw new Error();
}

function nonNullStrExpr(): Expression<string> {
    throw new Error();
}

function undefinedStrExpr(): Expression<string | undefined> {
    throw new Error();
}