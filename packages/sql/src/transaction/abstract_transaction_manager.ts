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

import { sqlerr } from "@/error";
import { err, Isolation, Propagation, TransactionOptions } from "@ts-grm/core";
import { AsyncLocalStorage } from "async_hooks";
import { TransactionManager } from "./transaction_manger";
import { Executor } from "./executor";

export abstract class AbstractTransactionManager<TContext extends TransactionContext<TContext>> 
implements TransactionManager {

    async execute<R>(
        options: TransactionOptions,
        fn: () => Promise<R>
    ): Promise<R> {
        if (!this.isPropagationSupported(options.propagation)) {
            throw new err.ArgumentError(
                `The propagation "${options.propagation}" is not supported by current database`
            );
        }
        if (!this.isIsolationSupported(options.isolation)) {
            throw new err.ArgumentError(
                `The isolation "${options.isolation}" is not supported by current database`
            );
        }
        const ctx = transactionStorage.getStore() as TContext | undefined;
        switch (options.propagation) {
            case "REQUIRED":
                if (ctx?.isolation != null) {
                    await this.validateIsolation(ctx.isolation, options.isolation);
                    return await executeInTimeout(options.timeout, fn);
                }
                return await this.executeInNewContext(options.isolation, options.timeout, undefined, fn);
            case "REQUIRES_NEW":
                return await this.executeInNewContext(options.isolation, options.timeout, undefined, fn);
            case "NOT_SUPPORTED":
                if (ctx != null && ctx.isolation == null) {
                    return await executeInTimeout(options.timeout, fn);
                }
                return await this.executeInNewContext(undefined, options.timeout, undefined, fn);
            case "MANDATORY":
                if (ctx?.isolation == null) {
                    throw new err.ArgumentError(`There is no existing transaction`);
                }
                await this.validateIsolation(ctx.isolation, options.isolation);
                return await executeInTimeout(options.timeout, fn);
            case "NEVER":
                if (ctx?.isolation != null) {
                    throw new err.ArgumentError(`There is existing transaction`);
                }
                if (ctx != null) {
                    return await executeInTimeout(options.timeout, fn);
                }
                return await this.executeInNewContext(undefined, options.timeout, undefined, fn);
            case "NESTED":
                if (ctx?.isolation == null) {
                    return await this.executeInNewContext(options.isolation, options.timeout, undefined, fn);
                }
                return await this.executeInNewContext(options.isolation, options.timeout, ctx, fn);
        }
    }

    async executeReadonly<R>(
        fn: () => Promise<R>
    ): Promise<R> {
        const ctx = transactionStorage.getStore() as TContext | undefined;
        if (ctx != null) {
            return await fn();
        }
        return await this.executeInNewContext(undefined, 0, undefined, fn);
    }

    private async executeInNewContext<R>(
        isolation: Isolation | undefined,
        timeout: number,
        prevForSavepoint: TContext | undefined,
        fn: () => Promise<R>
    ): Promise<R> {
        const ctx = this.create(isolation, timeout, prevForSavepoint);
        if (prevForSavepoint) {
            return transactionStorage.run(ctx, async () => {
                let result: R;
                await this.begin(ctx);
                try {
                    result = await executeInTimeout(timeout, fn);
                } catch (ex) {
                    await this.rollback(ctx);
                    throw ex;
                }
                await this.commit(ctx);
                return result;
            });
        }
        if (isolation == null) {
            return transactionStorage.run(ctx, async () => {
                await this.open(ctx);
                try {
                    return await executeInTimeout(timeout, fn);
                } finally {
                    await this.close(ctx);
                }
            });
        }
        return transactionStorage.run(ctx, async () => {
            let result: R;
            await this.open(ctx);
            try {
                await this.begin(ctx);
                try {
                    result = await executeInTimeout(timeout, fn);
                } catch (ex) {
                    await this.rollback(ctx);
                    throw ex;
                }
                await this.commit(ctx);
            } finally {
                await this.close(ctx);
            }
            return result;
        });
    }

    private async validateIsolation(
        oldValue: Isolation,
        newValue: Isolation
    ): Promise<void> {
        if (isolationLevel(oldValue) >= isolationLevel(newValue)) {
            return;
        }
        try {
            await this.upgrade(newValue);
        } catch (ex) {
            if (ex instanceof err.StateError) {
                throw new err.ArgumentError(
                    `Cannot join existing transaction: ` +
                    `requested isolation ${newValue} is stricter than ` +
                    `current ${oldValue}`
                );
            }
            throw ex;
        }
    }

    protected isPropagationSupported(
        _: Propagation
    ): boolean {
        return true;
    }

    protected isIsolationSupported(
        _: Isolation
    ) {
        return true;
    }

    protected abstract create(
        isolation: Isolation | undefined, 
        timeout: number,
        prevForSavepoint: TContext | undefined
    ): TContext

    protected abstract open(ctx: TContext): Promise<void>;

    protected abstract close(ctx: TContext): Promise<void>;

    protected abstract begin(ctx: TContext): Promise<void>;

    protected abstract commit(ctx: TContext): Promise<void>;

    protected abstract rollback(ctx: TContext): Promise<void>;

    protected upgrade(_: Isolation): Promise<void> {
        throw new err.StateError(`The "uprade" has not been implemented`);
    }

    get defaultExecutor(): Executor {
        const ctx = transactionStorage.getStore() as TContext;
        if (ctx == null) {
            throw new err.StateError(`Cannot get the default executor because there is no openning connection`);
        }
        return ctx.executor;
    }
}

export abstract class TransactionContext<TContext extends TransactionContext<TContext>> {
    
    private _executor: Executor | undefined = undefined;

    readonly savepointName: string | undefined;

    private static _savepointIdSequence = 0;

    constructor(
        readonly isolation: Isolation | undefined, // Undefined means no transaction
        readonly timeout: number,
        readonly prevForSavepoint: TContext | undefined
    ) {
        this.savepointName = prevForSavepoint != null
            ? `savepoint_${++TransactionContext._savepointIdSequence}`
            : undefined
    }

    get executor(): Executor {
        let executor = this._executor;
        if (executor == null) {
            this._executor = executor = this.createExecutor();
        }
        return executor;
    }

    protected abstract createExecutor(): Executor;
}

const transactionStorage = new AsyncLocalStorage<TransactionContext<any>>();

async function executeInTimeout<R>(
    timeout: number,
    fn: () => Promise<R>
): Promise<R> {
    if (timeout <= 0) {
        return fn();
    }
    return new Promise<R>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new sqlerr.TimeoutError(timeout));
        }, timeout);
        fn().then(
            result => { clearTimeout(timer); resolve(result); },
            error  => { clearTimeout(timer); reject(error); }
        );
    });
}

function isolationLevel(isolation: Isolation): number {
    switch (isolation) {
        case "READ_UNCOMMITTED":
            return 0;
        case "READ_COMMITTED":
            return 1;
        case "REPEATABLE_READ":
            return 2;
        case "SERIALIZABLE":
            return 3;
    }
}

export type AsyncCallback = () => Promise<void>;