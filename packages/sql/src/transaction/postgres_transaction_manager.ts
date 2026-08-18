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

import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Isolation } from "@ts-grm/core";
import { Executor } from "./executor";
import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";

// Only import types
import type { Pool, PoolClient } from "pg";

export class PostgresTransactionManager extends AbstractTransactionManager<PostgresTransactionContext> {

    constructor(
        protected readonly pool: Pool
    ) {
        super();
    }

    protected override create(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: PostgresTransactionContext | undefined
    ): PostgresTransactionContext {
        return new PostgresTransactionContext(isolation, timeout, prevForSavepoint);
    }

    protected override async open(ctx: PostgresTransactionContext): Promise<void> {
        ctx.con = await this.pool.connect();
    }

    protected override async close(ctx: PostgresTransactionContext): Promise<void> {
        ctx.con!.release();
    }

    protected override async begin(ctx: PostgresTransactionContext): Promise<void> {
        await ctx.con!.query("begin");
    }

    protected override async commit(ctx: PostgresTransactionContext): Promise<void> {
        await ctx.con!.query("commit");
    }

    protected override async rollback(ctx: PostgresTransactionContext): Promise<void> {
        await ctx.con!.query("rollback");
    }
}

class PostgresTransactionContext extends TransactionContext<PostgresTransactionContext> {

    con: PoolClient | undefined = undefined;

    constructor(
        isolation: Isolation | undefined,
        timeout: number,
        prevForSavepoint: PostgresTransactionContext | undefined
    ) {
        super(isolation, timeout, prevForSavepoint);
    }

    protected createExecutor(): Executor {
        return new PostgresExecutor(this.con!);
    }
}

class PostgresExecutor implements Executor {

    constructor(
        private readonly _con: PoolClient
    ) {}

    async execute(sql: string): Promise<void> {
        await this._con.query(sql);
    }

    async executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>
    ): Promise<DataRows> {
        const values = args.map(v => v.value);
        const result = await this._con.query({
            text: sql, 
            values: values,
            rowMode: 'array'
        });
        return result.rows;
    }

    executeStatements(
        _sql: string, 
        _binds: ReadonlyArray<ReadonlyArray<Value>>
    ): Promise<ReadonlyArray<DataRows>> {
        throw new Error("Unsupported Operation");
    }
}