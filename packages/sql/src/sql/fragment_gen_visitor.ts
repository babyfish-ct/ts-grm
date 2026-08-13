import { AnyModel, dsl, EntityTable, err, ExpressionOrder, Predicate, RootQuerySelection, ScalarProvider, spi } from "@ts-grm/core";
import { TableAlias, Column, Composite, Query, Scope, ShadowExpr, Source, Value, valueOf, RootColumnSuffix } from "./fragment";
import { Stack } from "./stack";
import { Precedence } from "./precedence";
import { NodeRender, NodeRenderContext } from "@/driver/node_render";
import { RealTable } from "./real_table";
import { SqlClientImplementor } from "@/sql_client";
import { BaseQueryMetadata } from "./base_query_metadata";
import { TableFragmentCreator } from "./table_fragment_creator";
import { addTypeMatch } from "./utils";
import { LambdaJoinFetchVisitor } from "@/impl/query_executor/join_fetch_visitor";

export class FragmentGenGenVisitor extends spi.AbstractVisitor {

    private readonly _compositeStack: Stack<Composite>;

    private readonly _precedenceStack: Stack<number>;

    private readonly _strategy: spi.DatabaseStrategy;

    private readonly _nodeRender: NodeRender;

    private readonly _nodeRenderContext: NodeRenderContext;

    private readonly _tableFragmentCreator: TableFragmentCreator;

    constructor(
        readonly sqlClient: SqlClientImplementor,
        private readonly _baseQueryMetadata: BaseQueryMetadata | undefined,
        private readonly _tableMap: ReadonlyMap<spi.AbstractTable, RealTable>
    ) {
        super();
        this._strategy = sqlClient.strategy;
        this._nodeRender = sqlClient.driver.nodeRender;
        const that = this;
        this._compositeStack = new class extends Stack<Composite> {
            constructor() {
                super(undefined);
            }
            override with(composite: Composite): Disposable {
                const parent = this.currentOrUndefined;
                if (parent != null) {
                    parent.add(composite);
                }
                return super.with(composite);
            }
        };
        this._precedenceStack = new class extends Stack<number> {

            constructor() {
                super(Precedence.ROOT);
            }

            override with(precedence: number): Disposable {
                const current = this.current;
                const disposable = super.with(precedence);
                if (precedence === Precedence.ROOT) {
                    return disposable;
                }
                if (current <= precedence) {
                    return disposable;
                }
                const noIndentParenDisposable = that._compositeStack.with(new Scope("NO_INDENT_PAREN"));
                return {
                    [Symbol.dispose]() {
                        noIndentParenDisposable[Symbol.dispose]();
                        disposable[Symbol.dispose]();
                    }
                };
            }
        };
        const driverName = this.sqlClient.driver.name;
        this._nodeRenderContext = new class implements NodeRenderContext {

            get driverName(): string {
                return driverName;
            }

            text(value: string): void {
                that._compositeStack.current.add(value);
            }
            
            separator(): void {
                that._compositeStack.current.separator();
            }
        
            withComposite(composite: Composite): Disposable {
                return that._compositeStack.with(composite);
            }
        
            withPrecedence(precedence: number): Disposable {
                return that._precedenceStack.with(precedence);
            }
        
            render(node: spi.Node | Value | string): void {
                if (typeof node === "string") {
                    that._compositeStack.current.add(node);
                } else if (node instanceof Value) {
                    that._compositeStack.current.add(node);
                } else {
                    node.accept(that);
                }
            }
        }
        this._tableFragmentCreator = new TableFragmentCreator(
            this.sqlClient,
            (realTable, columnName) => this._createColumn(realTable, columnName),
            () => this._cloneVisitor()
        );
        // No disposing to record the root result
        this._compositeStack.with(new Composite());
    }

    private _cloneVisitor() {
        return new FragmentGenGenVisitor(
            this.sqlClient,
            this._baseQueryMetadata,
            this._tableMap
        );
    }

    visitAtomQuery(query: spi.AtomQueryContract): void {
        if (query.level === "SUB" && this._compositeStack.currentOrUndefined?.kind !== "SUB_QUERY") {
            using _ = this._compositeStack.with(new Scope("SUB_QUERY"));
            this._visitAtomQuery(query);
        } else {
            this._visitAtomQuery(query);
        }
    }
    
    private _visitAtomQuery(query: spi.AtomQueryContract): void {

        using _ = this._precedenceStack.with(Precedence.ROOT);
        using __ = this._compositeStack.with(new Query());
        
        {
            this._compositeStack.current.add("select ");
            if (query.isDistinct) {
                this._compositeStack.current.add("distinct ");
            }
            using _ = this._compositeStack.with(new Scope("COMMA"));
            if (query.options.countMode) {
                this._compositeStack.current.add("count(1)");
            } else {
                this._visitProjection(query.projection);
            }
        }

        {
            this._compositeStack.current.add("\nfrom ");
            let recursive: { prev: RealTable, pred: Composite } | undefined = undefined;
            if (query.recursivePred != null) {
                const visitor = this._cloneVisitor();
                query.recursivePred.accept(visitor);
                const prevComposite = new Scope("INDENT");
                prevComposite.add(visitor.toResult());
                recursive = { prev: this._baseQueryMetadata!.realTable, pred: prevComposite };
            }
            const tables = query.tables.map(t => 
                this._toRealTable(
                    t as spi.AbstractEntityTable | spi.TypedBaseTable
                )
            );
            this._fillTableFragments(tables);
            using _ = this._compositeStack.with(new Source(tables, recursive));
        }

        let wherePred = query.wherePred;
        for (const table of query.tables) {
            const entity = table.__entity;
            if (entity != null) {
                const filters = this.sqlClient.getFilters(entity);
                if (filters.length !== 0) {
                    for (const filter of filters) {
                        const pred = filter(table as any as EntityTable<AnyModel>);
                        if (pred != null) {
                            wherePred = dsl.and(wherePred as Predicate | undefined, pred) as 
                                spi.AbstractPred;
                        }
                    }
                }
                wherePred = dsl.and(
                    wherePred as Predicate | undefined, 
                    (table as spi.AbstractEntityTable).__typePredicate
                ) as spi.AbstractPred;
            }
        }
        if (wherePred != null) {
            this._compositeStack.current.add("\nwhere ");
            using _ = this._compositeStack.with(new Scope("INDENT"));
            wherePred?.accept(this);
        }

        const orders = query.orders;
        if (orders.length !== 0 && !query.options.countMode) {
            this._compositeStack.current.add("\norder by ");
            using _ = this._compositeStack.with(new Scope("COMMA"));
            const current = this._compositeStack.current;
            for (const order of query.orders) {
                current.separator();
                (order.expression as spi.AbstractExpr<any>).accept(this);
                current.add(order.desc ? " desc" : " asc");
                if (order.nullsType !== "UNSPECIFIED") {
                    current.add(`nulls ${order.nullsType.toLowerCase()}`);
                }
            }
        }

        const groupByExprs = query.groupByExprs;
        if (groupByExprs != null) {
            this._compositeStack.current.add("\ngroup by ");
            using _ = this._compositeStack.with(new Scope("COMMA"));
            for (const expr of groupByExprs) {
                this._compositeStack.current.separator();
                expr.accept(this);
            }
        }

        const havingPred = query.havingPred;
        if (havingPred != null) {
            this._compositeStack.current.add("\nhaving ");
            using _ = this._compositeStack.with(new Scope("INDENT"));
            havingPred.accept(this);
        }
    }

    visitMergedQuery(query: spi.MergedQueryContract): void {
        if (query.level === "SUB") {
            using _ = this._compositeStack.with(new Scope("SUB_QUERY"));
            this._visitMergedQuery(query);
        } else {
            this._visitMergedQuery(query);
        }
    }

    private _visitMergedQuery(query: spi.MergedQueryContract): void {
        using _ = this._compositeStack.with(new Scope(query.kind));
        for (const qry of query.queries) {
            this._compositeStack.current.separator();
            qry.accept(this);
        }
    }

    visitTuple(tuple: spi.TupleContract): void {
        this._visitTuple(tuple, []);
    }

    private _visitTuple(
        tuple: spi.TupleContract, 
        providers: ReadonlyArray<ScalarProvider<any, any> | undefined>
    ): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        using __ = this._compositeStack.with(new Scope("VALUES", false));
        const span = tuple.exprs.length;
        for (let i = 0; i < span; i++) {
            const expr = tuple.exprs[i]!;
            this._compositeStack.current.separator();
            if (providers[i] != null && expr.isValueExpr) {
                this._compositeStack.current.add(valueOf(expr, providers[i]!));
            } else {
                expr.accept(this);
            }
        }
    }

    visitTupleCmpPred(pred: spi.TupleCmpPred): void {
        const span = pred.leftTuple.exprs.length;
        const providers: Array<ScalarProvider<any, any> | undefined> = [];
        for (let i = 0; i < span; i++) {
            providers[i] = 
                pred.leftTuple.exprs[i]!.scalarProvider 
                ?? pred.rightTuple.exprs[i]!.scalarProvider;
        }
        using _ = this._precedenceStack.with(Precedence.COMPARISON);
        this._visitTuple(pred.leftTuple, providers);
        this._compositeStack.current.add(" ").add(pred.op).add(" ");
        this._visitTuple(pred.rightTuple, providers);
    }

    visitTupleInCollectionPred(pred: spi.TupleInCollectionPred): void {
        this._nodeRender.renderTupleInCollectionPred(pred, this._nodeRenderContext);
    }

    visitTupleInSubQueryPred(pred: spi.TupleInSubQueryPred): void {
        
        using _ = this._precedenceStack.with(Precedence.COMPARISON);

        pred.tuple.accept(this);
        this._compositeStack.current.add(pred.neg ? " not in" : " in");

        using __ = this._precedenceStack.with(Precedence.ROOT);
        
        pred.subQuery.accept(this);
    }

    visitConstantPred(pred: spi.ConstantPred): void {
        this._compositeStack.current.add(pred.value ? "1 = 1" : "1 = 0");
    }

    visitCmpPred(pred: spi.CmpPred): void {
        using _ = this._precedenceStack.with(Precedence.COMPARISON);
        if (pred.leftExpr.scalarProvider != null && pred.rightExpr.isValueExpr) {
            const provider = pred.leftExpr.scalarProvider;
            if (provider != null) {
                pred.leftExpr.accept(this);
                this._compositeStack.current.add(" ").add(pred.op).add(" ");
                this._compositeStack.current.add(valueOf(pred.rightExpr, provider));
                return;
            }
        }
        if (pred.leftExpr.isValueExpr && pred.rightExpr.scalarProvider != null) {
            const provider = pred.rightExpr.scalarProvider;
            if (provider != null) {
                this._compositeStack.current.add(valueOf(pred.leftExpr, provider));
                this._compositeStack.current.add(" ").add(pred.op).add(" ");
                pred.rightExpr.accept(this);
                return;
            }
        }
        pred.leftExpr.accept(this);
        this._compositeStack.current.add(" ").add(pred.op).add(" ");
        pred.rightExpr.accept(this);
    }

    visitInCollectionPred(pred: spi.InCollectionPred<any>): void {
        this._nodeRender.renderInCollectinPred(pred, this._nodeRenderContext);
    }

    visitInSubQueryPred(pred: spi.InSubQueryPred): void {
        using _ = this._precedenceStack.with(Precedence.COMPARISON);
        pred.expr.accept(this);
        this._compositeStack.current.add(pred.neg ? " not in" : " in");
        using __ = this._precedenceStack.with(Precedence.ROOT);
        pred.subQuery.accept(this);
    }

    visitBetweenPred(pred: spi.BetweenPred): void {
        using _ = this._precedenceStack.with(Precedence.COMPARISON);
        pred.expr.accept(this);
        this._compositeStack.current.add(" between ");
        pred.minExpr.accept(this);
        this._compositeStack.current.add(" and ");
        pred.maxExpr.accept(this);
    }

    visitLikePred(pred: spi.LikePred): void {
        this._nodeRender.renderLikePred(pred, this._nodeRenderContext);
    }

    visitNullityPred(pred: spi.NullityPred): void {
        using _ = this._precedenceStack.with(Precedence.UNARY);
        pred.expr.accept(this);
        if (pred.neg) {
            this._compositeStack.current.add(" is not null");
        } else {
            this._compositeStack.current.add(" is null");
        }
    }

    visitCompoundPred(pred: spi.CompoundPred): void {
        using _ = this._precedenceStack.with(pred.op === "AND" ? Precedence.AND : Precedence.OR);
        using __ = this._compositeStack.with(new Scope(pred.op));
        const current = this._compositeStack.current;
        for (const p of pred.preds) {
            current.separator();
            p.accept(this);
        }
    }

    visitExistsPred(pred: spi.ExistsPred): void {
        using _ = this._precedenceStack.with(Precedence.UNARY);
        this._compositeStack.current.add(pred.neg ? "not exists" : "exists")
        pred.subQuery.accept(this);
    }

    visitEsOpPred(pred: spi.EsOpPred): void {
        this._nodeRender.renderEsOpPred(pred, this._nodeRenderContext);
    }

    visitFetchedView(fetchedView: spi.FetchedViewContract): void {
        let table = fetchedView.table;
        const joinFetchVisitor = new LambdaJoinFetchVisitor(this.sqlClient, {
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
            visitField: field => {
                if (field.columnIndex == null) {
                    return;
                }
                this._compositeStack.current.separator();
                const prop = field.prop;
                const realTable = this._toRealTable(table.__to(prop.declaringEntity));
                const sqlFormulaExpr = realTable.sqlFormulaExpr(prop);
                if (sqlFormulaExpr != null) {
                    sqlFormulaExpr.accept(this);
                    this._compositeStack.current.add(new RootColumnSuffix());
                    return;
                }
                if (prop instanceof spi.TypeNameProp) {
                    const columnName = table.__entity.tableSettings.discriminator!.name;
                    this._compositeStack.current.add(this._createColumn(realTable, columnName));
                    this._compositeStack.current.add(new RootColumnSuffix());
                    return;
                }
                if (prop.isEntityProp) {
                    const entityProp = prop as spi.EntityProp;
                    const column = entityProp.toStorage(this._strategy) as spi.Column;
                    this._compositeStack.current.add(this._createColumn(realTable, column.name));
                    this._compositeStack.current.add(new RootColumnSuffix());
                }
            }
        });
        joinFetchVisitor.visit(fetchedView.view.mapper);
    }

    visitPropExpr(expr: spi.PropExprContract): void {
        let table: spi.AbstractTable = expr.table;
        let prop = expr.prop;
        let column: spi.Column;
        if (this.sqlClient.isDirectAssociatedKey(expr)) {
            table = table.__joinOperation!.parent;
            column = expr.table.__joinOperation!
                .joinProp!.sub(prop.subPath)
                .toStorage(this._strategy) as spi.Column;
        } else {
            if (!prop.isMiddleTableProp) {
                table = (table as spi.AbstractEntityTable).__to(
                    (prop as spi.EntityProp).declaringEntity
                );
            }
            column = prop.toStorage(this._strategy) as spi.Column;
        }
        const realTable = this._toRealTable(table);
        this._compositeStack.current.add(this._createColumn(realTable, column.name));
    }

    visitIsPred(pred: spi.IsPred): void {
        using _ = this._precedenceStack.with(Precedence.COMPARISON);
        const realTable = this._toRealTable(pred.table);
        addTypeMatch(
            realTable, 
            pred.currentEntity,
            pred.derivedEntity, 
            (realTable, columnName) => this._createColumn(realTable, columnName), 
            pred.neg, 
            this._compositeStack.current
        );
    }

    visitCoalesceExpr(expr: spi.CoalesceExprContract): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        this._compositeStack.current.add("coalesce")
        using __ = this._compositeStack.with(new Scope("VALUES"));
        expr.expr.accept(this);
        for (const defaultExpr of expr.defaultExprs) {
            this._compositeStack.current.separator();
            defaultExpr.accept(this);
        }
    }

    visitNativeExpr(expr: spi.NativeExprContract): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        const current = this._compositeStack.current;
        for (const part of expr.parts) {
            if (Array.isArray(part)) {
                using __ = this._compositeStack.with(new Scope("COMMA", false));
                const current = this._compositeStack.current;
                for (const e of part) {
                    current.separator();
                    if (e instanceof ExpressionOrder) {
                        (e.expression as spi.AbstractExpr<any>).accept(this);
                        current.add(e.desc ? " desc" : " asc");
                        if (e.nullsType !== "UNSPECIFIED") {
                            current.add(`nulls ${e.nullsType.toLowerCase()}`);
                        }
                    } else {
                        (e as spi.AbstractExpr<any>).accept(this);
                    }
                }
            } else if (typeof part === "string") {
                current.add(part);
            } else {
                (part as spi.AbstractExpr<any>).accept(this);
            }
        }
    }

    visitSubQueryExpr(expr: spi.SubQueryExprContract): void {
        this._compositeStack.current.add(expr.op.toLowerCase());
        expr.subQuery.accept(this);
    }

    visitShadowExpr(expr: spi.ShadowExprContract): void {
        const shadow = expr.shadow;
        if (shadow != null) {
            const realTable = this._toRealTable(shadow);
            this._compositeStack.current.add(new ShadowExpr(realTable, expr.anchor.exportedName));
        } else {
            (expr.anchor.original as any as spi.Node).accept(this);
        }
    }

    visitLowerExpr(expr: spi.LowerExpr): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        const current = this._compositeStack.current;
        current.add("lower(");
        expr.expr.accept(this);
        current.add(")");
    }

    visitUpperExpr(expr: spi.UpperExpr): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        const current = this._compositeStack.current;
        current.add("upper(");
        expr.expr.accept(this);
        current.add(")");
    }

    visitReverseExpr(expr: spi.ReverseExpr): void {
        this._nodeRender.renderReverseExpr(expr, this._nodeRenderContext);
    }

    visitTrimExpr(expr: spi.TrimExpr): void {
        this._nodeRender.renderTrimExpr(expr, this._nodeRenderContext);
    }

    visitLengthExpr(expr: spi.LengthExpr): void {
        this._nodeRender.renderLengthExpr(expr, this._nodeRenderContext);
    }

    visitReplaceExpr(expr: spi.ReplaceExpr): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        const current = this._compositeStack.current;
        current.add("replace(");
        expr.expr.accept(this);
        current.add(", ");
        expr.oldStrExpr.accept(this);
        current.add(", ");
        expr.newStrExpr.accept(this);
        current.add(")");
    }

    visitPadExpr(expr: spi.PadExpr): void {
        this._nodeRender.renderPadExpr(expr, this._nodeRenderContext);
    }

    visitLeftExpr(expr: spi.LeftExpr): void {
        this._nodeRender.renderLeftExpr(expr, this._nodeRenderContext);
    }

    visitRightExpr(expr: spi.RightExpr): void {
        this._nodeRender.renderRightExpr(expr, this._nodeRenderContext);
    }

    visitPositionExpr(expr: spi.PositionExpr): void {
        this._nodeRender.renderPositionExpr(expr, this._nodeRenderContext);
    }

    visitSubstringExpr(expr: spi.SubstringExpr): void {
        this._nodeRender.renderSubstringExpr(expr, this._nodeRenderContext);
    }

    visitConcatExpr(expr: spi.ConcatExpr): void {
        for (const valueExpr of expr.valueExprs) {
            valueExpr.accept(this);
        }
    }

    visitUnaryMinusExpr(expr: spi.UnaryMinusExpr<any>): void {
        using _ = this._precedenceStack.with(Precedence.UNARY);
        this._compositeStack.current.add("-");
        expr.expr.accept(this);
    }

    visitBinaryNumExpr(expr: spi.BinaryNumExpr<any>): void {
        using _ = this._precedenceStack.with(
            expr.op === "+" || expr.op === "-"
                ? Precedence.PLUS
                : Precedence.TIMES
        );
        expr.leftExpr.accept(this);
        this._compositeStack.current.add(" ").add(expr.op).add(" ");
        expr.rightExpr.accept(this);
    }

    visitAggregateExpr(expr: spi.AggregateExpr<any>): void {
        using _ = this._precedenceStack.with(Precedence.ROOT);
        const current = this._compositeStack.current;
        current.add(expr.op.toLowerCase());
        current.add("(");
        if (expr.expr == null) {
            current.add("1");
        } else {
            expr.expr.accept(this);
        }
        current.add(")");
    }

    visitDtPlusExpr(expr: spi.DtPlusExpr): void {
        this._nodeRender.renderDtPlusExpr(expr, this._nodeRenderContext);
    }

    visitDtDiffExpr(expr: spi.DtDiffExpr): void {
        expr.expr.accept(this);
        expr.valueExpr.accept(this);
    }

    visitLiteral(value: any): void {
        this._compositeStack.current.add(new Value(value));
    }

    visitConstant(value: number): void {
        this._compositeStack.current.add(value.toString());
    }

    private _visitProjection(projection: spi.ProjectionContract): void {
        switch (projection.kind) {
            case "ROOT_SINGLE":
                this._visitRootSelection(projection.selection);
                break;
            case "ROOT_ARRAY":
                for (const selection of projection.selections) {
                    this._compositeStack.current.separator();
                    this._visitRootSelection(selection);
                }
                break;
            case "ROOT_MAP":
                for (const key in projection.selections) {
                    this._compositeStack.current.separator();
                    this._visitRootSelection(projection.selections[key]!);
                }
                break;
            case "SUB_SINGLE":
                (projection.selection as any as spi.Node).accept(this);
                break;
            case "SUB_ARRAY":
                for (const selection of projection.selections) {
                    this._compositeStack.current.separator();
                    (selection as any as spi.Node).accept(this);
                }
                break;
            case "BASE":
                for (const selection of this._baseQueryMetadata!.selections) {
                    this._compositeStack.current.separator();
                    if (selection.columnName == null) {
                        const expr = projection.args[selection.exportedName] as any as spi.ShadowExprContract;
                        expr.accept(this);
                        if (!this._baseQueryMetadata!.isCte) {
                            this._compositeStack.current.add(" ").add(selection.alias);
                        }
                    } else {
                        const table = projection.args[selection.exportedName] as spi.AbstractEntityTable;
                        const realTable = this._toRealTable(table);
                        this._compositeStack.current.add(new TableAlias(realTable)).add(".").add(selection.columnName);
                        if (!this._baseQueryMetadata!.isCte) {
                            this._compositeStack.current.add(" ").add(selection.alias);
                        }
                    }
                }
                break;
        }
    }

    private _visitRootSelection(selection: RootQuerySelection<any>): void {
        (selection as any as spi.Node).accept(this);
        if (selection instanceof spi.AbstractExpr) {
            this._compositeStack.current.add(new RootColumnSuffix());
        }
    }

    private _toRealTable(
        table: spi.AbstractTable
    ): RealTable {
        if (table.__isPrev) {
            return this._baseQueryMetadata!.realTable;
        }
        return this._tableMap.get(table.__prototype) 
            ?? err.makeErr(`No mapped real table for ${
                table.__entity != null 
                    ? `entity table "${table.__entity.name}"`
                : table.__associationEntity != null
                    ? `association table ${table.__associationEntity.toString()}`
                : `base table`
            }`);
    }

    private _createColumn(
        realTable: RealTable, 
        columnName: string
    ): Column {
        const shadow = realTable.shadow;
        if (shadow != null) {
            const exportedName = realTable.symbol.__anchor!.exportedName;
            if (shadow.symbol.__isPrev) {
                return new Column(this._baseQueryMetadata!.realTable, exportedName, columnName);
            }
            return new Column(shadow, exportedName, columnName);
        }
        return new Column(realTable, undefined, columnName);
    }

    toResult(): Composite {
        if (this._precedenceStack.size() !== 0) {
            throw new err.StateError("precedenceStack is not cleanup");
        }
        if (this._compositeStack.size() != 1) {
            throw new err.StateError("compositeStack is not cleanup");
        }
        return this._compositeStack.current as Composite;
    }

    private _fillTableFragments(tables: ReadonlyArray<RealTable>) {
        for (const table of tables) {
            if (table.symbol.__isCte) {
                table.cteDefinitionFragment = this._tableFragmentCreator.createDefinition(table);
            }
            table.fragment = this._tableFragmentCreator.createUsage(table);
            this._fillTableFragments(table.children);
        }
    }
}

