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

import { Driver } from "@/driver/deriver";
import { CascadeType, err, ScalarType, spi } from "@ts-grm/core";

export interface TableDef {

    readonly entity: spi.Entity | undefined;

    readonly prop: spi.EntityProp | undefined;

    readonly name: string;

    readonly columns: ReadonlyArray<ColumnDef>;
    
    readonly constraints: ReadonlyArray<ConstraintDef>;

    toCreationStatements(
        driver: Driver
    ): ReadonlyArray<string>;

    toDeletionStatements(
        driver: Driver
    ): ReadonlyArray<string>;
}

export interface ColumnDef {

    readonly declaringTable: TableDef;

    readonly prop: spi.EntityProp | undefined;
    
    readonly name: string;

    readonly type: ScalarType<any>;

    readonly nullable: boolean;

    readonly length: number | undefined;

    readonly precision: number | undefined;

    readonly scale: number | undefined;

    readonly when: ReadonlyArray<spi.Entity> | undefined;
}

export type ConstraintDef = SimpleContraintDef | ForeignKeyConstraintDef;

export type SimpleContraintDef = {
    readonly kind: "PRIMARY_KEY" | "INDEX";
    readonly columns: ReadonlyArray<ColumnDef>;
    readonly implicit: "MIDDLE_TABLE" | undefined;
} | {
    readonly kind: "UNIQUE";
    readonly columns: ReadonlyArray<ColumnDef>;
    readonly implicit: "ASSOCIATION" | "MIDDLE_ENTITY" | undefined;
} | {
    readonly kind: "CHECK";
    readonly column: ColumnDef;
    readonly values: ReadonlyArray<string | number>;
    readonly implicit: "POLYMORPHISM" | undefined;
};

export type ForeignKeyConstraintDef = {
    readonly kind: "FOREIGN_KEY";
    readonly columns: ReadonlyArray<ColumnDef>;
    readonly referencedColumns: ReadonlyArray<ColumnDef>;
    readonly cascade: CascadeType;
    readonly implicit: "INHERITANCE" | undefined;
};

export class TableDefImpl implements TableDef {

    readonly entity: spi.Entity | undefined;

    readonly prop: spi.EntityProp | undefined;

    private readonly _columnMap = new Map<string, ColumnDefImpl>();

    private _columns: Array<ColumnDefImpl> | undefined = undefined;

    private readonly _simpleConstraints: Array<SimpleContraintDef> = [];

    private readonly _foreignKeyConstraints: Array<ForeignKeyConstraintDef> = [];

    private _constraints: ReadonlyArray<ConstraintDef> | undefined = undefined; 

    constructor(
        data: spi.Entity | spi.EntityProp,
        readonly name: string
    ) {
        this.entity = data instanceof spi.Entity ? data : undefined;
        this.prop = this.entity == null ? data as spi.EntityProp : undefined;
    }

    get columns(): ReadonlyArray<ColumnDefImpl> {
        let columns = this._columns;
        if (columns == null) {
            this._columns = columns = Array.from(this._columnMap.values());
        }
        return columns;
    }

    get constraints(): ReadonlyArray<ConstraintDef> {
        let constraints = this._constraints;
        if (constraints == null) {
            const arr: Array<ConstraintDef> = [];
            arr.push(...this._simpleConstraints);
            arr.push(...this._foreignKeyConstraints);
            this._constraints = constraints = arr;
        }
        return constraints;
    }

    addColumnDef(column: ColumnDefImpl) {
        this._columnMap.set(column.name, column);
        this._columns = undefined;
    }

    addConstriantDef(constraint: ConstraintDef) {
        this._constraints = undefined;
        if (constraint.kind === "FOREIGN_KEY") {
            this._foreignKeyConstraints.push(constraint);
        } else {
            this._simpleConstraints.push(constraint);
        }
    }

    referencedColumnDef(name: string): ColumnDefImpl {
        const columnDef = this._columnMap.get(name);
        if (columnDef == null) {
            throw new err.StateError(`There is no referenced column name "${name}" in referenced table "${this.name}"`);
        }
        return columnDef;
    }

    findColumnDefByProp(prop: spi.EntityProp): ColumnDefImpl {
        for (const columnDef of this._columnMap.values()) {
            if (columnDef.prop === prop) {
                return columnDef;
            }
        }
        throw new err.StateError(`There is no property "${prop.toString()}" in the table "${this.name}"`);
    }

    toCreationStatements(
        driver: Driver
    ): ReadonlyArray<string> {
        const arr: Array<string> = [];
        const inline = driver.requiresInlineConstraints;
        const writer = new spi.CodeWriter();
        if (this.entity != null) {
            writer
            .code("-- Entity table for \"")
            .code(this.entity.name)
            .code("\"")
            .newLine();
        }
        if (this.prop != null) {
            writer
            .code("-- Middle table for \"")
            .code(this.prop.toString())
            .code("\"")
            .newLine();
        }
        writer.code("create table ").code(this.name).scope({kind: "PARENTHESES", multiline: true}, () => {
            for (const columnDef of this.columns) {
                appendTo(columnDef, driver, writer);
            }
            if (inline) {
                let index = 0;
                for (const constraint of this._simpleConstraints) {
                    writer.separator().newLine();
                    writer.code(constraintCreationSql(constraint, ++index, this, true));
                }
                for (const constraint of this._foreignKeyConstraints) {
                    writer.separator().newLine();
                    writer.code(constraintCreationSql(constraint, ++index, this, true));
                }
            }
        });
        arr.push(writer.toString());
        if (!inline) {
            let index = 0;
            for (const constraint of this._simpleConstraints) {
                arr.push(constraintCreationSql(constraint, ++index, this, false));
            }
            for (const constraint of this._foreignKeyConstraints) {
                arr.push(constraintCreationSql(constraint, ++index, this, false));
            }
        }
        return arr;
    }

    toDeletionStatements(
        driver: Driver
    ): ReadonlyArray<string> {
        const arr: Array<string> = [];
        const writer = new spi.CodeWriter();
        if (this.entity != null) {
            writer
            .code("-- Entity table for \"")
            .code(this.entity.name)
            .code("\"")
            .newLine();
        }
        if (this.prop != null) {
            writer
            .code("-- Middle table for \"")
            .code(this.prop.toString())
            .code("\"")
            .newLine();
        }
        driver.writeTableDeletion(this.name, writer);
        arr.push(writer.toString());
        return arr;
    }

    toJSON(): any {
        return {
            name: this.name,
            columns: this.columns.map(c => c.toJSON()),
            constraints: this.constraints.map(
                c => c.kind === "FOREIGN_KEY"
                    ? { 
                        kind: c.kind, 
                        columns: c.columns.map(c => c.name),
                        referencedColumns: c.referencedColumns.map(c => c.name),
                        cascade: c.cascade,
                        implicit: c.implicit
                    }
                    : c.kind === "CHECK"
                        ? {
                            kind: c.kind,
                            column: c.column.name,
                            values: c.values,
                            implicit: c.implicit
                        }
                        : { 
                            kind: c.kind, 
                            columns: c.columns.map(c => c.name),
                            implicit: c.implicit
                        }
            )
        };
    }
}

export class ColumnDefImpl implements ColumnDef {

    constructor(
        readonly declaringTable: TableDefImpl,
        readonly prop: spi.EntityProp | undefined,
        readonly name: string,
        readonly referenceColumnDef: ColumnDefImpl | undefined,
        readonly type: ScalarType<any>,
        readonly nullable: boolean,
        readonly when: ReadonlyArray<spi.Entity> | undefined
    ) {}

    get length(): number | undefined {
        return this.type.length;
    }

    get precision(): number | undefined {
        return this.type.precision;
    }

    get scale(): number | undefined {
        return this.type.scale;
    }

    toJSON(): any {
        return {
            name: this.name,
            referenceName: this.referenceColumnDef?.name,
            type: this.type.kind,
            nullable: this.nullable,
            length: this.type.length,
            when: this.when?.map(e => e.tableSettings.discriminatorValue!)
        };
    }
}

function appendTo(
    columnDef: ColumnDef, 
    driver: Driver,
    writer: spi.CodeWriter
) {
    writer.separator();
    if (columnDef.when != null) {
        const entity = columnDef.declaringTable.entity!;
        const prop = columnDef.prop!;
        const derivedEntity = prop.declaringEntity;
        writer.code(`\n-- When the "${
            entity.tableSettings.discriminator!.name
        }" is "${
            derivedEntity.tableSettings.discriminatorValue
        }"`);
        if (!prop.nullable || prop.inputNonNull) {
            writer.code("\n-- The implicit nullity in the derived table is non-null\n")
        }
    }
    writer
        .code(columnDef.name)
        .code(" ")
        .code(driver.typeName(columnDef))
        .code(columnDef.nullable ? " null" : " not null");
}

function constraintCreationSql(
    constraint: ConstraintDef,
    order: number,
    declaringTable: TableDef,
    inline: boolean
): string {
    const writer = new spi.CodeWriter();
    switch (constraint.kind) {
        case "PRIMARY_KEY":
            if (constraint.implicit === "MIDDLE_TABLE") {
                writer.code("-- Implicit primary key constraint for middle table").newLine();
            }
            break;
        case "UNIQUE":
            if (constraint.implicit === "MIDDLE_ENTITY") {
                writer.code("-- Implicit unique constraint for middle table").newLine();
            }
            break;
        case "CHECK":
            if (constraint.implicit === "POLYMORPHISM") {
                writer.code("-- Implicit check constraint for polymorphism").newLine();
            }
            break;
        case "FOREIGN_KEY":
            if (constraint.implicit === "INHERITANCE") {
                writer.code("-- Implicit foreign key constraint for inheritance").newLine();
            }
            break;
    }
    if (inline) {
        writer.code("constraint ");
    } else {
        writer
            .code("alter table ")
            .code(declaringTable.name)
            .code("\n    add constraint ");
    }
    writer.code(`${unquoteIdentifier(declaringTable.name)}_constraint_${order}`);
    const indent = inline ? 1 : 2;
    switch (constraint.kind) {
        case "PRIMARY_KEY":
            writer.code(`${head(indent)}primary key`);
            writer.scope({kind: "PARENTHESES", multiline: false}, () => {
                for (const columnDef of constraint.columns) {
                    writer.separator().code(columnDef.name);
                }
            });
            break;
        case "UNIQUE":
            writer.code(`${head(indent)}unique`);
            writer.scope({kind: "PARENTHESES", multiline: false}, () => {
                for (const columnDef of constraint.columns) {
                    writer.separator().code(columnDef.name);
                }
            });
            break;
        case "CHECK":
            writer.code(`${head(indent)}check(`);
            writer.code(constraint.column.name).code(" in");
            writer.scope({kind: "PARENTHESES", multiline: false}, () => {
                for (const value of constraint.values) {
                    writer.separator();
                    if (typeof value === "number") {
                        writer.code(value.toString());
                    } else {
                        writer.code("'").code(value).code("'");
                    }
                }
            });
            writer.code(")");
            break;
        case "FOREIGN_KEY":
            writer.code(`${head(indent)}foreign key`);
            writer.scope({kind: "PARENTHESES", multiline: false}, () => {
                for (const columnDef of constraint.columns) {
                    writer.separator().code(columnDef.name);
                }
            });
            writer
            .code(`${head(indent + 1)}references `)
            .code(constraint.referencedColumns[0]!.declaringTable.name);
            writer.scope({kind: "PARENTHESES", multiline: false}, () => {
                for (const columnDef of constraint.referencedColumns) {
                    writer.separator().code(columnDef.name);
                }
            });
            switch (constraint.cascade) {
                case "DELETE":
                    writer.code(`${head(indent + 2)}on delete cascade`);
                    break;
                case "SET_NULL":
                    writer.code(`${head(indent + 2)}on delete set null`);
                    break;
            }
            break;
    }
    return writer.toString();
}

function head(indent: number): string {
    return "\n" + "    ".repeat(indent);
}

function unquoteIdentifier(value: string): string {
    if (value.startsWith("\"") && value.endsWith("\"")) {
        return value.substring(1, value.length - 1);
    }
    if (value.startsWith("`") && value.endsWith("`")) {
        return value.substring(1, value.length - 1);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
        return value.substring(1, value.length - 1);
    }
    return value;
}