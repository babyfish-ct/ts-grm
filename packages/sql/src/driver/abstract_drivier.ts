import { Driver, PaginationStrategy } from "./deriver";
import { ColumnDef } from "@/impl/schema_def";
import { NodeRender } from "./node_render";
import { TransactionManager } from "@/transaction/transaction_manger";
import { KEYWORDS } from "./utils";
import { spi } from "@ts-grm/core";

export abstract class AbstractDriver implements Driver {
    
    abstract name: string;

    abstract nodeRender: NodeRender;

    abstract transactionManager: TransactionManager;

    abstract typeName(columnDef: ColumnDef): string;

    get nameParameterPrefix(): string | undefined {
        return undefined;
    }

    get requiresInlineConstraints(): boolean {
        return false;
    }

    get isRecursiveKeywordRequired(): boolean {
        return true;
    }

    get paginationStrategy(): PaginationStrategy {
        return "CLASSIC_LIMIT_OFFSET";
    }

    quoteIdentifier(value: string): string {
        if (KEYWORDS.has(value.toLowerCase())) {
            return `"${value}"`;
        }
        return value;
    }

    writeTableDeletion(
        tableName: string, 
        writer: spi.CodeWriter
    ): void {
        writer.code(`drop table if exists ${tableName}`);
    }
}
