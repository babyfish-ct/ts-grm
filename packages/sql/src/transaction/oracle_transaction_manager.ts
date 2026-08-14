import { err, Isolation } from "@ts-grm/core";
import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Executor, Purpose } from "./executor";
import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";
import OracleDB from "oracledb";
import { AbstractSyncPool } from "./abstract_sync_pool";

/**
 * The underlying `OracleDB.Pool` provided by `oracledb` 
 * is completely hidden from users, they only have access 
 * to this `OraclePool` provided by ts-grm
 */
export class OraclePool extends AbstractSyncPool<OracleDB.Pool> {

    constructor(poolAttributes: OracleDB.PoolAttributes) {
        super(
            () => OracleDB.createPool(poolAttributes),
            pool => pool.close()
        );
    }

    async getConnection(): Promise<OracleDB.Connection> {
        const pool = await this.getUnderlyingPool();
        return pool.getConnection();
    }

    getStatistics(): OracleDB.Statistics | undefined {
        return this.tryGetUnderlyingPoolSync()?.getStatistics();
    }

    async close(drainTime = 0): Promise<void> {
        return this.dispose(pool => pool.close(drainTime));
    }
}

export class OracleTransactionManager extends AbstractTransactionManager<OracleTransactionContext> {

    constructor(
        protected readonly pool: OraclePool
    ) {
        super();
    }
    
    protected override create(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: OracleTransactionContext | undefined
    ): OracleTransactionContext {
        switch (isolation) {
            case "READ_UNCOMMITTED":
            case "REPEATABLE_READ":
                throw new err.ArgumentError(
                    `Oracle does not support the isolation "${isolation}"`
                );
        }
        return new OracleTransactionContext(isolation, timeout, prevForSavepoint);
    }

    protected override async open(ctx: OracleTransactionContext): Promise<void> {
        ctx.con = await this.pool.getConnection();
    }

    protected override async close(ctx: OracleTransactionContext): Promise<void> {
        await ctx.con!.close();
    }

    protected override async begin(ctx: OracleTransactionContext): Promise<void> {
        await ctx.con!.execute(
            `set transaction isolation level ${
                ctx.isolation === "SERIALIZABLE" ? "serializable" : "read committed"
            }`
        );
    }

    protected override async commit(ctx: OracleTransactionContext): Promise<void> {
        await ctx.con!.commit();
    }

    protected override async rollback(ctx: OracleTransactionContext): Promise<void> {
        await ctx.con!.rollback();
    }
}

class OracleTransactionContext extends TransactionContext<OracleTransactionContext> {

    con: OracleDB.Connection | undefined = undefined;

    constructor(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: OracleTransactionContext | undefined
    ) {
        super(isolation, timeout, prevForSavepoint);
    }

    protected createExecutor(): Executor {
        return new OracleExecutor(this.con!);
    }
}

class OracleExecutor implements Executor {

    constructor(
        private readonly _con: OracleDB.Connection
    ) {}

    async execute(sql: string): Promise<void> {
        await this._con.execute(sql);
    }

    async executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>, 
        _purpose: Purpose
    ): Promise<DataRows> {
        const values = args.map(v => v.value);
        const result = await this._con.execute(
            sql, 
            values, 
            { autoCommit: false, outFormat: OracleDB.OUT_FORMAT_ARRAY }
        );
        return result.rows as DataRows;
    }

    async executeStatements(
        _sql: string, 
        _binds: ReadonlyArray<ReadonlyArray<Value>>, 
        _purpose: Purpose
    ): Promise<ReadonlyArray<DataRows>> {
        throw new Error("UnsupportedOperation");    
    }
}