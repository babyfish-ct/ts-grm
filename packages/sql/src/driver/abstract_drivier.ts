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

import { Driver, PaginationStrategy } from "./deriver";
import { ColumnDef } from "@/impl/schema_def";
import { NodeRender } from "./node_render";
import { TransactionManager } from "@/transaction/transaction_manger";
import { KEYWORDS } from "./utils";
import { spi } from "@ts-grm/core";

export abstract class AbstractDriver implements Driver {
    
    private _transactionManager: TransactionManager | undefined = undefined;

    readonly nodeRender: NodeRender = this.createNodeRender();

    abstract name: string;

    abstract typeName(columnDef: ColumnDef): string;

    get transactionManager(): TransactionManager {
        let tm = this._transactionManager;
        if (tm == null) {
            this._transactionManager = tm = this.createTransactionManager();
        }
        return tm;
    }

    get nameParameterPrefix(): string | undefined {
        return undefined;
    }

    get requiresInlineConstraints(): boolean {
        return false;
    }

    get isRecursiveKeywordRequired(): boolean {
        return true;
    }

    get isUnorderedPaginationAllowed(): boolean {
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

    protected abstract createNodeRender(): NodeRender;

    protected abstract createTransactionManager(): TransactionManager;
}
