import { SqlClientImplementor } from "@/sql_client";
import { FetchRangeOptions, RootQuery, ScalarType, spi } from "@ts-grm/core";
import { SqlBuilder } from "@/sql/sql_builder";
import { Composite, RootOrderByClause, Scope, Value } from "@/sql/fragment";
import { AtomRootQueryImpl } from "../atom_root_query_impl";
import { ExecuteQueryOptions } from "./execute_query";
import { NumericTypeArrayProvider } from "../numeric_type_array_provider";
import { UnsupportedFeatureError } from "@/error/unsupported_feature_error";

export function buildStatement(
    sqlClient: SqlClientImplementor,
    query: RootQuery<any>,
    options: ExecuteQueryOptions | undefined
): [string, ReadonlyArray<any>] {
    const composite = buildAst(sqlClient, query, options);
    const builder = SqlBuilder.of(sqlClient);
    if (options === "COUNT") {
        RootOrderByClause.disabled = true;
        try {
            composite.into(builder);
        } finally {
            RootOrderByClause.disabled = false;
        }
    } else {
        composite.into(builder);
    }
    const [sql, argumentMap] = builder.build();
    const args = Array.from(argumentMap.values());
    return [sql, args];
}

function buildAst(
    sqlClient: SqlClientImplementor,
    query: RootQuery<any>,
    options: ExecuteQueryOptions | undefined
): Composite {
    if (options === "COUNT") {
        if (query instanceof AtomRootQueryImpl) {
            const countQuery = query.toCount();
            if (countQuery != null) {
                return Composite.of(countQuery, sqlClient, undefined);
            }
        }
        const composite = new Composite();
        composite.add("select ");
        composite.add(new Scope("COMMA").add("count(1)"));
        composite.add("from ");
        composite.add(
            new Scope("SUB_QUERY").add(
                Composite.of(query, sqlClient, undefined)
            )
        );
        composite.add(" core__");
        return composite;
    }
    if (options != null) {
        return applyPagination(sqlClient, query, options);
    }
    return Composite.of(query, sqlClient, undefined);
}

export function numericTypesOf(
    query: RootQuery<any>, 
    countMode: boolean
) : ReadonlyArray<spi.NumericType> | undefined {
    if (countMode) {
        return [spi.NumericType.INTEGER];
    }
    return (query as any as NumericTypeArrayProvider).numericTypes;
}

function applyPagination(
    sqlClient: SqlClientImplementor,
    query: RootQuery<any>,
    options: FetchRangeOptions
): Composite {
    const strategy = sqlClient.driver.paginationStrategy;
    if (strategy === "STANDARD_OFFSET_FETCH") {
        const composite = toPaginationOriginal(sqlClient, query);
        composite.add("\noffset ").add(new Value(options.offset ?? 0, undefined, ScalarType.I64)).add(" rows");
        composite.add("\nfetch next ").add(new Value(options.limit, undefined, ScalarType.I64)).add(" rows only");
        return composite;
    }
    if (strategy === "CLASSIC_LIMIT_OFFSET") {
        const composite = toPaginationOriginal(sqlClient, query);
        composite.add("\nlimit ").add(new Value(options.limit));
        if (options.offset != null) {
            composite.add("\noffset ").add(new Value(options.offset));
        }
        return composite;
    }
    return strategy(toPaginationOriginal(sqlClient, query), options);
}

function toPaginationOriginal(
    sqlClient: SqlClientImplementor,
    query: RootQuery<any>
): Composite {
    if ((query as any as spi.QueryContract).kind == "ATOM") {
        if ((query as any as spi.AtomQueryContract).orders.length === 0) {
            unorderedPagination(sqlClient, false);
        }
        return Composite.of(query, sqlClient, undefined);
    }
    unorderedPagination(sqlClient, true);
    const composite = new Composite();
    composite.add("select ");
    composite.add(new Scope("INDENT").add("*"));
    composite.add("from ");
    composite.add(
        new Scope("SUB_QUERY").add(
            Composite.of(query, sqlClient, undefined)
        )
    )
    composite.add(" core__");
    return composite;
}

function unorderedPagination(
    sqlClient: SqlClientImplementor, 
    mergedQuery: boolean
): void {
    if (!sqlClient.driver.isUnorderedPaginationAllowed) {
        throw new UnsupportedFeatureError(
            `Pagination without an "order by" clause is not supported by the current driver "${
                sqlClient.driver.name
            }"${
                mergedQuery ? ", please use explicit base query API (Derived table or CTE) instead" : ""
            }`
        );
    }
    if (sqlClient.options.isUnorderedPaginationDisabled) {
        throw new UnsupportedFeatureError(
            `Pagination without an "order by" clause is forbidden by the global configuration "isUnorderedPaginationDisabled"${
                mergedQuery ? ", please use explicit base query API (Derived table or CTE) instead" : ""
            }`
        );
    }
}