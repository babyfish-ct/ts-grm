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

import { spi } from "@ts-grm/core";
import { AbstractNodeRender } from "./abstract_node_render";
import { NodeRender, NodeRenderContext } from "./node_render";
import { Precedence } from "@/sql/precedence";
import { AbstractDriver } from "./abstract_drivier";
import { TransactionManager } from "@/transaction/transaction_manger";
import { OraclePool, OracleTransactionManager } from "@/transaction/oracle_transaction_manager";
import { ColumnDef } from "@/impl/schema_def";
import { MetadataError } from "@/error/metadata_error";
import { Composite, Query, RootProjectionCaluse, RootQueryWrapper, Value } from "@/sql/fragment";
import { projectionScope } from "./utils";
import { PaginationStrategy, PaginationTransformer } from "./deriver";
import { UnsupportedFeatureError } from "@/error/unsupported_feature_error";

export class OracleDriver extends AbstractDriver {

    constructor(
        protected readonly pool: OraclePool
    ) {
        super();
    }

    override get name(): string {
        return "Oracle";
    }

    override get nameParameterPrefix(): string | undefined {
        return ":";
    }

    get paginationStrategy(): PaginationStrategy {
        return paginationTransformer;
    }

    override typeName(columnDef: ColumnDef): string {
        switch (columnDef.type.kind) {
            case "STR":
                const len = columnDef.length!;
                if (len > 4000) {
                    return "clob";
                }
                return `varchar2(${len})`;
            case "TEXT":
                return "clob";
            case "BOOL":
                return "number(1)";
            case "I8":
                return "number(3)";
            case "I16":
                return "number(5)";
            case "I32":
                return "number(10)";
            case "I64":
                return "number(19)";
            case "F32":
                return "binary_float";
            case "F64":
                return "binary_double";
            case "NUM":
                return `number(${columnDef.precision}, ${columnDef.scale})`;
            case "DATETIME":
                return "timpstamp";
            case "BINARY":
                return "blob";
            case "JSON":
                return "clob";
            case "JSONB":
                return "json";
            default:
                throw new MetadataError(`Unsupported scalar type: ${columnDef.type.kind}`);
        }
    }

    override writeTableDeletion(tableName: string, writer: spi.CodeWriter): void {
        writer.code("begin");
        writer.scope({
            kind: "BLANK",
            multiline: true
        }, () => {
            writer.code(`execute immediate 'drop table ${tableName}'`).newLine(";");
        });
        writer.code("exception");
        writer.scope({
            kind: "BLANK",
            multiline: true
        }, () => {
            writer.code("when others then");
            writer.scope({
                kind: "BLANK",
                multiline: true
            }, () => {
                writer.code("if sqlcode != -942 then");
                writer.scope({
                    kind: "BLANK",
                    multiline: true
                }, () => {
                    writer.code("raise").newLine(";");
                }); 
                writer.code("end if").newLine(";")
            });
        });
        writer.code("end").newLine(";");
    }

    protected override createTransactionManager(): TransactionManager {
        return new OracleTransactionManager(this.pool);
    }

    protected override createNodeRender(): NodeRender {
        return new OracleNodeRender(this);
    }
}

export class OracleNodeRender extends AbstractNodeRender {

    override renderDtPlusExpr(expr: spi.DtPlusExpr, ctx: NodeRenderContext): void {
        
        let value = expr.neg ? -expr.value : expr.value;
        const unit = expr.unit;
        
        if (unit === "MONTHS" || unit === "YEARS" || unit === "QUARTERS" 
            ||  unit === "DECADES" || unit === "CENTURIES"
        ) {
            let months = value;
            if (unit === "QUARTERS") {
                months = value * 3
            } else if (unit === "YEARS") {
                months = value * 12;
            } else if (unit === "DECADES") {
                months = value * 120;
            } else if (unit === "CENTURIES") {
                months = value * 1200;
            }

            using _ = ctx.withPrecedence(Precedence.PLUS);
            ctx.render(expr.expr);
            ctx.text(" ");
            ctx.text(months < 0 ? "-" : "+");
            ctx.text(" NUMTOYMINTERVAL(");
            ctx.text(Math.abs(months).toString());
            ctx.text(", 'MONTH')");
        } else {
            let seconds = value;
            if (unit === "DAYS") {
                seconds = value * 86400;
            } else if (unit === "HOURS") {
                seconds = value * 3600;
            } else if (unit === "MINUTES") {
                seconds = value * 60;
            } else if (unit === "WEEKS") {
                seconds = value * 604800;
            } else if (unit === "MILLISECONDS") {
                seconds = value / 1000
            } else if (unit === "MICROSECONDS") { 
                seconds = value / 1000000;
            } else if (unit === "NANOSECONDS") {
                seconds = value / 1000000000;
            }

            using _ = ctx.withPrecedence(Precedence.PLUS);
            ctx.render(expr.expr);
            ctx.text(" ");
            ctx.text(seconds < 0 ? "-" : "+");
            ctx.text(" NUMTODSINTERVAL(");
            ctx.text(Math.abs(seconds).toString());
            ctx.text(", 'SECOND')");
        }
    }

    override renderDtDiffExpr(
        expr: spi.DtDiffExpr, 
        ctx: NodeRenderContext
    ): void {
        
        const unit = expr.unit;
        let multiplier: number | undefined = undefined;
        let divisor: number | undefined = undefined;

        switch (unit) {
            case "NANOSECONDS": 
                multiplier = 86400000000000; 
                break;
            case "MICROSECONDS": 
                multiplier = 86400000000; 
                break;
            case "MILLISECONDS": 
                multiplier = 86400000; 
                break;
            case "SECONDS": 
                multiplier = 86400; 
                break;
            case "MINUTES": 
                multiplier = 1440; 
                break;
            case "HOURS": 
                multiplier = 24; 
                break;
            case "WEEKS": 
                divisor = 7; 
                break;
            case "MONTHS": 
                divisor = 30.4375; 
                break;
            case "QUARTERS": 
                divisor = 91.3125; 
                break;
            case "YEARS": 
                divisor = 365.25; 
                break;
            case "DECADES": 
                divisor = 3652.5; 
                break;
            case "CENTURIES": 
                divisor = 36525; 
                break;
        }
        
        if (multiplier != null) {
            using _ = ctx.withPrecedence(Precedence.TIMES);
            this._renderDtDiffExpr(expr, ctx);
            ctx.text(" * ");
            ctx.text(multiplier.toString());
        } else if (divisor != null) {
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
        using _ = ctx.withPrecedence(Precedence.PLUS);
        ctx.render(expr.expr);
        ctx.text(" - ");
        ctx.render(expr.valueExpr);
    }
}

const paginationTransformer: PaginationTransformer = (original, options) => {
    const query = original.fragments!.find(f => f instanceof Query) as Query | undefined;
    if (query == null) {
        throw new UnsupportedFeatureError(
            `Unable to paginate a set operation query (UNION, UNION ALL, EXCEPT, EXCEPT ALL, ` +
            `INTERSECT, or INTERSECT ALL) using "OracleDriver": pagination for SQL Server 2005~2008 ` +
            `relies on wrapping the query with "ROW_NUMBER() OVER(...)", which cannot be applied directly ` +
            `on top of a set operation query. To fix this, either use "Oracle12Driver" (or a later ` +
            `version), which supports "OFFSET ... FETCH NEXT ... ROWS ONLY" and can paginate set operation ` +
            `queries directly, or restructure the query so pagination is applied to each sub-query ` +
            `individually before the set operation is performed.`
        );
    }
    const projection = query.fragments!.find(f => f instanceof RootProjectionCaluse) as RootProjectionCaluse;
    if (options.offset == null) {
        return new Composite()
            .add("select ")
            .add(projectionScope(projection, "core__"))
            .add("\nfrom ")
            .add(
                new RootQueryWrapper().add(original)
            )
            .add(" core__ \nwhere rownum <= ")
            .add(new Value(options.limit))
    }    
    return new Composite()
        .add("select")
        .add(projectionScope(projection))
        .add("\nfrom ")
        .add(
            new RootQueryWrapper()
                .add(
                    new Composite()
                        .add("select ")
                        .add(
                            projectionScope(projection, "core__")
                                .separator()
                                .add("rownum rn__")
                        )
                        .add("\nfrom ")
                        .add(
                            new RootQueryWrapper().add(original)
                        )
                        .add(" core__\nwhere rownum <= ")
                        .add(new Value(options.limit + options.offset))
                )
        )
        .add("\nwhere rn__ > ")
        .add(new Value(options.offset));
};