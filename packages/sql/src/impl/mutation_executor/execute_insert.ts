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
import { spi, TransactionOptions } from "@ts-grm/core";
import { buildInsertStatement } from "./insert_sql_gen";

export function executeInsert(
    sqlClient: SqlClientImplementor,
    insert: spi.InsertContract,
    options: InsertOptions
): Promise<InsertResult> {
    const [sql, args] = buildInsertStatement(sqlClient, insert);
    console.log(sql);
    const transactionManager = sqlClient.driver.transactionManager;
    return transactionManager.execute(DEFAULT_TRANSACTION_OPTIONS, async () => {
        const dataRows = await sqlClient.executor.executeStatement(
            sql, 
            args, 
            { kind: "INSERT" }
        );
        return {
            affectedRowCount: 0
        };
    });
}

export interface InsertOptions {
    readonly returnNothing: boolean,
    readonly nullAsUndefined: boolean
}

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
    propagation: "MANDATORY",
    isolation: "READ_COMMITTED",
    timeout: 0
};

interface InsertResult {
    readonly affectedRowCount?: number;
    readonly rows?: ReadonlyArray<any>;
}