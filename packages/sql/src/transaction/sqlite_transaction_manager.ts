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

import { Isolation, Propagation } from "@ts-grm/core";
import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Executor } from "./executor";
import { Value } from "@/sql/fragment";
import { DataRows } from "@/impl/data_row_reader";

// Only import types
import type { Database } from "better-sqlite3";

export class SqliteTransactionManager 
extends AbstractTransactionManager<SqliteTransactionContext> {

    constructor(
        protected readonly database: Database
    ) {
        super();
    }

    protected override isPropagationSupported(propagation: Propagation): boolean {
        return propagation === "REQUIRED" || propagation === "MANDATORY" || propagation === "NESTED";
    }

    protected override create(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: SqliteTransactionContext | undefined
    ): SqliteTransactionContext {
        return new SqliteTransactionContext(
            this.database,
            isolation,
            timeout,
            prevForSavepoint
        );    
    }

    protected override async open(_: SqliteTransactionContext): Promise<void> {}

    protected override async close(_: SqliteTransactionContext): Promise<void> {}

    protected override async begin(ctx: SqliteTransactionContext): Promise<void> {
        if (ctx.savepointName != null) {
            this.database.exec(`savepoint ${ctx.savepointName}`);
        } else {
            const stmt = ctx.isolation === "SERIALIZABLE" ? "begin exclusive" 
                   : ctx.isolation === "REPEATABLE_READ" ? "begin immediate"
                   : "begin";
            this.database.exec(stmt);
        }
    }

    protected override async commit(ctx: SqliteTransactionContext): Promise<void> {
        if (ctx.savepointName != null) {
            this.database.exec(`release savepoint ${ctx.savepointName}`);
        } else {
            this.database.exec(`commit`);
        }
    }

    protected override async rollback(ctx: SqliteTransactionContext): Promise<void> {
        if (ctx.savepointName != null) {
            this.database.exec(`rollback to savepoint ${ctx.savepointName}`);
        } else {
            this.database.exec(`rollback`);
        }
    }
}

class SqliteTransactionContext extends TransactionContext<SqliteTransactionContext> {

    constructor(
        private readonly _database: Database,
        isolation: Isolation | undefined,
        timeout: number,
        prevForSavepoint: SqliteTransactionContext | undefined
    ) {
        super(isolation, timeout, prevForSavepoint);
    }

    protected createExecutor(): Executor {
        return new SqliteExecutor(this._database);
    }
}

class SqliteExecutor implements Executor {

    constructor(
        private readonly _database: Database
    ) {}

    async execute(sql: string): Promise<void> {
        this._database.exec(sql);
    }

    async executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>
    ): Promise<DataRows> {
        const stmt = this._database.prepare(sql);
        stmt.raw(true);
        const values = args.map(v => v.value);
        return stmt.all(values) as DataRows;
    }

    async executeStatements(
        sql: string, 
        binds: ReadonlyArray<ReadonlyArray<Value>>
    ): Promise<ReadonlyArray<DataRows>> {
        const results: Array<DataRows> = [];
        const stmt = this._database.prepare(sql);
        stmt.raw(true);
        for (const args of binds) {
            const values = args.map(v => v.value);
            const rows = stmt.all(values) as DataRows;
            results.push(rows);
        }
        return results;
    }
}