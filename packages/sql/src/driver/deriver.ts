import { ColumnDef } from "@/impl/schema_def";
import { NodeRender } from "./node_render";
import { TransactionManager } from "@/transaction/transaction_manger";
import { FetchRangeOptions, spi } from "@ts-grm/core";
import { Composite } from "@/sql/fragment";

export interface Driver extends spi.DatabaseKeywordStrategy {

    readonly name: string;

    readonly transactionManager: TransactionManager;

    readonly nodeRender: NodeRender;

    readonly nameParameterPrefix: string | undefined;

    readonly isRecursiveKeywordRequired: boolean;

    readonly isUnorderedPaginationAllowed: boolean;

    readonly paginationStrategy: PaginationStrategy;

    typeName(columnDef: ColumnDef): string;

    requiresInlineConstraints: boolean;

    writeTableDeletion(
        tableName: string, 
        writer: spi.CodeWriter
    ): void;
}

export type PaginationStrategy =
    "STANDARD_OFFSET_FETCH"
    | "CLASSIC_LIMIT_OFFSET"
    | PaginationTransformer;

export type PaginationTransformer = (
    composite: Composite, 
    options: FetchRangeOptions
) => Composite;
