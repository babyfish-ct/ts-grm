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

    typeName(columnDef: ColumnDef): string;

    requiresInlineConstraints: boolean;

    writeTableDeletion(
        tableName: string, 
        writer: spi.CodeWriter
    ): void;

    applyPagination(
        original: Composite, 
        options: ApplyPaginationOptions
    ): Composite;
}

export interface ApplyPaginationOptions extends FetchRangeOptions {

    readonly wrapper: boolean;
}