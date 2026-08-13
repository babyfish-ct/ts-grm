import { AnyModel, dsl, EntityTable, Predicate, spi } from "@ts-grm/core";
import { TableAlias, Column, Composite, Scope } from "./fragment";
import { RealTable } from "./real_table";
import { FragmentGenGenVisitor } from "./fragment_gen_visitor";
import { SqlClientImplementor } from "@/sql_client";
import { addTypeMatch } from "./utils";

export class TableFragmentCreator {

    private readonly _strategy: spi.DatabaseStrategy;

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _createColumn: (realTable: RealTable, columnName: string) => Column,
        private readonly _cloneVisitor: () => FragmentGenGenVisitor
    ) {
        this._strategy = _sqlClient.strategy;
    }

    createDefinition(table: RealTable) {
        const composite = Composite.of(
            table.symbol.__baseModel!.__toQuery(), 
            this._sqlClient,
            table.baseQueryMetadata
        );
        const wrapper = new Scope("VALUES");
        wrapper.add(composite);
        return wrapper;
    }

    createUsage(
        table: RealTable
    ): Composite {
        const composite = new Composite();
        if (table.parent == null) {
            this._addTable(table, composite);
        } else if (table.joinProp != null) {
            this._addJoinByForeignKey(table, composite);
        } else if (table.castToEntity != null) {
            this._addJoinByInheritance(table, composite);
        } else {
            composite
                .add("\n")
                .add(table.joinType!.toLowerCase())
                .add(" join ");
            this._addTable(table, composite);
            composite.add(" on ");
            const scope = new Scope("AND");
            this._addFilters(table, scope);
            composite.add(scope);
        }
        return composite;
    }

    private _addTable(
        table: RealTable,
        composite: Composite
    ) {
        if (table.symbol.__entity != null) {
            composite
                .add(table.symbol.__entity.toTableName(this._strategy))
                .add(" ")
                .add(new TableAlias(table));
        } else if (table.symbol.__associationEntity != null) {
            composite
                .add(table.symbol.__associationEntity.toTableName(this._strategy))
                .add(" ")
                .add(new TableAlias(table));
        } else {
            const baseTable = table.symbol as spi.TypedBaseTable;
            if (baseTable.__isCte) {
                composite.add(new TableAlias(table));
            } else {
                composite.add(this.createDefinition(table));
                composite.add(" ").add(new TableAlias(table))
            }
        }
    }

    private _addJoinByForeignKey(
        table: RealTable,
        composite: Composite
    ) {
        composite
            .add("\n")
            .add(table.joinType!.toLowerCase())
            .add(" join ");
        this._addTable(table, composite);
        composite.add(" on ");
        const storage = table.joinProp!.toStorage(this._strategy) as spi.PropStorage;
        const conditionScope = new Scope("AND");
        if (storage.kind === "COLUMN") {
            conditionScope
                .separator()
                .add(
                    this._createColumn(
                        table.parent!, 
                        table.isJoinPropInverse ? storage.referencedColumnName! : storage.name
                    )
                )
                .add(" = ")
                .add(new TableAlias(table))
                .add(".")
                .add(table.isJoinPropInverse ? storage.name : storage.referencedColumnName!);
        } else if (storage.kind === "COLUMNS") {
            for (const column of storage) {
                conditionScope
                    .separator()
                    .add(
                        this._createColumn(
                            table.parent!, 
                            table.isJoinPropInverse ? column.referencedColumnName! : column.name
                        )
                    )
                    .add(" = ")
                    .add(new TableAlias(table))
                    .add(".")
                    .add(table.isJoinPropInverse ? column.name : column.referencedColumnName!);
            }
        }
        this._addFilters(table, conditionScope);
        composite.add(conditionScope);
    }

    private _addJoinByInheritance(
        table: RealTable,
        composite: Composite
    ) {
        composite
            .add("\n")
            .add(table.joinType!.toLowerCase())
            .add(" join ");
        this._addTable(table, composite);
        composite.add(" on ");
        const conditionScope = new Scope("AND");
        if (table.symbol.__entity!.ancestors.has(table.parent!.symbol.__entity!)) {
            addTypeMatch(table.parent!, undefined, table.symbol.__entity!, this._createColumn, false, conditionScope);
        }
        const parentStorage = table.parent!.symbol.__entity!.idProp.toStorage(this._strategy)!;
        const storage = table.symbol.__entity!.idProp.toStorage(this._strategy)!;
        switch (parentStorage.kind) {
            case "COLUMN":
                conditionScope
                    .separator()
                    .add(
                        this._createColumn(table.parent!, parentStorage.name)
                    )
                    .add(" = ")
                    .add(
                        this._createColumn(table!, (storage as spi.Column).name)
                    );
                break;
            case "COLUMNS":
                for (let i = 0; i < parentStorage.length; i++) {
                    conditionScope
                        .separator()
                        .add(
                            this._createColumn(table.parent!, parentStorage[i]!.name)
                        )
                        .add(" = ")
                        .add(
                            this._createColumn(table!, (storage as spi.Columns)[i]!.name)
                        );
                }
                break;
        }
        composite.add(conditionScope);
        this._addFilters(table, conditionScope);
    }

    private _addFilters(table: RealTable, scope: Scope) {
        this._addJoinFilters(table, scope);
        this._addGlobalFilters(table, scope);
    }

    private _addJoinFilters(table: RealTable, scope: Scope) {
        const pred = table.filterPred;
        if (pred != null) {
            this._addFilterPredicate(pred, scope);
        }
    }

    private _addGlobalFilters(table: RealTable, scope: Scope) {
        const entity = table.symbol.__entity;
        if (entity == null) {
            return;
        }
        const filters = this._sqlClient.getFilters(entity);
        if (filters.length === 0) {
            return;
        }
        let predicate: Predicate | undefined = undefined;
        for (const filter of filters) {
            const prd = filter(table.symbol as any as EntityTable<AnyModel>);
            if (prd != null) {
                predicate = dsl.and(predicate, prd);
            }
        }
        if (predicate != null) {
            this._addFilterPredicate(predicate as spi.AbstractPred, scope);
        }
    }

    private _addFilterPredicate(pred: spi.AbstractPred, scope: Scope) {
        scope.separator();
        const visitor = this._cloneVisitor();
        pred.accept(visitor);
        const composite = visitor.toResult();
        if (composite.fragments!.length === 1) {
            const result = composite.fragments![0]!;
            if (result instanceof Scope && result.kind === scope.kind) {
                for (const fragment of result.fragments!) {
                    if (typeof fragment === "string") {
                        scope.add(fragment);
                    } else {
                        scope.add(fragment);
                    }
                }
                return;
            }
        }
        scope.add(composite);
    }
}