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

import { spi, TimeUnit } from "@ts-grm/core";
import { AbstractNodeRender } from "./abstract_node_render";
import { NodeRender, NodeRenderContext } from "./node_render";
import { Precedence } from "@/sql/precedence";
import { UnsupportedFeatureError } from "@/error/unsupported_feature_error";
import { AbstractDriver } from "./abstract_drivier";
import { MySqlTransactionManager } from "@/transaction/mysql_transaction_manager";
import { ColumnDef } from "@/impl/schema_def";
import { KEYWORDS } from "./utils";
import { MetadataError } from "@/error/metadata_error";
import { TransactionManager } from "@/transaction/transaction_manger";

// Only import types
import type { Pool } from "mysql2/promise";

export class MySqlDriver extends AbstractDriver {
    
    constructor(
        protected readonly pool: Pool
    ) {
        super();
    }

    override get name(): string {
        return "MySql";
    }

    override quoteIdentifier(value: string): string {
        if (KEYWORDS.has(value.toLowerCase())) {
            return "`" + value + "`";
        }
        return value;
    }

    override typeName(columnDef: ColumnDef): string {
        switch (columnDef.type.kind) {
            case "STR":
                return `varchar(${columnDef.length!})`;
            case "TEXT":
                return "text";
            case "BOOL":
                return "tinyint(1)";
            case "I8":
                return "tinyint";
            case "I16":
                return "smallint";
            case "I32":
                return "int";
            case "I64":
                return "bigint";
            case "F32":
                return "flat";
            case "F64":
                return "double";
            case "NUM":
                return `decimal(${columnDef.precision}, ${columnDef.scale})`;
            case "DATETIME":
                return "datetime(3)";
            case "BINARY":
                return "blob";
            case "JSON":
            case "JSONB":
                return "json";
            default:
                throw new MetadataError(`Unsupported scalar type: ${columnDef.type.kind}`);
        }
    }

    protected override createTransactionManager(): TransactionManager {
        return new MySqlTransactionManager(this.pool);
    }

    protected override createNodeRender(): NodeRender {
        return new MySqlNodeRender(this);
    }
}

export class MySqlNodeRender extends AbstractNodeRender {

    override renderDtPlusExpr(expr: spi.DtPlusExpr, ctx: NodeRenderContext): void {
        
        let value = expr.neg ? -expr.value : expr.value;
        const unit = expr.unit;
        
        if (unit === "NANOSECONDS") {
            if (value % 1000 !== 0) {
                throw new UnsupportedFeatureError(`MySQL does not support fractional NANOSECONDS: ${value}`);
            }
            value = value / 1000;
        } else if (unit === "MILLISECONDS") {
            if (value % 1000 !== 0) {
                throw new UnsupportedFeatureError(`MySQL does not support fractional MILLISECONDS: ${value}`);
            }
            value = value / 1000;
        } else if (unit === "DECADES") {
            value = value * 10;
        } else if (unit === "CENTURIES") {
            value = value * 100;
        }
        
        if (!Number.isInteger(value)) {
            throw new UnsupportedFeatureError(`MySQL does not support fractional time units: ${value} ${unit}`);
        }
        
        const func = value < 0 ? "DATE_SUB" : "DATE_ADD";
        const absValue = Math.abs(value);
        const finalUnit = unit === "NANOSECONDS" || unit === "MILLISECONDS" 
            ? "MICROSECOND" 
            : unitMap[unit];
        
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text(func);
        ctx.text("(");
        ctx.render(expr.expr);
        ctx.text(", INTERVAL ");
        ctx.text(absValue.toString());
        ctx.text(" ");
        ctx.text(finalUnit);
        ctx.text(")");
    }

    override renderDtDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {
        let unit = expr.unit;
        let divisor: number | undefined = undefined;
        let multiplier: number | undefined = undefined;
        
        switch (unit) {
            case "NANOSECONDS":
                unit = "MICROSECONDS";
                multiplier = 1000;
                break;
            case "MICROSECONDS":
                unit = "MICROSECONDS";
                break;
            case "MILLISECONDS":
                unit = "MICROSECONDS";
                divisor = 1000;
                break;
            case "SECONDS":
                unit = "MICROSECONDS";
                divisor = 1000 * 1000;
                break;
            case "MINUTES":
                unit = "MICROSECONDS";
                divisor = 60 * 1000 * 1000;
                break;
            case "HOURS":
                unit = "SECONDS";
                divisor = 3600;
                break;
            case "DAYS":
                unit = "DAYS";
                divisor = 24 * 3600;
                break;
            case "WEEKS":
                unit = "DAYS";
                divisor = 7 * 24 * 3600;
                break;
            case "MONTHS":
                unit = "MONTHS";
                break;
            case "QUARTERS":
                unit = "QUARTERS";
                break;
            case "YEARS":
                unit = "YEARS";
                break;
            case "DECADES":
                unit = "YEARS";
                divisor = 10;
                break;
            case "CENTURIES":
                unit = "YEARS";
                divisor = 100;
                break;
            default:
                throw new Error(`Unsupported unit: ${unit}`);
        }
        if (multiplier != null) {
            using _ = ctx.withPrecedence(Precedence.TIMES);
            this._renderDtDiffExpr(expr, ctx, unit);
            ctx.text(" * ");
            ctx.text(multiplier.toString());
        } else if (divisor != null) {
            using _ = ctx.withPrecedence(Precedence.TIMES);
            this._renderDtDiffExpr(expr, ctx, unit);
            ctx.text(" / ");
            ctx.text(divisor.toString());
        } else {
            this._renderDtDiffExpr(expr, ctx, unit);
        }
    }

    private _renderDtDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext,
        unit: TimeUnit
    ): void {
        using _ = ctx.withPrecedence(Precedence.ROOT);
        ctx.text("TIMESTAMPDIFF(");
        ctx.text(unitMap[unit]);
        ctx.text(", ");
        ctx.render(expr.valueExpr);
        ctx.text(", ");
        ctx.render(expr.expr);
        ctx.text(")");
    }
}

const unitMap: Record<TimeUnit, string> = {
    "NANOSECONDS": "MICROSECOND",
    "MICROSECONDS": "MICROSECOND",
    "MILLISECONDS": "MICROSECOND",
    "SECONDS": "SECOND",
    "MINUTES": "MINUTE",
    "HOURS": "HOUR",
    "DAYS": "DAY",
    "WEEKS": "WEEK",
    "MONTHS": "MONTH",
    "QUARTERS": "QUARTER",
    "YEARS": "YEAR",
    "DECADES": "YEAR",
    "CENTURIES": "YEAR"
};