import { RootColumnSuffix, RootProjectionCaluse, Scope } from "@/sql/fragment";

export const KEYWORDS: ReadonlySet<string> = new Set<string>([

    "select", "from", "where", "group", "by", "having", "order", "limit", "offset",
    "insert", "update", "delete", "into", "values", "set", "create", "table", "drop",
    "alter", "add", "column", "rename", "to", "view", "trigger",

    "and", "or", "not", "in", "is", "null", "like", "glob", "match", "regexp",
    "between", "exists", "case", "when", "then", "else", "end",

    "join", "left", "outer", "inner", "cross", "natural", "on", "using",
    "union", "all", "intersect", "except",

    "primary", "key", "foreign", "references", "unique", "check", "default", 
    "constraint", "collate", "on", "conflict", "do", "nothing", "nothing",

    "comment"
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