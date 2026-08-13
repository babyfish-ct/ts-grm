import { spi } from "@ts-grm/core";
import { AbstractNodeRender } from "./abstract_node_render";
import { NodeRender, NodeRenderContext } from "./node_render";
import { Precedence } from "@/sql/precedence";
import { AbstractDriver } from "./abstract_drivier";
import { TransactionManager } from "@/transaction/transaction_manger";
import { OraclePool, OracleTransactionManager } from "@/transaction/oracle_transaction_manager";
import { ColumnDef } from "@/impl/schema_def";
import { MetadataError } from "@/error/metadata_error";
import { Composite, RootQueryWrapper, Scope, Value } from "@/sql/fragment";
import { ApplyPaginationOptions } from "./deriver";

export class OracleDriver extends AbstractDriver {

    readonly nodeRender: NodeRender = nodeRender;

    readonly transactionManager: TransactionManager;

    protected readonly options: OracleDriverOptions;

    constructor(
        pool: OraclePool,
        options?: OracleDriverOptions
    ) {
        super();
        this.transactionManager = new OracleTransactionManager(pool);
        this.options = {
            defaultStringLength: options?.defaultStringLength ?? 255
        };
    }

    get name(): string {
        return "Oracle";
    }

    get nameParameterPrefix(): string | undefined {
        return ":";
    }

    typeName(columnDef: ColumnDef): string {
        const options = this.options;
        switch (columnDef.type.kind) {
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
                return "number";
            case "STR":
                const len = columnDef.length ?? options.defaultStringLength ?? 255;
                if (len > 4000) {
                    return "clob";
                }
                return `varchar2(${len})`;
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

    writeTableDeletion(tableName: string, writer: spi.CodeWriter): void {
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

    applyPagination(
        original: Composite, 
        options: ApplyPaginationOptions
    ): Composite {
        if (options.offset == null) {
            return new Composite()
                .add("select ")
                .add(new Scope("COMMA").add("core__.*"))
                .add("\nfrom ")
                .add(
                    new RootQueryWrapper().add(
                        original
                    )
                )
                .add(" core__ \nwhere rownum <= ")
                .add(new Value(options.limit))
        }    
        return new Composite()
            .add("select")
            .add(new Scope("COMMA").add("*"))
            .add("\nfrom ")
            .add(
                new RootQueryWrapper()
                    .add(
                        new Composite()
                            .add("select ")
                            .add(
                                new Scope("COMMA")
                                    .add("core__.*")
                                    .separator()
                                    .add("rownum rn__")
                            )
                            .add("\nfrom ")
                            .add(
                                new RootQueryWrapper().add(
                                    original
                                )
                            )
                            .add(" core__\nwhere rownum <= ")
                            .add(new Value(options.limit + options.offset))
                    )
            )
            .add("\nwhere rn__ > ")
            .add(new Value(options.offset));
    }
}

export interface OracleDriverOptions {
    readonly defaultStringLength: number;
}

const nodeRender = new class extends AbstractNodeRender {

    constructor() {
        super("Oracle");
    }

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