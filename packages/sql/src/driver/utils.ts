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

import { RootColumnSuffix, RootProjectionCaluse, Scope } from "@/sql/fragment";

export const KEYWORDS: ReadonlySet<string> = new Set<string>([

    "select", "from", "where", "group", "by", "having", "order", "asc", "desc", "limit", "offset",
    "insert", "update", "delete", "into", "values", "set", "create", "table", "drop",
    "alter", "add", "column", "rename", "to", "view", "trigger",

    "and", "or", "not", "in", "is", "null", "like", "glob", "match", "regexp",
    "between", "exists", "case", "when", "then", "else", "end",

    "join", "left", "outer", "inner", "cross", "natural", "on", "using",
    "union", "all", "intersect", "except",

    "primary", "key", "foreign", "references", "unique", "check", "default", 
    "constraint", "collate", "on", "conflict", "do", "nothing", "nothing",

    "comment", "user"
]);

export function projectionScope(
    projection: RootProjectionCaluse,
    tableAlias?: string | undefined
): Scope {
    const scope = new Scope("COMMA");
    const colunmCount = projection.fragments!.filter(f => f instanceof RootColumnSuffix).length;
    for (let i = 1; i <= colunmCount; i++) {
        scope.separator();
        if (tableAlias != null) {
            scope.add(tableAlias).add(".");
        }
        scope.add("f").add(i.toString());
    }
    return scope;
}