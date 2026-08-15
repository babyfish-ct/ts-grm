import { EntityManager, spi } from "@ts-grm/core";
import { FilterManager } from "./filter";
import { Executor } from "@/transaction/executor";

export interface SqlClientOptions {
    
    readonly strategy: spi.DatabaseNamingStrategy;

    readonly defaultBatchSize: number;

    readonly defaultListBatchSize: number;

    readonly maxJoinFetchDepth: number;

    readonly maxJoinFetchOffset: number;

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