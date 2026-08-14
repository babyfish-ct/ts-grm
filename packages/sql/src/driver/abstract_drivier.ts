import { Composite, Scope, Value } from "@/sql/fragment";
import { ApplyPaginationOptions, Driver } from "./deriver";
import { ColumnDef } from "@/impl/schema_def";
import { NodeRender } from "./node_render";
import { TransactionManager } from "@/transaction/transaction_manger";
import { KEYWORDS } from "./keywords";
import { ScalarType, spi } from "@ts-grm/core";

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

    abstract applyPagination(
        original: Composite, 
        options: ApplyPaginationOptions
    ): Composite;

    protected applyOffsetFetch(
        original: Composite, 
        options: ApplyPaginationOptions,
        standardOffsetFetch: boolean
    ) {
        if (options.wrapper) {
            const composite = new Composite();
            composite.add("select ");
            composite.add(new Scope("INDENT").add("*"));
            composite.add("from ");
            composite.add(
                new Scope("SUB_QUERY").add(original)
            );
            addFetchRange(composite, options, standardOffsetFetch);
            return composite;
        }
        const composite = new Composite();
        composite.add(original);
        addFetchRange(composite, options, standardOffsetFetch);
        return composite;
    }
}

function addFetchRange(
    composite: Composite,
    options: ApplyPaginationOptions,
    standardOffsetFetch: boolean
) {
    if (standardOffsetFetch) {
        composite.add("\noffset ").add(new Value(options.offset ?? 0, undefined, ScalarType.I64)).add(" rows");
        composite.add("\nfetch next ").add(new Value(options.limit, undefined, ScalarType.I64)).add(" rows only");
    } else {
        composite.add("\nlimit ").add(new Value(options.limit));
        if (options.offset != null) {
            composite.add("\noffset ").add(new Value(options.offset));
        }
    }
}