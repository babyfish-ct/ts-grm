import { ScalarProvider, ScalarType, spi, TimeUnit } from "@ts-grm/core";
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
import { Composite, Query, RootOrderByClause, RootProjectionCaluse, RootQueryWrapper, Scope, Value, valueOf } from "@/sql/fragment";
import { PaginationStrategy, PaginationTransformer } from "./deriver";

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

    get isUnorderedPaginationAllowed(): boolean {
        return false;
    }

    get paginationStrategy(): PaginationStrategy {
        return paginationTransformer;
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
}

const nodeRender = new class extends AbstractNodeRender {

    constructor() {
        super("SqlServer");
    }

    renderTupleCmpPred(
        pred: spi.TupleCmpPred, 
        ctx: NodeRenderContext
    ): void {
        renderTupleCmp(
            pred.op, 
            pred.leftTuple, 
            pred.rightTuple, 
            pred.providers, 
            ctx
        );
    }

    renderTupleInCollectionPred(
        pred: spi.TupleInCollectionPred, 
        ctx: NodeRenderContext
    ): void {
        const providers = pred.providers;
        const leftTuple = pred.tuple;
        const op = pred.neg ? "<>" : "=";
        using _ = ctx.withComposite(
            pred.neg
                ? new Scope("AND")
                : new Scope("OR")
        );
        for (const rightTuple of pred.tuples) {
            ctx.separator();
            renderTupleCmp(
                op, 
                leftTuple, 
                rightTuple, 
                providers, 
                ctx
            );
        }
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

function renderTupleCmp(
    op: "=" | "<>",
    leftTuple: spi.TupleContract,
    rightTuple: spi.TupleContract,
    providers: ReadonlyArray<ScalarProvider<any, any> | undefined> | undefined,
    ctx: NodeRenderContext
) {
    const span = leftTuple.exprs.length;
    using _ = ctx.withComposite(
        op === "<>"
            ? new Scope("OR")
            : new Scope("AND")
    );
    for (let i = 0; i < span; i++) {
        ctx.separator();
        const provider = providers != null ? providers[i]! : undefined;
        const leftExpr = leftTuple.exprs[i]!;
        const rightExpr = rightTuple.exprs[i]!;
        if (provider != null && leftExpr.isValueExpr) {
            ctx.render(valueOf(leftExpr, provider));
        } else {
            ctx.render(leftExpr);
        }
        ctx.text(" ");
        ctx.text(op);
        ctx.text(" ");
        if (provider != null && rightExpr.isValueExpr) {
            ctx.render(valueOf(rightExpr, provider));
        } else {
            ctx.render(rightExpr);
        }
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

const paginationTransformer: PaginationTransformer = (original, options) => {
    const query = original.fragments!.find(f => f instanceof Query) as Query | undefined;
    if (query == null) {
        throw new UnsupportedFeatureError(
            `Unable to paginate a set operation query (UNION, UNION ALL, EXCEPT, EXCEPT ALL, ` +
            `INTERSECT, or INTERSECT ALL) using "SqlServerDriver": pagination for SQL Server 2005~2008 ` +
            `relies on wrapping the query with "ROW_NUMBER() OVER(...)", which cannot be applied directly ` +
            `on top of a set operation query. To fix this, either use "SqlServer2012Driver" (or a later ` +
            `version), which supports "OFFSET ... FETCH NEXT ... ROWS ONLY" and can paginate set operation ` +
            `queries directly, or restructure the query so pagination is applied to each sub-query ` +
            `individually before the set operation is performed.`
        );
    }
    const orderByClause = query.fragments!.find(f => f instanceof RootOrderByClause) as RootOrderByClause | undefined;
    if (orderByClause == null) {
        throw new UnsupportedFeatureError(
            `Unable to paginate a query without an "order by" clause using "SqlServerDriver": ` +
            `pagination for SQL Server 2005~2008 relies on wrapping the query with ` +
            `"ROW_NUMBER() OVER(order by ...)", which requires an explicit ordering to produce ` +
            `a well-defined row order. To fix this, either use "SqlServer2012Driver" (or a later ` +
            `version), which supports "OFFSET ... FETCH NEXT ... ROWS ONLY" and does not strictly ` +
            `require an "order by" clause, or specify an explicit ordering (e.g. via "orderBy(...)") ` +
            `on the query.`
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