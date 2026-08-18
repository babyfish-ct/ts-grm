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

import { AnyModel, dsl, EntityTable, err, JoinType, Predicate, spi } from "@ts-grm/core";
import { JoinMergeScope } from "./join_merge_scope";
import { SqlBuilder } from "./sql_builder";
import { BaseQueryMetadata } from "./base_query_metadata";
import { Fragment } from "./fragment";

export class RealTable {

    private static _nextIdentity = 0;

    private _parent: RealTable | undefined = undefined;

    readonly identity = ++RealTable._nextIdentity;

    private _restrictChildMap: Map<string, RealTable> | undefined = undefined;

    private _laxChildMap: Map<string, RealTable> | undefined = undefined;

    private _joinType: JoinType | undefined;

    private _joinProp: spi.EntityProp | spi.AssociationProp | undefined = undefined;

    private _isJoinPropInverse: boolean = false;

    // Becareful, `symbol.joinOperation.isTargetFilterIgnored` 
    // should not be copied to this object because it is 
    // field which cannot be merged

    private _castToEntity: spi.Entity | undefined = undefined;

    private _filters: Set<spi.JoinFilter> | undefined = undefined;

    private _filterPred: spi.AbstractPred | undefined = undefined;

    private _filterPredResolved = false;

    private _alias: string | undefined = undefined;

    private _baseQueryMetadata: BaseQueryMetadata | undefined = undefined;

    private _exportedMap: Map<string, RealTable> | undefined = undefined;

    private _children: ReadonlyArray<RealTable> | undefined = undefined;

    private _sqlFormulaMap: Map<spi.FetchProp, spi.AbstractExpr<any> | false> | undefined;

    cteDefinitionFragment: Fragment | undefined = undefined;

    fragment: Fragment | undefined = undefined;

    constructor(
        readonly symbol: spi.AbstractTable,
        readonly shadow: RealTable | undefined
    ) {
        if (symbol.__joinOperation != null) {
            this._joinType = symbol.__joinOperation.joinType;
            this._joinProp = symbol.__joinOperation.joinProp;
            this._isJoinPropInverse = symbol.__joinOperation.isJoinPropInverse;
            this._castToEntity = symbol.__joinOperation.castToEntity;
            if (symbol.__joinOperation?.filter != null) {
                let filters = this._filters;
                if (filters == null) {
                    this._filters = filters = new Set<spi.JoinFilter>();
                }
                filters.add(symbol.__joinOperation.filter);
            }
        } else {
            this._joinType = undefined;
            this._joinProp = undefined;
            this._castToEntity = undefined;
            this._filters = undefined;
        }
    }

    get joinType(): JoinType | undefined {
        return this._joinType;
    }

    get parent(): RealTable | undefined {
        return this._parent;
    }

    get joinProp(): spi.EntityProp | spi.AssociationProp | undefined {
        return this._joinProp;
    }

    get isJoinPropInverse(): boolean {
        return this._isJoinPropInverse;
    }

    get castToEntity(): spi.Entity | undefined {
        return this._castToEntity;
    }

    get filters(): ReadonlySet<spi.JoinFilter> | undefined {
        return this._filters;
    }

    child(
        symbol:spi.AbstractTable, 
        scope: JoinMergeScope | undefined
    ): RealTable {
        const joinOperation = symbol.__joinOperation;
        if (joinOperation == null) {
            throw new err.ArgumentError(`symbol.joinOperation cannot be null`);
        }
        const restrictKey = RealTable._restrictKeyOf(symbol, undefined);
        let restrictChildMap = this._restrictChildMap;
        let restrictChild = restrictChildMap?.get(restrictKey);
        if (restrictChild != null) {
            restrictChild._mergeFilter(joinOperation.filter);
            return restrictChild;
        }
        if (restrictChildMap == null) {
            this._restrictChildMap = restrictChildMap = new Map();
        }
        const laxKey = RealTable._laxKeyOf(symbol, scope);
        let laxChildMap = this._laxChildMap;
        let child = laxChildMap?.get(laxKey);
        if (child != null) {
            child._mergeFilter(joinOperation.filter);
            if (child._joinType != "INNER") {
                child._joinType = "INNER";
                restrictChildMap.set(RealTable._restrictKeyOf(symbol, "INNER"), child);
            }
        } else {
            if (laxChildMap == null) {
                this._laxChildMap = laxChildMap = new Map();
            }
            child = new RealTable(symbol, undefined);
            child._parent = this;
            restrictChildMap.set(restrictKey, child);
            laxChildMap.set(laxKey, child);
            this._children = undefined;
        }
        return child;
    }

    export(table: spi.AbstractTable): RealTable {
        if (table.__shadow !== this.symbol) {
            throw new err.ArgumentError("table is not exported table of current base table");
        }
        let exportedMap = this._exportedMap;
        let realTable: RealTable | undefined = undefined;
        if (exportedMap != null) {
            realTable = exportedMap.get(table.__anchor!.exportedName);
            if (realTable != null) {
                return realTable;
            }
        } else {
            this._exportedMap = exportedMap = new Map();
        }
        realTable = new RealTable(table, this);
        exportedMap.set(table.__anchor!.exportedName, realTable);
        this._children = undefined;
        return realTable;
    }

    get children(): ReadonlyArray<RealTable> {
        let children = this._children;
        if (children == null) {
            const arr: Array<RealTable> = [];
            if (this._laxChildMap != null) {
                for (const table of this._laxChildMap.values()) {
                    arr.push(table);
                }
            }
            if (this._exportedMap != null) {
                for (const exported of this._exportedMap.values()) {
                    const laxChildMap = exported._laxChildMap;
                    if (laxChildMap != null) {
                        arr.push(...Array.from(laxChildMap.values()));
                    }
                }
            }
            this._children = children = arr;
        }
        return children;
    }

    private _mergeFilter(filter: spi.JoinFilter | undefined) {
        if (filter != null) {
            let filters = this._filters;
            if (filters == null) {
                this._filters = filters = new Set<spi.JoinFilter>();
            }
            filters.add(filter);
            this._filterPredResolved = false;
        }
    }

    private static _restrictKeyOf(
        symbol: spi.AbstractTable,
        joinType: JoinType | undefined
    ): string {
        return `${
            (symbol.__entity ?? symbol.__associationEntity)?.identity ?? ""
        }\x1F${
            RealTable._propKey(symbol)
        }\x1F${
            joinType ?? symbol.__joinOperation!.joinType
        }`;
    }

    private static _laxKeyOf(
        symbol: spi.AbstractTable,
        scope: JoinMergeScope | undefined
    ): string {
        return `${
            (symbol.__entity ?? symbol.__associationEntity)?.identity ?? ""
        }\x1F${
            RealTable._propKey(symbol)
        }\x1F${
            scope?.identity ?? 0
        }`;
    }

    private static _propKey(
        symbol: spi.AbstractTable
    ): string {
        const joinOperation = symbol.__joinOperation!;
        if (joinOperation.joinProp != null) {
            return joinOperation.isJoinPropInverse 
                ? `←${joinOperation.joinProp.name}`
                : joinOperation.joinProp.name;
        }
        if (joinOperation.weakJoinModel != null) {
            return `j(${joinOperation.weakJoinModel.identifier})`;
        }
        return `c(${joinOperation.castToEntity!.identity})`;
    }

    collectTables(builder: SqlBuilder, tables: Set<RealTable>) {
        this._alias = builder.allocateTableAlias();
        tables.add(this);
        for (const child of this.children) {
            child.collectTables(builder, tables);
        }
    }

    get alias(): string {
        const alias = this._alias;
        if (alias == null) {
            return `__unknown__${this.identity}`;
            //throw new err.StateError("The table alias has not been allocated");
        }
        return alias;
    }

    get baseQueryMetadata(): BaseQueryMetadata {
        let metadata = this._baseQueryMetadata;
        if (metadata != null) {
            return metadata;
        }
        if (this.symbol.__baseModel == null) {
            throw new err.StateError("Cannot get base query metadata from entity metadata");
        }
        metadata = new BaseQueryMetadata(this.symbol.__isCte, this);
        this._baseQueryMetadata = metadata;
        return metadata;
    }

    get filterPred(): spi.AbstractPred | undefined {
        if (this._filterPredResolved) {
            return this._filterPred;
        }
        let predicate : Predicate | undefined = undefined;
        if (this._filters != null) {
            for (const filter of this._filters) {
                const newPredicate = filter({
                    source: this._parent?.symbol as any, 
                    target: this.symbol as any
                });
                predicate = dsl.and(predicate, newPredicate);
            }
        }
        this._filterPred = predicate as spi.AbstractPred | undefined;
        this._filterPredResolved = true;
        return this._filterPred;
    }

    sqlFormulaExpr(prop: spi.FetchProp): spi.AbstractExpr<any> | undefined {
        let expr = this._sqlFormulaMap?.get(prop);
        if (expr == null) {
            expr = this._sqlFromulaExpr(prop) ?? false;
            let map = this._sqlFormulaMap;
            if (map == null) {
                this._sqlFormulaMap = map = new Map();
            }
            map.set(prop, expr);
        }
        return typeof expr === "boolean" ? undefined : expr;
    }

    private _sqlFromulaExpr(prop: spi.FetchProp): spi.AbstractExpr<any> | undefined {
        if (prop instanceof spi.SqlFormulaProp) {
            return prop.formula.fn(this.symbol as any as EntityTable<AnyModel>) as spi.AbstractExpr<any>;
        }
        if (prop.isEntityProp) {
            const fn = prop.sqlFormulaFn;
            if (fn != null) {
                return prop.sqlFormulaFn!(this.symbol as any as EntityTable<AnyModel>) as spi.AbstractExpr<any>;
            }
        }
        return undefined;
    }
}
