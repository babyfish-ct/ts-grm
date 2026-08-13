import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";
import { AbstractTransactionManager, TransactionContext } from "./abstract_transaction_manager";
import { Executor, Purpose } from "./executor";
import { Isolation } from "@ts-grm/core";
import { ConnectionPool, Transaction, Request, ISOLATION_LEVEL, IIsolationLevel } from "mssql";

export class SqlServerTransactionManager extends AbstractTransactionManager<SqlServerTransactionContext> {

    constructor(
        protected readonly pool: ConnectionPool
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
        ctx.requestable = this.pool;
    }

    protected override async close(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        ctx.requestable = undefined;
    }

    protected override async begin(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        ctx.requestable = await 
            new Transaction(this.pool)
            .begin(isolationLevel(ctx.isolation ?? "READ_COMMITTED"));
    }

    protected override async commit(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        await (ctx.requestable as Transaction).commit();
        ctx.requestable = this.pool;
    }

    protected override async rollback(
        ctx: SqlServerTransactionContext
    ): Promise<void> {
        await (ctx.requestable as Transaction).rollback();
        ctx.requestable = this.pool;
    }
}

class SqlServerTransactionContext extends TransactionContext<SqlServerTransactionContext> {

    requestable: Requestable | undefined = undefined;

    constructor(
        isolation: Isolation | undefined, 
        timeout: number, 
        prevForSavepoint: SqlServerTransactionContext | undefined
    ) {
        super(isolation, timeout, prevForSavepoint);
    }

    protected createExecutor(): Executor {
        return new SqlServerExecutor(this.requestable!);
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
        const request = this._requestable.request();
        request.arrayRowMode = true;
        for (let i = 0; i < args.length; i++) {
            request.input(`p${i}`, args[i]);
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
