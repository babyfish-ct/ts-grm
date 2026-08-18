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

import { err } from "@ts-grm/core";
import pMemoize from "p-memoize";

export abstract class AbstractSyncPool<TUnderlyingPool> {

    private readonly _getter: () => Promise<TUnderlyingPool>;

    private _state: State<TUnderlyingPool> = { phase: "IDLE" };

    protected constructor(
        creator: () => Promise<TUnderlyingPool>,
        private readonly _defaultDisposer: UnderlyingPoolDisposer<TUnderlyingPool>
    ) {
        this._getter = pMemoize(creator);
    }

    protected async getUnderlyingPool(): Promise<TUnderlyingPool> {
        if (this._state.phase === "READY") {
            return this._state.pool;
        }
        if (this._state.phase === "CREATING") {
            return this._state.promise;
        }
        if (this._isTerminated) {
            throw new err.StateError("The pool has been terminated")
        }
        
        const promise = this._getter();
        this._state = { phase: "CREATING", promise };
        let pool: TUnderlyingPool;
        try {
            pool = await promise;
        } catch (ex) {
            if (this._state.phase === "CREATING") {
                this._state = { phase: "IDLE" };
            }
            throw ex;
        }
        if (this._isTerminated) {
            await this._defaultDisposer(pool);
            throw new err.StateError("The pool has been terminated");
        }
        this._state = { phase: "READY", pool };
        return pool;
    }

    private get _isTerminated(): boolean {
        return this._state.phase === "CLOSING" || this._state.phase === "CLOSED";
    }

    protected tryGetUnderlyingPoolSync(): TUnderlyingPool | undefined {
        return this._state.phase === "READY" ? this._state.pool : undefined;
    }

    protected async dispose(
        disposer?: UnderlyingPoolDisposer<TUnderlyingPool>
    ): Promise<void> {
        if (this._state.phase === "CLOSING") {
            return this._state.promise;
        }
        if (this._state.phase === "CLOSED") {
            return;
        }
        if (this._state.phase === "IDLE") {
            this._state = { phase: "CLOSED" };
            return;
        }
        if (this._state.phase === "CREATING") {
            try {
                const pool = await this._state.promise;
                return this._disposeImpl(pool, disposer);
            } catch (ex) {
                this._state = { phase: "CLOSED" };
                throw ex;
            }
        }
        return this._disposeImpl(this._state.pool, disposer);
    }

    private _disposeImpl(
        pool: TUnderlyingPool,
        disposer?: UnderlyingPoolDisposer<TUnderlyingPool>
    ): Promise<void> {
        const promise = 
            (disposer ?? this._defaultDisposer)(pool)
            .finally(() => {
                this._state = { phase: "CLOSED" };
            });
        this._state = { phase: "CLOSING", promise };
        return promise;
    }
}

export type UnderlyingPoolCreator<TUnderlyingPool> =
    () => Promise<TUnderlyingPool>;

export type UnderlyingPoolDisposer<TUnderlyingPool> =
    (pool: TUnderlyingPool) => Promise<void>;

type State<TUnderlyingPool> =
    | { phase: 'IDLE' }
    | { phase: 'CREATING'; promise: Promise<TUnderlyingPool> }
    | { phase: 'READY'; pool: TUnderlyingPool }
    | { phase: 'CLOSING'; promise: Promise<void> }
    | { phase: 'CLOSED' };