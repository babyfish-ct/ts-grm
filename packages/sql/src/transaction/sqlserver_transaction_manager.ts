import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";
import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Executor, Purpose } from "./executor";
import { Isolation } from "@ts-grm/core";
import { ConnectionPool, Transaction, Request, ISOLATION_LEVEL, IIsolationLevel, connect, config, Int, BigInt } from "mssql";
import { AbstractSyncPool } from "./abstract_sync_pool";

/**
 * The underlying `ConnectionPool` provided by `mssql` 
 * is completely hidden from users, they only have access 
 * to this `SqlServerPool` provided by ts-grm
 */
export class SqlServerPool extends AbstractSyncPool<ConnectionPool> {

    constructor(config: config) {
        super(
            () => connect(config),
            pool => pool.close()
        );
    }

    async getConnection(): Promise<ConnectionPool> {
        return await this.getUnderlyingPool();
    }

    async close(): Promise<void> {
        return this.dispose();
    }
}

export class SqlServerTransactionManager extends AbstractTransactionManager<SqlServerTransactionContext> {

    constructor(
        protected readonly pool: SqlServerPool
    ) {
        super();
    }

    protected override create(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: SqlServerTransactionContext | undefined
    ): SqlServerTransactionContext {
        return new SqlServerTransactionContext(
            isolation,
            timeout,
            prevForSavepoint
        );
    }

    protected override async open(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        ctx.con = await this.pool.getConnection();
    }

    protected override async close(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        ctx.con = undefined;
    }

    protected override async begin(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        ctx.transaction = await 
            new Transaction(ctx.con)
            .begin(isolationLevel(ctx.isolation ?? "READ_COMMITTED"));
    }

    protected override async commit(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        await ctx.transaction!.commit();
    }

    protected override async rollback(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        await ctx.transaction!.rollback();
    }
}

class SqlServerTransactionContext extends TransactionContext<SqlServerTransactionContext> {

    con: ConnectionPool | undefined;

    transaction: Transaction | undefined;

    constructor(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: SqlServerTransactionContext | undefined
    ) {
        super(isolation, timeout, prevForSavepoint);
    }

    protected createExecutor(): Executor {
        return new SqlServerExecutor(this.transaction ?? this.con!);
    }
}

interface Requestable {
    request(): Request;
}

class SqlServerExecutor implements Executor {

    constructor(
        private readonly _requestable: Requestable
    ) {}

    async execute(sql: string): Promise<void> {
        console.log(sql);
        await this._requestable.request().query(sql);
    }

    async executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>, 
        _purpose: Purpose
    ): Promise<DataRows> {
        const request = this._requestable.request();
        request.arrayRowMode = true;
        for (let i = 0; i < args.length; i++) {
            if (args[i]!.explicitType == null) {
                request.input(`p${i + 1}`, args[i]!.value);
            } else {
                switch (args[i]!.explicitType?.kind) {
                    case "I32":
                        request.input(`p${i + 1}`, Int, args[i]!.value);
                        break;
                    case "I64":
                        request.input(`p${i + 1}`, BigInt, args[i]!.value);
                        break;
                    default:
                        request.input(`p${i + 1}`, args[i]!.value);
                        break;
                }
            }
        }
        const result = await request.query(sql);
        return result.recordset;
    }

    executeStatements(
        _sql: string, 
        _binds: ReadonlyArray<ReadonlyArray<Value>>, 
        _purpose: Purpose
    ): Promise<ReadonlyArray<DataRows>> {
        throw new Error("UnsupportedOperationException");
    }
}

function isolationLevel(
    isolation: Isolation
): IIsolationLevel {
    switch (isolation) {
        case "READ_UNCOMMITTED":
            return ISOLATION_LEVEL.READ_UNCOMMITTED;
        case "READ_COMMITTED":
            return ISOLATION_LEVEL.READ_COMMITTED;
        case "REPEATABLE_READ":
            return ISOLATION_LEVEL.REPEATABLE_READ;
        case "SERIALIZABLE":
            return ISOLATION_LEVEL.SERIALIZABLE;
    }
}
