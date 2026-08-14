import { err, ScalarType, spi, TimeUnit } from "@ts-grm/core";
import { AbstractNodeRender } from "./abstract_node_render";
import { NodeRender, NodeRenderContext } from "./node_render";
import { Precedence } from "@/sql/precedence";
import { UnsupportedFeatureError } from "@/error/unsupported_feature_error";
import { AbstractDriver } from "./abstract_drivier";
import { TransactionManager } from "@/transaction/transaction_manger";
import { ColumnDef } from "@/impl/schema_def";
import { SqlServerPool, SqlServerTransactionManager } from "@/transaction/sqlserver_transaction_manager";
import { MetadataError } from "@/error/metadata_error";
import { KEYWORDS, projectionScope } from "./utils";
import { Composite, Query, RootOrderByClause, RootProjectionCaluse, RootQueryWrapper, Scope, Value } from "@/sql/fragment";
import { ApplyPaginationOptions } from "./deriver";

export class SqlServerDriver extends AbstractDriver {

    readonly nodeRender: NodeRender = nodeRender;

    readonly transactionManager: TransactionManager;

    constructor(
        pool: SqlServerPool
    ) {
        super();
        this.transactionManager = new SqlServerTransactionManager(pool);
    }

    get name(): string {
        return "SqlServer"; 
    }

    get nameParameterPrefix(): string | undefined {
        return "@p";
    }

    override quoteIdentifier(value: string): string {
        if (KEYWORDS.has(value.toLowerCase())) {
            return `[${value}]`;
        }
        return value;
    }

    override typeName(columnDef: ColumnDef): string {
        switch (columnDef.type.kind) {
            case "BOOL":
                return "bit";
            case "I8":
                return "tinyint";
            case "I16":
                return "smallint";
            case "I32":
                return "int";
            case "I64":
                return "bigint";
            case "F32":
                return "real"; 
            case "F64":
                return "float";
            case "NUM":
                return `decimal(${columnDef.precision}, ${columnDef.scale})`;
            case "STR":
                return `nvarchar(${columnDef.length})`;
            case "BINARY":
                return "varbinary(max)";
            default:
                throw new MetadataError(`Unsupported scalar type: ${columnDef.type.kind}`);
        }
    }

    override applyPagination(
        original: Composite, 
        options: ApplyPaginationOptions
    ): Composite {
        const query = original.fragments!.find(f => f instanceof Query) as Query;
        const orderByClause = query.fragments!.find(f => f instanceof RootOrderByClause) as RootOrderByClause | undefined;
        if (orderByClause == null) {
            throw new err.StateError(
                "Pagination of SqlServerDriver(not SqlServer2012Driver) requires order by clause of root query, " +
                "please specify the orders or use SqlServer2012Driver"
            );
        }
        const projection = query.fragments!.find(f => f instanceof RootProjectionCaluse) as RootProjectionCaluse;
        query.remove(orderByClause);
        projection
            .separator()
            .add("row_number() over")
            .add(new Scope("SUB_QUERY").add(orderByClause))
            .add(" rn__")
        return new Composite()
            .add("select ")
            .add(projectionScope(projection))
            .add("\nfrom ")
            .add(new RootQueryWrapper().add(original))
            .add(" core__")
            .add("\nwhere rn__ between ")
            .add(new Value((options.offset ?? 0) + 1, undefined, ScalarType.I32))
            .add(" and ")
            .add(new Value((options.offset ?? 0) + options.limit, undefined, ScalarType.I32))
            .add("\norder by rn__");
    }
}

const nodeRender = new class extends AbstractNodeRender {

    constructor() {
        super("SqlServer");
    }

    override renderDtPlusExpr(
        expr: spi.DtPlusExpr, 
        ctx: NodeRenderContext
    ): void {
        
        let value = expr.neg ? -expr.value : expr.value;
        const unit = expr.unit;
        
        if (unit === "DECADES") {
            value = value * 10;
        } else if (unit === "CENTURIES") {
            value = value * 100;
        }
        
        if (!Number.isInteger(value)) {
            throw new UnsupportedFeatureError(`SQL Server does not support fractional time units: ${value} ${unit}`);
        }
        
        const finalUnit = unit === "DECADES" || unit === "CENTURIES" 
            ? "year" 
            : unitMap[unit];
        
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("DATEADD(");
        ctx.text(finalUnit);
        ctx.text(", ");
        ctx.text(value.toString());
        ctx.text(", ");
        ctx.render(expr.expr);
        ctx.text(")");
    }

    override renderDtDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {

        let unit = expr.unit;
        let multiplier: number | undefined = undefined;
        let divisor: number | undefined = undefined;
     
        if (unit === "NANOSECONDS") {
            unit = "MICROSECONDS";
            multiplier = 1000;
        } else if (unit === "DECADES") {
            unit = "YEARS";
            divisor = 10;
        } else if (unit === "CENTURIES") {
            unit = "YEARS";
            divisor = 100;
        }
        
        if (multiplier !== undefined) {
            using _ = ctx.withPrecedence(Precedence.TIMES);
            this._renderDtDiffExpr(expr, ctx);
            ctx.text(" * ");
            ctx.text(multiplier.toString());
        } else if (divisor !== undefined) {
            using _ = ctx.withPrecedence(Precedence.TIMES);
            this._renderDtDiffExpr(expr, ctx);
            ctx.text(" / ");
            ctx.text(divisor.toString());
        } else {
            this._renderDtDiffExpr(expr, ctx);
        }
    }

    private _renderDtDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        const finalUnit = unitMap[expr.unit];
        ctx.text("DATEDIFF(");
        ctx.text(finalUnit);
        ctx.text(", ");
        ctx.render(expr.valueExpr);
        ctx.text(", ");
        ctx.render(expr.expr);
        ctx.text(")");
    }
}

const unitMap: Record<TimeUnit, string> = {
    "NANOSECONDS": "nanosecond",
    "MICROSECONDS": "microsecond",
    "MILLISECONDS": "millisecond",
    "SECONDS": "second",
    "MINUTES": "minute",
    "HOURS": "hour",
    "DAYS": "day",
    "WEEKS": "week",
    "MONTHS": "month",
    "QUARTERS": "quarter",
    "YEARS": "year",
    "DECADES": "year",
    "CENTURIES": "year"
};