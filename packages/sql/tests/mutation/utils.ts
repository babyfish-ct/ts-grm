import { SqlClientImplementor } from "@/sql_client";
import { SqlClient } from "@ts-grm/core";

export function setRollbackOnly(
    sqlClient: SqlClient,
): void {
    (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
}
