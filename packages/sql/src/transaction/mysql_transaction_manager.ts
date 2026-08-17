import { Isolation } from "@ts-grm/core";
import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Executor, Purpose } from "./executor";
import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";

// Only important types
import type { Pool, PoolConnection } from "mysql2/promise";

export class MySqlTransactionManager extends AbstractTransactionManager<MySqlTransactionContext> {

    constructor(
        protected readonly pool: Pool
    ) {
        super();
    }

    protected create(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: MySqlTransactionContext | undefined
    ): MySqlTransactionContext {
        return new MySqlTransactionContext(isolation, timeout, prevForSavepoint);
    }

    protected override async open(
        ctx: MySqlTransactionContext
    ): Promise<void> {
        ctx.con = await this.pool.getConnection();
    }

    protected override async close(ctx: MySqlTransactionContext): Promise<void> {
        ctx.con!.release();
    }

    protected override async begin(ctx: MySqlTransactionContext): Promise<void> {
        await ctx.con!.beginTransaction();
    }

    protected override async commit(ctx: MySqlTransactionContext): Promise<void> {
        await ctx.con!.commit();
    }

    protected override async rollback(ctx: MySqlTransactionContext): Promise<void> {
        await ctx.con!.rollback();
    }
}

class MySqlTransactionContext extends TransactionContext<MySqlTransactionContext> {

    con: PoolConnection | undefined = undefined;

    constructor(
        isolation: Isolation | undefined,
        timeout: number,
        prevForSavepoint: MySqlTransactionContext | undefined
    ) {
        super(isolation, timeout, prevForSavepoint);
    }

    protected createExecutor(): Executor {
        return new MySqlExecutor(this.con!);
    }
}

class MySqlExecutor implements Executor {

    constructor(
        private readonly _con: PoolConnection
    ) {
    }

    async execute(sql: string): Promise<void> {
        await this._con.execute({
            sql, 
            values: [],
            rowsAsArray: true
        });
    }

    async executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>, 
        _purpose: Purpose
    ): Promise<DataRows> {
        const values = args.map(v => v.value);
        const [result] = await this._con.query({
            sql, 
            values,
            rowsAsArray: true
        });
        return result as DataRows;
    }

    executeStatements(
        _sql: string, 
        _binds: ReadonlyArray<ReadonlyArray<Value>>, 
        _purpose: Purpose
    ): Promise<ReadonlyArray<DataRows>> {
        throw new Error("Unsupported Operation");
    }
}