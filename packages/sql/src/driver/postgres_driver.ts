import { ScalarType, spi, TimeUnit } from "@ts-grm/core";
import { AbstractNodeRender } from "./abstract_node_render";
import { NodeRender, NodeRenderContext } from "./node_render";
import { Precedence } from "@/sql/precedence";
import { Pool } from "pg";
import { TransactionManager } from "@/transaction/transaction_manger";
import { PostgresTransactionManager } from "@/transaction/postgres_transaction_manager";
import { ColumnDef } from "@/impl/schema_def";
import { MetadataError } from "@/error/metadata_error";
import { AbstractDriver } from "./abstract_drivier";
import { Scope, Value, valueOf } from "@/sql/fragment";

export class PostgresDriver extends AbstractDriver {

    readonly nodeRender: NodeRender = nodeRender;

    readonly transactionManager: TransactionManager;

    constructor(
        pool: Pool
    ) {
        super();
        this.transactionManager = new PostgresTransactionManager(pool);
    }

    get name(): string {
        return "sqlite";
    }

    get nameParameterPrefix(): string | undefined {
        return "$";
    }

    typeName(columnDef: ColumnDef): string {
        const tn = typeName(columnDef.type) 
        if (tn == null) {
            throw new MetadataError(`Unsuported scalar type: ${columnDef.type.kind}`);
        }
        return tn;
    }

    override writeTableDeletion(
        tableName: string, 
        writer: spi.CodeWriter
    ): void {
        writer.code(`drop table if exists ${tableName} cascade`);
    }
}

const nodeRender = new class extends AbstractNodeRender {

    constructor() {
        super("Postgres");
    }

    renderInCollectinPred(
        pred: spi.InCollectionPred<any>, 
        ctx: NodeRenderContext
    ): void {
        if (pred.values.find(e => !e.isValueExpr) != null) {
            super.renderInCollectinPred(pred, ctx);
            return;
        }
        const provider = pred.expr.scalarProvider;
        const values = pred.values.map(e => valueOf(e, provider).value);
        if (pred.neg) {
            using _ = ctx.withPrecedence(Precedence.ROOT);
            ctx.render("not (")
            ctx.render(pred.expr);
            ctx.text(" = any(");
            ctx.render(new Value(values));
            ctx.text("))");
        } else {
            using _ = ctx.withPrecedence(Precedence.COMPARISON);
            ctx.render(pred.expr);
            ctx.text(" = any(");
            ctx.render(new Value(values));
            ctx.text(")");
        }
    }

    renderTupleInCollectionPred(
        pred: spi.TupleInCollectionPred, 
        ctx: NodeRenderContext
    ): void {
        const typeNames: Array<string> = [];
        for (const expr of pred.tuple.exprs) {
            const tn = expr.isPropExpr
                ? typeName((expr as any as spi.PropExprContract).prop.scalarType!)
                : undefined;
            if (tn == null) {
                super.renderTupleInCollectionPred(pred, ctx);
                return;
            }
            typeNames.push(tn);
        }
        if (pred.tuples.find(
            tuple => tuple.exprs.find(e => !e.isValueExpr || e.scalarProvider) != null
        ) != null) {
            super.renderTupleInCollectionPred(pred, ctx);
            return;
        }
        const providers = pred.providers;
        const columns: Array<ReadonlyArray<any>> = [];
        for (let i = 0; i < typeNames.length; i++) {
            columns[i] = pred.tuples.map(tuple => valueOf(tuple.exprs[i]!, providers[i]).value);
        }
        using _ = ctx.withPrecedence(Precedence.COMPARISON);
        ctx.render(pred.tuple);
        ctx.text(pred.neg ? " not in " : " in ");
        using __ = ctx.withComposite(new Scope("SUB_QUERY"));
        ctx.text("select ");
        {
            using _ = ctx.withComposite(new Scope("COMMA"));
            for (let i = 0; i < columns.length; i++) {
                ctx.separator();
                ctx.text("unnest(");
                ctx.render(new Value(columns[i]));
                ctx.text(`::${typeNames[i]}[])`)
            }
        }
    }

    override renderDtPlusExpr(
        expr: spi.DtPlusExpr, 
        ctx: NodeRenderContext
    ): void {
        
        let value = expr.neg ? -expr.value : expr.value;
        const unit = expr.unit;
        
        let finalUnit = unitMap[unit];
        
        if (unit === "QUARTERS") {
            value = value * 3;
            finalUnit = "months";
        } else if (unit === "DECADES") {
            value = value * 10;
            finalUnit = "years";
        } else if (unit === "CENTURIES") {
            value = value * 100;
            finalUnit = "years";
        } else if (unit === "NANOSECONDS") {
            value = value / 1000;
            finalUnit = "microseconds";
        }
        
        const absValue = Math.abs(value);
        
        using _ = ctx.withPrecedence(Precedence.PLUS);
        ctx.render(expr.expr);
        ctx.text(" ");
        ctx.text(value < 0 ? "-" : "+");
        ctx.text(" INTERVAL '");
        ctx.text(absValue.toString());
        ctx.text(" ");
        ctx.text(finalUnit);
        ctx.text("'");
    }

    override renderDtDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {

        const unit = expr.unit;
        
        if (unit === "YEARS" || unit === "MONTHS" || unit === "QUARTERS" || 
            unit === "DECADES" || unit === "CENTURIES") {
            let divisor: number | undefined = undefined;
            switch (unit) {
                case "QUARTERS":
                    divisor = 3;
                    break;
                case "YEARS":
                    divisor = 12;
                    break;
                case "DECADES":
                    divisor = 120;
                    break;
                case "CENTURIES":
                    divisor = 1200;
                    break;
            }
            if (divisor != undefined) {
                using _ = ctx.withPrecedence(Precedence.TIMES);
                this._renderYearDiffExpr(expr, ctx);
                ctx.text(" / ");
                ctx.text(divisor.toString());
            } else {
                this._renderYearDiffExpr(expr, ctx);
            }
        } else {
            let divisor: number | undefined = undefined;
            switch (unit) {
                case "NANOSECONDS": 
                    divisor = 1000000000; 
                    break;
                case "MICROSECONDS": 
                    divisor = 1000000; 
                    break;
                case "MILLISECONDS": 
                    divisor = 1000; 
                    break;
                case "MINUTES": 
                    divisor = 60; 
                    break;
                case "HOURS": 
                    divisor = 3600; 
                    break;
                case "DAYS": 
                    divisor = 86400; 
                    break;
                case "WEEKS": 
                    divisor = 604800; 
                    break;
            }
            if (divisor != null) {
                using _ = ctx.withPrecedence(Precedence.TIMES);
                this._renderSecondDiffExpr(expr, ctx);
                ctx.text(" / ");
                ctx.text(divisor.toString());
            } else {
                this._renderSecondDiffExpr(expr, ctx);
            }
        }
    }

    private _renderYearDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.PLUS);
        using __ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("(extract(year from ");
        ctx.render(expr.expr); 
        ctx.text(") - extract(year from ");
        ctx.render(expr.valueExpr);
        ctx.text(")) * 12 + extract(month from ");
        ctx.render(expr.expr);
        ctx.text(") - extract(month from ");
        ctx.render(expr.valueExpr);
        ctx.text(")");
    }

    private _renderSecondDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {
        using _ = ctx.withPrecedence(Precedence.PLUS);
        using __ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("extract(epoch from ");
        ctx.render(expr.expr);
        ctx.text(" - ");
        ctx.render(expr.valueExpr);
        ctx.text(")");
    }
};

const unitMap: Record<TimeUnit, string> = {
    "NANOSECONDS": "microseconds",
    "MICROSECONDS": "microseconds",
    "MILLISECONDS": "milliseconds",
    "SECONDS": "seconds",
    "MINUTES": "minutes",
    "HOURS": "hours",
    "DAYS": "days",
    "WEEKS": "weeks",
    "MONTHS": "months",
    "QUARTERS": "months",
    "YEARS": "years",
    "DECADES": "years",
    "CENTURIES": "years"
};

function typeName(tp: ScalarType<any>): string | undefined {
    switch (tp.kind) {
        case "BOOL":
            return "boolean";
        case "I8":
        case "I16":
            return "smallint";
        case "I32":
            return "integer";
        case "I64":
            return "bigint";
        case "F32":
            return "real";
        case "F64":
            return "double precision";
        case "NUM":
            return "real";
        case "STR":
            return "text";
        case "BINARY":
            return "bytea";
        case "JSON":
            return "json";
        case "JSONB":
            return "jsonb";
        default:
            return undefined;
    }
}