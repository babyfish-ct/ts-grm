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

import { __EntityTableLike, AtLeastTwo, BaseQuerySelectMapArgs, dsl, Expression, ExpressionLike, spi } from "@ts-grm/core";

export function capitalize(str: string): string {
    if (str.length === 0) {
        return str;
    }
    const firstChar = String.fromCodePoint(str.codePointAt(0)!);
    const rest = str.slice(firstChar.length);
    return firstChar.toUpperCase() + rest;
}

export function expressionsToAst(
    expressions: ReadonlyArray<Expression<any>>
): any {
    if (expressions.length === 1) {
        return expressions[0]!;
    }
    return dsl.tuple(...(expressions as AtLeastTwo<any>));
}

export function baseQuerySelectionMapArgs(
    ...partials: ReadonlyArray<
        ReadonlyArray<ExpressionLike> 
        | { readonly [key: string]: ExpressionLike | __EntityTableLike }
        | null
        | undefined
    >
): BaseQuerySelectMapArgs {
    const args: { 
        [key: string]: ExpressionLike | __EntityTableLike;
    } = {};
    let autoIndex = 0;
    for (const partial of partials) {
        if (partial == null) {
            continue;
        }
        if (Array.isArray(partial)) {
            for (const selection of partial) {
                args[`_${autoIndex++}`] = selection;
            }
        } else {
            Object.assign(args, partial);
        }
    }
    return args;
}

export function hashOf(value: any): any {
    if (!Array.isArray(value)) {
        return value;
    }
    let hash = "";
    for (const e of value) {
        if (hash.length !== 0) {
            hash += '\x1F';
        }
        hash += e;
    }
    return hash;
}

export function filterSourceRows(
    rows: ReadonlyArray<spi.DtoRow>,
    field: spi.DtoMapperField
): ReadonlyArray<spi.DtoRow> {
    const downcastTo = field.downcastTo;
    if (downcastTo == null) {
        return rows;
    }
    const typeNames = new Set<string>();
    typeNames.add(downcastTo.name);
    for (const descendant of downcastTo.descendants) {
        typeNames.add(descendant.name);
    }
    return rows.filter(row => typeNames.has(row.typeName!));
}