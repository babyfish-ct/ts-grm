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

import { SqlClientImplementor } from "@/sql_client";
import { spi } from "@ts-grm/core";
import { DEFAULT_TRANSACTION_OPTIONS, ImportResult, processMutationRows } from "./utils";
import { Composite } from "@/sql/fragment";
import { SqlBuilder } from "@/sql/sql_builder";

export function executeInsert(
    sqlClient: SqlClientImplementor,
    insert: spi.InsertContract,
    options: {
        readonly nullAsUndefined: boolean;
    }
): Promise<ImportResult> {
    const [sql, args] = buildInsertStatement(sqlClient, insert);
    const transactionManager = sqlClient.driver.transactionManager;
    return transactionManager.execute(DEFAULT_TRANSACTION_OPTIONS, async () => {
        if (insert.returnedProps != null) {
            const rows = await sqlClient.executor.executeQuery(sql, args, { kind: "INSERT"});
            return {
                affectedRowCount: rows.length,
                rows: processMutationRows(rows, options.nullAsUndefined)
            };
        }
        const affectedRowCount = await sqlClient.executor.executeUpdate(sql, args, { kind: "INSERT" });
        return {
            affectedRowCount
        };
    });
}

function buildInsertStatement(
    sqlClient: SqlClientImplementor,
    insert: spi.InsertContract
): [string, ReadonlyArray<any>] {
    const composite = Composite.of(insert, sqlClient, undefined, false)
    const builder = SqlBuilder.of(sqlClient);
    composite.into(builder);
    const [sql, argumentMap] = builder.build();
    const args = Array.from(argumentMap.values());
    return [sql, args];
}