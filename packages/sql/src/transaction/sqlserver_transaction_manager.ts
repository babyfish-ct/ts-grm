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

import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";
import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Executor, Purpose } from "./executor";
import { Isolation } from "@ts-grm/core";
import { AbstractSyncPool } from "./abstract_sync_pool";

// Only import types
import type { ConnectionPool, Transaction, Request, IIsolationLevel, config, ISqlTypeFactoryWithNoParams } from "mssql";

/**
 * The underlying `ConnectionPool` provided by `mssql` 
 * is completely hidden from users, they only have access 
 * to this `SqlServerPool` provided by ts-grm
 */
export class SqlServerPool extends AbstractSyncPool<ConnectionPool> {

    constructor(config: config) {
        super(
            async () => {
                const runtime = await mssqlRuntime();
                return runtime.connect(config);
            },
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
        const runtime = await mssqlRuntime();
        ctx.transaction = await 
            runtime.createTransaction(ctx.con)
            .begin(await isolationLevel(ctx.isolation ?? "READ_COMMITTED"));
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
        await this._requestable.request().query(sql);
    }

    async executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>, 
        _purpose: Purpose
    ): Promise<DataRows> {
        const runtime = await mssqlRuntime();
        const request = this._requestable.request();
        request.arrayRowMode = true;
        for (let i = 0; i < args.length; i++) {
            if (args[i]!.explicitType == null) {
                request.input(`p${i + 1}`, args[i]!.value);
            } else {
                switch (args[i]!.explicitType?.kind) {
                    case "I32":
                        request.input(`p${i + 1}`, runtime.int, args[i]!.value);
                        break;
                    case "I64":
                        request.input(`p${i + 1}`, runtime.bigInt, args[i]!.value);
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

async function isolationLevel(
    isolation: Isolation
): Promise<IIsolationLevel> {
    const runtime = await mssqlRuntime();
    switch (isolation) {
        case "READ_UNCOMMITTED":
            return runtime.readUncommited;
        case "READ_COMMITTED":
            return runtime.readCommited;
        case "REPEATABLE_READ":
            return runtime.repeatableRead;
        case "SERIALIZABLE":
            return runtime.serializeable;
    }
}

let _mssqlRuntime: MssqlRuntime | undefined;

async function mssqlRuntime(): Promise<MssqlRuntime> {
    let runtime = _mssqlRuntime;
    if (runtime == null) {
        const mssql = await import("mssql");
        _mssqlRuntime = runtime = {
            int: mssql.Int,
            bigInt: mssql.BigInt,
            readUncommited: mssql.ISOLATION_LEVEL.READ_UNCOMMITTED,
            readCommited: mssql.ISOLATION_LEVEL.READ_COMMITTED,
            repeatableRead: mssql.ISOLATION_LEVEL.REPEATABLE_READ,
            serializeable: mssql.ISOLATION_LEVEL.SERIALIZABLE,
            connect: mssql.connect,
            createTransaction: con => new mssql.Transaction(con)
        };
    }
    return runtime;
}

interface MssqlRuntime {
    readonly int: ISqlTypeFactoryWithNoParams;
    readonly bigInt: ISqlTypeFactoryWithNoParams;
    readonly readUncommited: number;
    readonly readCommited: number;
    readonly repeatableRead: number;
    readonly serializeable: number;
    readonly connect: (config: config | string) => Promise<ConnectionPool>;
    readonly createTransaction: (connection?: ConnectionPool) => Transaction;
}
