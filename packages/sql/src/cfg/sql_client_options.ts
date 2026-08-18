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

import { EntityManager, spi } from "@ts-grm/core";
import { FilterManager } from "./filter";
import { Executor } from "@/transaction/executor";

export interface SqlClientOptions {
    
    readonly strategy: spi.DatabaseNamingStrategy;

    readonly defaultBatchSize: number;

    readonly defaultListBatchSize: number;

    readonly maxJoinFetchDepth: number;

    readonly maxJoinFetchOffset: number;

    /**
     * No matter {@link Driver.isUnorderedPaginationAllowed},
     * Forbie the unordered pagination
     */
    readonly isUnorderedPaginationDisabled: boolean;

    readonly sqlLogger: SqlLogger;

    readonly filterManager: FilterManager;

    readonly entityManager: EntityManager | undefined;

    readonly executorCreator: (executor: Executor) => Executor;
};

export type SqlLogger = {

    readonly pretty: boolean;

    readonly parameter: SqlLoggerParameterType;
}

export type SqlLoggerParameterType = "PLACEHOLDER" | "COMMENT" | "INLINE";