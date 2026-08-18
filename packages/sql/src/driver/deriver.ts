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
