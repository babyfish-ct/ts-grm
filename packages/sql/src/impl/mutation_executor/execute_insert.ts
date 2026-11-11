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
import { AnyAssociationModel, AnyModel, BaseModel, spi, TransactionOptions } from "@ts-grm/core";

export function executeInsert(
    sqlClient: SqlClientImplementor,
    model: AnyModel | AnyAssociationModel,
    source: Iterable<spi.SourceRow> | BaseModel<any>,
    bindings: ReadonlyArray<spi.InsertBinding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
    returnedProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined,
    options: {
        readonly returnNothing: boolean,
        readonly nullAsUndefined: boolean
    }
): Promise<InsertResult> {
    const transactionManager = sqlClient.driver.transactionManager;
    return transactionManager.execute(DEFAULT_TRANSACTION_OPTIONS, async () => {
        throw new Error();
    });
}

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
    propagation: "MANDATORY",
    isolation: "READ_COMMITTED",
    timeout: 0
};

interface InsertResult {
    readonly affectedRowCount: number;
    readonly rows: ReadonlyArray<any>;
}