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

import { err, spi } from "@ts-grm/core";
import { Stack } from "./stack";
import { JoinMergeScope } from "./join_merge_scope";
import { RealTable } from "./real_table";
import { SqlClientImplementor } from "@/sql_client";
import { LambdaJoinFetchVisitor } from "@/impl/query_executor/join_fetch_visitor";

export class PreVisitor extends spi.AbstractVisitor {

    private readonly _tableMap = new Map<spi.AbstractTable, RealTable>();
    
    private readonly _joinMergeScopeStack =
        new Stack<JoinMergeScope>(undefined);

    private readonly _strategy: spi.DatabaseStrategy;

    private _filterProcessingTables: Array<RealTable> | undefined = undefined;
        
    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {
        super();
        this._strategy = _sqlClient.strategy;
    }

    get tableMap(): ReadonlyMap<spi.AbstractTable, RealTable> {
        this._processFilters();
        return this._tableMap;
    }

    visitAtomQuery(query: spi.AtomQueryContract): void {
        const projection = query.projection;
        switch (projection.kind) {
            case "ROOT_SINGLE":
                if (!query.options.countMode) {
                    (projection.selection as any as spi.Node).accept(this);
                }
                break;
            case "ROOT_ARRAY":
                for (const selection of projection.selections) {
                    (selection as any as spi.Node).accept(this);
                }
                break;
            case "ROOT_MAP":
                for (const key in projection.selections) {
                    (projection.selections[key] as any as spi.Node).accept(this);
                }
                break;
            case "SUB_SINGLE":
                (projection.selection as any as spi.Node).accept(this);
                break;
            case "SUB_ARRAY":
                for (const selection of projection.selections) {
                    (selection as any as spi.Node).accept(this);
                }
                break;
            case "BASE":
                for (const key in projection.args) {
                    const value = projection.args[key];
                    if (value instanceof spi.AbstractExpr) {
                        value.accept(this);
                    } else {
                        const table = value as spi.AbstractEntityTable;
                        if (table.__shadow != null) {
                            this._toRealTable(table);
                        }
                    }
                }
                break;
        }
        super.visitAtomQuery(query);
        for (const table of query.tables) {
            this._toRealTable(table as any);
        }
    }

    visitPropExpr(expr: spi.PropExprContract): void {
        if (expr.table.__isPrev) {
            return;
        }
        let table: spi.AbstractTable = expr.table;
        let prop = expr.prop;
        let column: spi.Column;
        if (this._sqlClient.isDirectAssociatedKey(expr)) {
            table = table.__joinOperation!.parent;
            column = expr.table.__joinOperation!.joinProp!.sub(prop.subPath).toStorage(this._strategy) as spi.Column;
        } else {
            if (!prop.isMiddleTableProp && !prop.isIdProp) {
                table = (table as spi.AbstractEntityTable).__to(
                    (prop as spi.EntityProp).declaringEntity
                );
            }
            column = prop.toStorage(this._strategy) as spi.Column;
        }
        const shadow = this._toRealTable(table).shadow;
        if (shadow != null) {
            shadow.baseQueryMetadata.alias(
                table.__anchor!.exportedName, 
                column.name
            );
        }
    }

    visitIsPred(pred: spi.IsPred): void {
        const shadow = this._toRealTable(pred.table).shadow;
        if (shadow != null) {
            shadow.baseQueryMetadata.alias(
                pred.table.__anchor!.exportedName, 
                pred.table.__entity.tableSettings.discriminator!.name
            )
        }
    }

    visitFetchedView(fetchedView: spi.FetchedViewContract): void {
        let table: spi.AbstractEntityTable = fetchedView.table;
        const joinFetchVisitor = new LambdaJoinFetchVisitor(this._sqlClient, {
            enter: field => {
                const prop = field.prop.asEntityProp;
                if (prop == null) {
                    return undefined;
                }
                const oldTable = table;
                table = (table as any)[prop.name](prop.nullable ? "LEFT" : "INNER");
                return oldTable;
            },
            leave: (_field, _depth, oldTable) => {
                if (oldTable != null) {
                    table = oldTable;
                }
            },
            visitField: (field, _) => {
                if (field.columnIndex == null) {
                    return;
                }
                const realTable = this._toRealTable(table.__to(field.prop.declaringEntity));
                const prop = field.prop;
                const sqlFormulaExpr = realTable.sqlFormulaExpr(prop);
                if (sqlFormulaExpr != null) {
                    sqlFormulaExpr.accept(this);
                    return;
                }
                if (prop.isEntityProp) {
                    const shadow = realTable.shadow;
                    const entityProp = prop as spi.EntityProp;
                    if (shadow != null) {
                        const column = entityProp.toStorage(this._strategy) as spi.Column;
                        shadow.baseQueryMetadata.alias(table.__anchor!.exportedName, column.name);
                    }
                }
            }
        });
        joinFetchVisitor.visit(fetchedView.view.mapper);
    }

    visitShadowExpr(expr: spi.ShadowExprContract): void {
        if (expr.shadow != null) {
            this
                ._toRealTable(expr.shadow)
                .baseQueryMetadata
                .alias(expr.anchor.exportedName, undefined);
        }
    }

    visitCompoundPred(pred: spi.CompoundPred): void {
        if (pred.op === "AND") {
            for (const p of pred.preds) {
                p.accept(this);
            }
        } else {
            for (const p of pred.preds) {
                using _ = this._joinMergeScopeStack.with(new JoinMergeScope());
                p.accept(this);
            }
        }
    }

    private _toRealTable(
        table: spi.AbstractTable
    ): RealTable {
        let realTable = this._tableMap.get(table.__prototype);
        if (realTable == null) {
            if (table.__shadow == null) {
                const anchor = (table as spi.AbstractEntityTable).__anchor;
                if (anchor != null) {
                    throw new err.ArgumentError("The argument cannot be table with shadow anchor does not have shadow");
                }
            }
            if (table.__shadow != null) {
                const shadowRealTable = this._toRealTable(table.__shadow);
                this._tableMap.set(table.__shadow.__prototype, shadowRealTable);
                if (this._filterProcessingTables != null) {
                    this._filterProcessingTables.push(shadowRealTable);
                }
                realTable = shadowRealTable.export(table);
            } else {
                const joinOperation = table.__joinOperation;
                if (joinOperation == null) {
                    realTable = new RealTable(table, undefined);
                } else {
                    const parentRealTable = this._toRealTable(joinOperation.parent);   
                    realTable = parentRealTable.child(
                        table, 
                        this._joinMergeScopeStack.currentOrUndefined
                    );
                }
            }
            this._tableMap.set(table.__prototype, realTable);
            if (this._filterProcessingTables != null) {
                this._filterProcessingTables.push(realTable);
            }
        }
        return realTable;
    }

    private _processFilters() {
        if (this._filterProcessingTables == null) {
            this._filterProcessingTables = Array.from(this._tableMap.values());
        }
        while (this._filterProcessingTables.length != 0) {
            const arr = this._filterProcessingTables;
            this._filterProcessingTables = [];
            for (const table of arr) {
                this._processFilter(table);
            }
        }
    }

    private _processFilter(table: RealTable) {
        table.filterPred?.accept(this);
        if (table.parent?.shadow == null) {
            return;
        }
        if (table.joinProp != null && table.symbol.__entity != null) {
            switch (table.joinProp.storageType) {
                case "MIDDLE_TABLE":
                    this._processMiddleTable(table);
                    break;
                case "NONE":
                    this._processForeignKey(table, true);
                    break;
                default:
                    this._processForeignKey(table, false);
                    break;
            }
        } else if (table.castToEntity != null) {
            this._processInheritance(table);
        }
    }

    private _processMiddleTable(table: RealTable) {
        const middleTable = (table.joinProp as spi.EntityProp)!.toStorage(this._strategy)! as spi.MiddleTable;
        const exportedName = table.parent!.symbol.__anchor!.exportedName;
        for (const column of middleTable.toThisColumns) {
            table.parent!.shadow!.baseQueryMetadata.alias(exportedName, column.referencedColumnName!);
        }
    }

    private _processForeignKey(table: RealTable, reverse: boolean) {
        const storage = (reverse ? (table.joinProp as spi.EntityProp)!.mappedByProp! : (table.joinProp as spi.EntityProp)!)
            .toStorage(this._strategy) as spi.PropStorage;
        const exportedName = table.parent!.symbol.__anchor!.exportedName;
        if (storage.kind === "COLUMN") {
            table.parent!.shadow!.baseQueryMetadata.alias(
                exportedName, 
                reverse ? storage.referencedColumnName! : storage.name
            );
        } else if (storage.kind === "COLUMNS") {
            for (const column of storage) {
                table.parent!.shadow!.baseQueryMetadata.alias(
                    exportedName, 
                    reverse ? column.referencedColumnName! : column.name
                );
            }
        }
    }

    private _processInheritance(table: RealTable) {
        const parentTable = table.parent!;
        if (table.symbol.__entity!.ancestors.has(parentTable.symbol.__entity!)) {
            const exportedName = parentTable.symbol.__anchor!.exportedName;
            parentTable.shadow!.baseQueryMetadata.alias(
                exportedName, 
                parentTable.symbol.__entity!.tableSettings.discriminator!.name
            );
        }
    }
}
